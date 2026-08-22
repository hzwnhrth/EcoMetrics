import { NextResponse } from "next/server";
import { resetStore } from "@/lib/store";
import { can, denyReason, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// "Reset demo data" (QA item 6) — back to the committed seed: 428 evidence
// rows, 3 users, 3 open actions, no anchor. Owner only; destructive.
export async function POST() {
  const user = await getSessionUser();
  if (!can(user, "reset")) {
    return NextResponse.json({ error: denyReason(user, "reset") }, { status: 403 });
  }
  const s = await resetStore();
  return NextResponse.json({
    ok: true,
    evidence: s.evidence.length,
    actions: s.actions.length,
    users: s.users.length,
  });
}
