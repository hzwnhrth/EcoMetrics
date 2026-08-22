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

const LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

export function ActionStatusSelect({ id, status }: { id: string; status: string }) {
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Action marked ${LABELS[next] ?? next}`);
      router.refresh();
    } catch (err) {
      toast.error(`Could not update: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={status} onValueChange={change} disabled={saving} items={LABELS}>
      <SelectTrigger size="sm" className="min-w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
