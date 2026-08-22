"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DigestGroup } from "@/lib/suggest";

// Renders each reminder email exactly as it would send — one per owner,
// overdue then due-this-week. Nothing is actually sent.
export function DigestDialog({ groups }: { groups: DigestGroup[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail data-icon="inline-start" />
        Email digest
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reminder email digest</DialogTitle>
            <DialogDescription>
              {groups.length === 0
                ? "Nothing to remind — no open actions are overdue or due this week."
                : `${groups.length} email${groups.length === 1 ? "" : "s"} would be sent. Preview only — no mail leaves this app.`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {groups.map((g) => (
              <div key={g.owner} className="rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                <p>To: {g.owner}</p>
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
                        • {a.title} — was due {a.due_date}
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
                        • {a.title} — due {a.due_date}
                        {a.next_step ? ` · next: ${a.next_step}` : ""}
                      </p>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
