import Link from "next/link";
import { getStore } from "@/lib/store";
import { buildDigest } from "@/lib/suggest";
import { can, denyReason, getSessionUser } from "@/lib/auth";
import { ActionsTable } from "@/components/actions-table";
import { DigestDialog } from "@/components/digest-dialog";

export default async function ActionsPage() {
  const store = await getStore();
  const user = await getSessionUser();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Actions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {store.actions.length} action{store.actions.length === 1 ? "" : "s"} — auto-resolved when
            a re-scanned file makes the finding disappear. Owners get automatic email reminders as
            due dates approach.
          </p>
        </div>
        <DigestDialog
          groups={buildDigest(store.actions, today)}
          sendDenied={can(user, "send_digest") ? undefined : denyReason(user, "send_digest")}
        />
      </div>

      {store.actions.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No actions yet — promote a finding from{" "}
          <Link href="/priorities" className="underline underline-offset-4">
            Priorities
          </Link>
          .
        </p>
      ) : (
        <ActionsTable
          actions={store.actions}
          todayIso={todayIso}
          statusDenied={can(user, "change_status") ? undefined : denyReason(user, "change_status")}
          canDelete={can(user, "delete_action")}
        />
      )}
    </div>
  );
}
