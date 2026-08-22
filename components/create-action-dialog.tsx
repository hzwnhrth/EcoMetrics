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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface OwnerOption {
  display: string; // "Siti Aishah (HR Manager)"
  email: string;
}

// Pre-filled from lib/suggest.ts on the server; the user edits rather than
// authors. Owner is a dropdown of existing users (QA item 3), next step is
// pre-written from the finding (QA item 1).
export function CreateActionDialog({
  ruleCode,
  defaultTitle,
  suggestedOwner,
  suggestedDueDate,
  suggestedStep,
  owners,
  disabledReason,
}: {
  ruleCode: string;
  defaultTitle: string;
  suggestedOwner: string;
  suggestedDueDate: string;
  suggestedStep: string;
  owners: OwnerOption[];
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [owner, setOwner] = useState(
    owners.find((o) => o.display === suggestedOwner)?.display ?? owners[0]?.display ?? suggestedOwner
  );
  const [nextStep, setNextStep] = useState(suggestedStep);
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
          owner_email: owners.find((o) => o.display === owner)?.email ?? "",
          next_step: nextStep,
          due_date: dueDate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
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
  const ownerItems = Object.fromEntries(owners.map((o) => [o.display, o.display]));

  if (disabledReason) {
    return (
      <span title={disabledReason}>
        <Button variant="outline" size="sm" disabled>
          Create action
        </Button>
      </span>
    );
  }

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
              Everything is suggested from the finding; edit before saving if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className={field}>
              <label className={label} htmlFor="ca-title">Title</label>
              <Input id="ca-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className={field}>
              <label className={label} htmlFor="ca-owner">Owner</label>
              <Select value={owner} onValueChange={(v) => setOwner(v as string)} items={ownerItems}>
                <SelectTrigger id="ca-owner" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {owners.map((o) => (
                    <SelectItem key={o.display} value={o.display}>
                      {o.display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={field}>
              <label className={label} htmlFor="ca-next">Next step (suggested — edit if needed)</label>
              <Input id="ca-next" value={nextStep} onChange={(e) => setNextStep(e.target.value)} />
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
