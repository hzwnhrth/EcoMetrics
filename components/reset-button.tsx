"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// "Reset demo data" (QA item 6) — one click back to the committed seed so the
// demo can re-run cleanly. Owner only; greyed out with a tooltip otherwise.
export function ResetButton({ disabledReason }: { disabledReason?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (
      !window.confirm(
        "Reset demo data? Evidence, actions, users and the anchor go back to the committed seed."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/reset", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast.success(
        `Demo data reset — ${data.evidence} evidence rows, ${data.actions} actions, ${data.users} users`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span title={disabledReason}>
      <Button variant="outline" size="sm" onClick={reset} disabled={busy || !!disabledReason}>
        <RotateCcw data-icon="inline-start" />
        {busy ? "Resetting…" : "Reset demo data"}
      </Button>
    </span>
  );
}
