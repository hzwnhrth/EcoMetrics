"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, StatusDot, ConfidenceBadge } from "@/components/status";
import type { Evidence, Indicator } from "@/lib/types";

const CONFIDENCES = { verified: "verified", estimated: "estimated", inferred: "inferred" };

// One clickable indicator line; the dialog is the provenance money-shot:
// every supporting evidence row with its source_file + source_ref. Managers
// can correct or delete a row in place (QA item 6) — rules recompute on the
// next read.
export function IndicatorRow({
  indicator,
  evidence,
  canManage,
  manageDenied,
}: {
  indicator: Indicator;
  evidence: Evidence[];
  canManage: boolean;
  manageDenied?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Evidence | null>(null);
  const [value, setValue] = useState("");
  const [confidence, setConfidence] = useState<string>("verified");
  const [busy, setBusy] = useState(false);

  function startEdit(e: Evidence) {
    setEditing(e);
    setValue(e.value);
    setConfidence(e.confidence);
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      const res = await fetch("/api/evidence", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, value, confidence }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success("Evidence updated — rules re-run on next view");
      setEditing(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(e: Evidence) {
    if (!window.confirm(`Delete evidence row ${e.field} (${e.source_ref})?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/evidence?id=${encodeURIComponent(e.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success("Evidence row deleted");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center gap-2">
          <StatusDot status={indicator.status} />
          <span className="flex-1 truncate text-sm font-medium">{indicator.label}</span>
          <span className="text-sm tabular-nums text-muted-foreground">
            {indicator.value} {indicator.unit !== "text" ? indicator.unit : ""}
          </span>
          <StatusBadge status={indicator.status} />
        </div>
        <p className="mt-1 pl-[18px] text-xs text-muted-foreground">{indicator.coverage_note}</p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StatusDot status={indicator.status} />
              {indicator.label}
            </DialogTitle>
            <DialogDescription>
              {evidence.length} supporting evidence row{evidence.length === 1 ? "" : "s"} —{" "}
              {indicator.coverage_note}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source file</TableHead>
                  <TableHead>Source ref</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="w-20 text-right" title={manageDenied}>
                    Edit
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidence.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="max-w-48 truncate text-xs text-muted-foreground">
                      {e.source_file}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{e.source_ref}</TableCell>
                    <TableCell className="text-xs">{e.field}</TableCell>
                    <TableCell className="max-w-56 text-xs">
                      {editing?.id === e.id ? (
                        <Input
                          value={value}
                          onChange={(ev) => setValue(ev.target.value)}
                          className="h-7 text-xs"
                        />
                      ) : e.value === "" ? (
                        <span className="italic text-muted-foreground">(blank)</span>
                      ) : (
                        <span className="block truncate" title={e.value}>{e.value}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing?.id === e.id ? (
                        <Select
                          value={confidence}
                          onValueChange={(v) => setConfidence(v as string)}
                          items={CONFIDENCES}
                        >
                          <SelectTrigger size="sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(CONFIDENCES).map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <ConfidenceBadge confidence={e.confidence} />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editing?.id === e.id ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={busy}>
                            ✕
                          </Button>
                          <Button size="sm" onClick={saveEdit} disabled={busy}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-0.5">
                          <span title={canManage ? "Edit this row" : manageDenied}>
                            <Button size="sm" variant="ghost" disabled={!canManage || busy} onClick={() => startEdit(e)}>
                              <Pencil className="size-3.5" />
                            </Button>
                          </span>
                          <span title={canManage ? "Delete this row" : manageDenied}>
                            <Button size="sm" variant="ghost" disabled={!canManage || busy} onClick={() => remove(e)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
