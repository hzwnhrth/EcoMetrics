import Link from "next/link";
import { getStore } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status";
import { ActionStatusSelect } from "@/components/action-status-select";
import type { Action } from "@/lib/types";

function dueState(a: Action, today: Date): { label: string; status: "green" | "amber" | "red" } | null {
  if (a.status === "done" || a.status === "resolved_verified") return null;
  // calendar-day distance, ignoring time of day
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const due = new Date(a.due_date + "T00:00:00");
  const days = Math.round((due.getTime() - start.getTime()) / 86400000);
  if (days < 0) return { label: "Overdue", status: "red" };
  if (days <= 3) return { label: "Due soon", status: "amber" };
  return { label: "On track", status: "green" };
}

export default async function ActionsPage() {
  const store = await getStore();
  const today = new Date();
  const actions = [...store.actions].sort((a, b) => a.due_date.localeCompare(b.due_date));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {actions.length} action{actions.length === 1 ? "" : "s"} — auto-resolved when a re-scanned
          file makes the finding disappear.
        </p>
      </div>

      {actions.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No actions yet — promote a finding from{" "}
          <Link href="/priorities" className="underline underline-offset-4">
            Priorities
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next step</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((a) => {
                const due = dueState(a, today);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="font-medium">{a.title}</div>
                      <div className="font-mono text-xs text-muted-foreground">{a.finding_rule_code}</div>
                    </TableCell>
                    <TableCell className="text-sm">{a.owner}</TableCell>
                    <TableCell className="max-w-56 text-sm text-muted-foreground">
                      {a.next_step || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm tabular-nums">{a.due_date}</div>
                      {due && <StatusBadge status={due.status} label={due.label} />}
                    </TableCell>
                    <TableCell>
                      {a.status === "resolved_verified" ? (
                        <StatusBadge status="green" label="verified by re-scan" />
                      ) : (
                        <ActionStatusSelect id={a.id} status={a.status} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
