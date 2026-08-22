"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const DOC_TYPES: Record<string, string> = {
  payroll: "Payroll (.xlsx)",
  bills: "Electricity bills (.pdf)",
  policy: "Policy (.docx)",
};

function guessDocType(name: string): string | null {
  if (name.endsWith(".xlsx")) return "payroll";
  if (name.endsWith(".pdf")) return "bills";
  if (name.endsWith(".docx")) return "policy";
  return null;
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<string>("payroll");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    setFile(f);
    if (f) setDocType(guessDocType(f.name) ?? docType);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("docType", docType);
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      for (const code of data.resolved as string[]) {
        toast.success(`${code} no longer detected — action resolved, verified by re-scan`, {
          duration: 8000,
        });
      }
      toast.info(
        `Re-scan complete: ${data.rows} evidence rows from ${data.source_file}` +
          (data.stillOpen.length ? ` · still open: ${data.stillOpen.join(", ")}` : ""),
        { duration: 8000 }
      );
      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error(`Ingest failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
          dragging ? "border-ring bg-muted" : "border-border hover:bg-muted/50"
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" />
        <p className="text-sm">
          {file ? (
            <span className="font-medium">{file.name}</span>
          ) : (
            <>Drop a corrected file here, or click to browse</>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Re-scan replaces this document&apos;s evidence and re-runs all 12 rules.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.pdf,.docx"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="flex items-center gap-3">
        <Select value={docType} onValueChange={(v) => setDocType(v as string)} items={DOC_TYPES}>
          <SelectTrigger className="min-w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DOC_TYPES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={upload} disabled={!file || busy}>
          {busy ? "Re-scanning…" : "Upload & re-scan"}
        </Button>
      </div>
    </div>
  );
}
