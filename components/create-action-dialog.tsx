"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

// Pre-filled from lib/suggest.ts on the server; everything editable here.
export function CreateActionDialog({
  ruleCode,
  defaultTitle,
  suggestedOwner,
  suggestedDueDate,
}: {
  ruleCode: string;
  defaultTitle: string;
  suggestedOwner: string;
  suggestedDueDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [owner, setOwner] = useState(suggestedOwner);
  const [nextStep, setNextStep] = useState("");
  const [dueDate, setDueDate] = useState(suggestedDueDate);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_rule_code: ruleCode,
          title,
          owner,
          next_step: nextStep,
          due_date: dueDate,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`Action created for ${ruleCode}`, {
        description: `${owner} · due ${dueDate}`,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(`Could not create action: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  const field = "flex flex-col gap-1.5";
  const label = "text-xs font-medium text-muted-foreground";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Create action
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create action — {ruleCode}</DialogTitle>
            <DialogDescription>
              Owner and due date are suggested; edit anything before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={field}>
              <label className={label} htmlFor="ca-title">Title</label>
              <Input id="ca-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={field}>
              <label className={label} htmlFor="ca-owner">Owner</label>
              <Input id="ca-owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div className={field}>
              <label className={label} htmlFor="ca-next">Next step</label>
              <Input
                id="ca-next"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="e.g. Adjust salaries in January payroll run"
              />
            </div>
            <div className={field}>
              <label className={label} htmlFor="ca-due">Due date</label>
              <Input id="ca-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || !title.trim() || !owner.trim() || !dueDate}>
              {saving ? "Saving…" : "Save action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
