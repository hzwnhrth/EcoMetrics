"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  reopened: "Open — needs re-verification",
  resolved_verified: "Resolved (verified)",
};

// Selecting "Open" on a done/resolved action re-opens it: the server records
// "reopened" (Open — needs re-verification) with an audit entry, and the next
// relevant upload re-evaluates it (QA item 13).
export function ActionStatusSelect({
  id,
  status,
  disabledReason,
}: {
  id: string;
  status: string;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function change(value: unknown) {
    const next = value as string;
    if (!next || next === status) return;
    setSaving(true);
    try {
      const res = await fetch("/api/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (data.status === "reopened") {
        toast.info("Re-opened — needs re-verification", {
          description:
            "Nothing is re-analysed on old files; the next relevant upload re-evaluates this action and may auto-close it again.",
          duration: 8000,
        });
      } else {
        toast.success(`Action marked ${STATUS_LABELS[data.status] ?? data.status}`);
      }
      router.refresh();
    } catch (err) {
      toast.error(`Could not update: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  // the three pickable targets, plus the current status so the value renders
  const options = ["open", "in_progress", "done"];
  const items = Object.fromEntries(
    [...new Set([status, ...options])].map((v) => [v, STATUS_LABELS[v] ?? v])
  );

  const select = (
    <Select
      value={status}
      onValueChange={change}
      disabled={saving || !!disabledReason}
      items={items}
    >
      <SelectTrigger size="sm" className="min-w-28 max-w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((value) => (
          <SelectItem key={value} value={value}>
            {status !== "open" && value === "open" && (status === "done" || status === "resolved_verified")
              ? "Re-open (needs re-verification)"
              : STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return disabledReason ? <span title={disabledReason}>{select}</span> : select;
}
