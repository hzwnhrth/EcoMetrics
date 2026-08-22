import { NextResponse } from "next/server";
import { addAction, deleteAction, getStore, updateAction } from "@/lib/store";
import { can, denyReason, getSessionUser } from "@/lib/auth";
import { OPEN_STATUSES, type Action } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST: create an action promoted from a finding (manager+).
// One OPEN action per finding code — a second create returns 409 and the
// Priorities row shows "View action" instead (QA item 14).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!can(user, "create_action")) {
    return NextResponse.json({ error: denyReason(user, "create_action") }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const { finding_rule_code, title, owner, owner_email, next_step, due_date } = body ?? {};
  if (!finding_rule_code || !title || !owner || !due_date) {
    return NextResponse.json(
      { error: "finding_rule_code, title, owner and due_date are required" },
      { status: 400 }
    );
  }
  const store = await getStore();
  const existing = store.actions.find(
    (a) => a.finding_rule_code === finding_rule_code && OPEN_STATUSES.includes(a.status)
  );
  if (existing) {
    return NextResponse.json(
      { error: `an open action for ${finding_rule_code} already exists`, existing_id: existing.id },
      { status: 409 }
    );
  }
  const action = await addAction(
    {
      finding_rule_code,
      title,
      owner,
      owner_email: owner_email ?? "",
      next_step: next_step ?? "",
      due_date,
    },
    user!.name
  );
  return NextResponse.json(action, { status: 201 });
}

// PATCH: update fields on an existing action. Status changes are audited in
// the store; re-opening a done/resolved action becomes "reopened" —
// Open, needs re-verification (QA item 13).
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  const body = await req.json().catch(() => null);
  const { id, ...patch } = (body ?? {}) as { id?: string } & Partial<Action>;
  const cap = patch.status && Object.keys(patch).length === 1 ? "change_status" : "edit_action";
  if (!can(user, cap)) {
    return NextResponse.json({ error: denyReason(user, cap) }, { status: 403 });
  }
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const action = await updateAction(id, patch, user!.name);
  if (!action) return NextResponse.json({ error: "action not found" }, { status: 404 });
  return NextResponse.json(action);
}

// DELETE: remove an action entirely (manager+; QA item 6 full CRUD).
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!can(user, "delete_action")) {
    return NextResponse.json({ error: denyReason(user, "delete_action") }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const ok = await deleteAction(id);
  if (!ok) return NextResponse.json({ error: "action not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
