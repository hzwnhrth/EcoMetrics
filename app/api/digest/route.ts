import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { buildDigest } from "@/lib/suggest";
import { emailConfigured, renderDigestEmail, sendEmail } from "@/lib/mailer";
import { can, denyReason, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Manual "send now" override behind the digest dialog (QA item 11 keeps the
// button as an admin override). Sends every owner their digest immediately,
// independent of the cron thresholds.
export async function POST() {
  const user = await getSessionUser();
  if (!can(user, "send_digest")) {
    return NextResponse.json({ error: denyReason(user, "send_digest") }, { status: 403 });
  }
  const store = await getStore();
  const groups = buildDigest(store.actions, new Date());
  const results = [];
  for (const g of groups) {
    if (!g.email) {
      results.push({ sent: false, to: g.owner, subject: "", error: "owner has no email on file" });
      continue;
    }
    const { subject, text } = renderDigestEmail(g);
    results.push(await sendEmail(g.email, subject, text));
  }
  return NextResponse.json({ ok: true, configured: emailConfigured(), sent: results });
}
