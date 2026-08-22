"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { DigestGroup } from "@/lib/suggest";

// Reminders send AUTOMATICALLY via the daily cron (7 days before, 1 day
// before, on the due date, then overdue). This dialog is the manual admin
// override: preview each owner's email and send them all now.
export function DigestDialog({
  groups,
  sendDenied,
}: {
  groups: DigestGroup[];
  sendDenied?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendNow() {
    setSending(true);
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      if (!data.configured) {
        toast.warning("Email is not configured", {
          description:
            "Add the Resend integration (RESEND_API_KEY) to send for real. Nothing was sent.",
          duration: 8000,
        });
      } else {
        const ok = (data.sent as { sent: boolean }[]).filter((r) => r.sent).length;
        const failed = (data.sent as { sent: boolean; to: string; error?: string }[]).filter((r) => !r.sent);
        if (ok) toast.success(`${ok} reminder email${ok === 1 ? "" : "s"} sent`);
        for (const f of failed) toast.error(`Not sent to ${f.to}: ${f.error}`);
      }
    } catch (err) {
      toast.error(`Send failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail data-icon="inline-start" />
        Email digest
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reminder emails</DialogTitle>
            <DialogDescription>
              Reminders send automatically — 7 days before, 1 day before, on the due date, then
              once overdue — routed to each action&apos;s owner.{" "}
              {groups.length === 0
                ? "Right now nothing is overdue or due this week."
                : `This manual override sends ${groups.length} email${groups.length === 1 ? "" : "s"} immediately.`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.owner} className="rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                <p>To: {g.email ? `${g.owner} <${g.email}>` : `${g.owner} (no email on file)`}</p>
                <p>
                  Subject: ESG questionnaire actions — {g.overdue.length + g.dueThisWeek.length} need
                  attention
                </p>
                <hr className="my-2 border-border" />
                {g.overdue.length > 0 && (
                  <>
                    <p className="font-semibold">OVERDUE</p>
                    {g.overdue.map((a) => (
                      <p key={a.id}>
                        • {a.title} — was due {formatDate(a.due_date)}
                        {a.next_step ? ` · next: ${a.next_step}` : ""}
                      </p>
                    ))}
                  </>
                )}
                {g.dueThisWeek.length > 0 && (
                  <>
                    <p className="mt-2 font-semibold">DUE THIS WEEK</p>
                    {g.dueThisWeek.map((a) => (
                      <p key={a.id}>
                        • {a.title} — due {formatDate(a.due_date)}
                        {a.next_step ? ` · next: ${a.next_step}` : ""}
                      </p>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
          {groups.length > 0 && (
            <DialogFooter>
              <span title={sendDenied}>
                <Button onClick={sendNow} disabled={sending || !!sendDenied}>
                  <Send data-icon="inline-start" />
                  {sending ? "Sending…" : "Send now (admin override)"}
                </Button>
              </span>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
