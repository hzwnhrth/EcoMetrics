"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PILLARS = { E: "E — Environmental", S: "S — Social", G: "G — Governance" };
const CONFIDENCES = { verified: "verified", estimated: "estimated", inferred: "inferred" };

// Manual evidence row (QA item 6 — full CRUD). Manager+ only; the rules
// re-run over it like any extracted row.
export function AddEvidenceDialog({
  sourceFiles,
  disabledReason,
}: {
  sourceFiles: string[];
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    source_file: sourceFiles[0] ?? "",
    source_ref: "",
    pillar: "S",
    field: "",
    value: "",
    unit: "text",
    period: "",
    confidence: "inferred",
    note: "added manually in the app",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, period: form.period || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(`Evidence row added: ${form.field}`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "could not add evidence");
    } finally {
      setBusy(false);
    }
  }

  const field = "flex flex-col gap-1.5";
  const label = "text-xs font-medium text-muted-foreground";

  if (disabledReason) {
    return (
      <span title={disabledReason}>
        <Button variant="outline" size="sm" disabled>
          <Plus data-icon="inline-start" />
          Add evidence row
        </Button>
      </span>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        Add evidence row
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add evidence row</DialogTitle>
            <DialogDescription>
              A fact you cannot point back to is not evidence — source ref is required. Manually
              added rows default to “inferred”.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={field}>
              <label className={label}>Source file</label>
              <Input value={form.source_file} onChange={(e) => set("source_file", e.target.value)} list="ev-files" />
              <datalist id="ev-files">
                {sourceFiles.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div className={field}>
              <label className={label}>Source ref (e.g. “page 3”, “Sheet!B7”)</label>
              <Input value={form.source_ref} onChange={(e) => set("source_ref", e.target.value)} />
            </div>
            <div className={field}>
              <label className={label}>Pillar</label>
              <Select value={form.pillar} onValueChange={(v) => set("pillar", v as string)} items={PILLARS}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PILLARS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <label className={label}>Field (catalog name, e.g. “turnover”)</label>
              <Input value={form.field} onChange={(e) => set("field", e.target.value)} />
            </div>
            <div className={field}>
              <label className={label}>Value</label>
              <Input value={form.value} onChange={(e) => set("value", e.target.value)} />
            </div>
            <div className={field}>
              <label className={label}>Unit</label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} />
            </div>
            <div className={field}>
              <label className={label}>Period (YYYY-MM, optional)</label>
              <Input value={form.period} onChange={(e) => set("period", e.target.value)} placeholder="2025-12" />
            </div>
            <div className={field}>
              <label className={label}>Confidence</label>
              <Select value={form.confidence} onValueChange={(v) => set("confidence", v as string)} items={CONFIDENCES}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(CONFIDENCES).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={`${field} sm:col-span-2`}>
              <label className={label}>Note</label>
              <Input value={form.note} onChange={(e) => set("note", e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={busy || !form.source_file || !form.source_ref.trim() || !form.field.trim()}
            >
              {busy ? "Saving…" : "Add row"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
