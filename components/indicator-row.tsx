"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// One clickable indicator line; the dialog is the provenance money-shot:
// every supporting evidence row with its source_file + source_ref.
export function IndicatorRow({
  indicator,
  evidence,
}: {
  indicator: Indicator;
  evidence: Evidence[];
}) {
  const [open, setOpen] = useState(false);

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
                    <TableCell className="max-w-56 truncate text-xs" title={e.value}>
                      {e.value === "" ? <span className="italic text-muted-foreground">(blank)</span> : e.value}
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge confidence={e.confidence} />
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
