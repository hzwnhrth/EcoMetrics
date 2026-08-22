import { NextResponse } from "next/server";
import { addAction, updateAction } from "@/lib/store";
import type { Action } from "@/lib/types";

export const dynamic = "force-dynamic";

// POST: create an action promoted from a finding
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const { finding_rule_code, title, owner, next_step, due_date } = body ?? {};
  if (!finding_rule_code || !title || !owner || !due_date) {
    return NextResponse.json(
      { error: "finding_rule_code, title, owner and due_date are required" },
      { status: 400 }
    );
  }
  const action = await addAction({
    finding_rule_code,
    title,
    owner,
    next_step: next_step ?? "",
    due_date,
  });
  return NextResponse.json(action, { status: 201 });
}

// PATCH: update fields on an existing action (status changes from the table)
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  const { id, ...patch } = (body ?? {}) as { id?: string } & Partial<Action>;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const action = await updateAction(id, patch);
  if (!action) return NextResponse.json({ error: "action not found" }, { status: 404 });
  return NextResponse.json(action);
}
