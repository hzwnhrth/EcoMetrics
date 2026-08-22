"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { StatusBadge } from "@/components/status";
import { RuleCodeBadge } from "@/components/pillar-badge";
import { ActionStatusSelect, STATUS_LABELS } from "@/components/action-status-select";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Action, Pillar } from "@/lib/types";

function dueState(a: Action, todayIso: string): { label: string; status: "green" | "amber" | "red" } | null {
  if (a.status === "done" || a.status === "resolved_verified") return null;
  const days = Math.round(
    (new Date(a.due_date + "T00:00:00").getTime() - new Date(todayIso + "T00:00:00").getTime()) / 86400000
  );
  if (days < 0) return { label: "Overdue", status: "red" };
  if (days <= 3) return { label: "Due soon", status: "amber" };
  return { label: "On track", status: "green" };
}

function initials(owner: string): string {
  const name = owner.split("(")[0].trim();
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function OwnerCell({ owner }: { owner: string }) {
  const name = owner.split("(")[0].trim();
  const title = owner.match(/\((.*)\)/)?.[1];
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground">
        {initials(owner)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm">{name}</span>
        {title && <span className="block truncate text-xs text-muted-foreground">{title}</span>}
      </span>
    </div>
  );
}

function AuditDialog({ action }: { action: Action }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Status history — who changed what, when, manual vs system"
      >
        <History className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>History — {action.title}</DialogTitle>
            <DialogDescription>
              Every status change is recorded: who, when, manual vs system.
            </DialogDescription>
          </DialogHeader>
          <ol className="max-h-[50vh] space-y-2 overflow-y-auto text-sm">
            {[...action.audit].reverse().map((e, i) => (
              <li key={i} className="rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {e.from ? `${STATUS_LABELS[e.from] ?? e.from} → ` : "Created as "}
                    {STATUS_LABELS[e.to] ?? e.to}
                  </span>
                  <span
                    className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground"
                    title={e.via === "rescan" ? "changed automatically by re-scan" : `${e.via} change`}
                  >
                    {e.via}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {e.by} · {formatDateTime(e.at)}
                </p>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}

const CAP = 8;

export function ActionsTable({
  actions,
  todayIso,
  statusDenied,
  canDelete,
}: {
  actions: Action[];
  todayIso: string;
  statusDenied?: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [owner, setOwner] = useState("all");
  const [status, setStatus] = useState("all");
  const [pillar, setPillar] = useState("all");
  const [sort, setSort] = useState("due_asc");
  const [expanded, setExpanded] = useState(false);

  const owners = useMemo(() => [...new Set(actions.map((a) => a.owner))].sort(), [actions]);

  const filtered = useMemo(() => {
    let rows = actions.filter(
      (a) =>
        (owner === "all" || a.owner === owner) &&
        (status === "all" || a.status === status) &&
        (pillar === "all" || a.finding_rule_code.startsWith(pillar))
    );
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case "due_desc": return b.due_date.localeCompare(a.due_date);
        case "owner": return a.owner.localeCompare(b.owner);
        case "status": return a.status.localeCompare(b.status);
        default: return a.due_date.localeCompare(b.due_date);
      }
    });
    return rows;
  }, [actions, owner, status, pillar, sort]);

  const visible = expanded ? filtered : filtered.slice(0, CAP);

  async function remove(a: Action) {
    if (!window.confirm(`Delete action "${a.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/actions?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? `HTTP ${res.status}`);
      return;
    }
    toast.success("Action deleted");
    router.refresh();
  }

  const filterSelect = (
    value: string,
    onChange: (v: string) => void,
    items: Record<string, string>
  ) => (
    <Select value={value} onValueChange={(v) => onChange(v as string)} items={items}>
      <SelectTrigger size="sm" className="min-w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([v, l]) => (
          <SelectItem key={v} value={v}>{l}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Filter:</span>
        {filterSelect(owner, setOwner, { all: "All owners", ...Object.fromEntries(owners.map((o) => [o, o.split("(")[0].trim()])) })}
        {filterSelect(status, setStatus, { all: "All statuses", ...STATUS_LABELS })}
        {filterSelect(pillar, setPillar, { all: "All pillars", E: "E — Environmental", S: "S — Social", G: "G — Governance" })}
        <span className="ml-2 text-muted-foreground">Sort:</span>
        {filterSelect(sort, setSort, { due_asc: "Due date ↑", due_desc: "Due date ↓", owner: "Owner", status: "Status" })}
        <span className="ml-auto text-muted-foreground">
          {filtered.length} of {actions.length} action{actions.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Next step</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">More</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((a) => {
              const due = dueState(a, todayIso);
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="font-medium">{a.title}</div>
                    <RuleCodeBadge code={a.finding_rule_code} className="mt-1" />
                  </TableCell>
                  <TableCell><OwnerCell owner={a.owner} /></TableCell>
                  <TableCell className="max-w-56 text-sm text-muted-foreground">
                    {a.next_step || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm tabular-nums whitespace-nowrap">{formatDate(a.due_date)}</div>
                    {due && <StatusBadge status={due.status} label={due.label} />}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <ActionStatusSelect id={a.id} status={a.status} disabledReason={statusDenied} />
                      {a.resolved_by === "rescan" && a.status === "resolved_verified" && (
                        <StatusBadge status="green" label="verified by re-scan" />
                      )}
                      {a.status === "reopened" && (
                        <StatusBadge status="amber" label="needs re-verification" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-0.5">
                      <AuditDialog action={a} />
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(a)}
                          title="Delete this action"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > CAP && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? `Show top ${CAP} only` : `Show all ${filtered.length} actions`}
        </Button>
      )}
    </div>
  );
}
