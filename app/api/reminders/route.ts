import { NextResponse } from "next/server";
import { getStore, saveStore } from "@/lib/store";
import { buildDigest } from "@/lib/suggest";
import { emailConfigured, renderDigestEmail, sendEmail } from "@/lib/mailer";
import { can, getSessionUser } from "@/lib/auth";
import { OPEN_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

// Automatic reminders (QA item 11): a daily Vercel cron hits this route.
// Thresholds per action: 7 days before, 1 day before, on the due date, then
// once when overdue. Each threshold fires AT MOST once per action ("<= with
// catch-up", so a missed cron day still sends), tracked in
// store.meta.reminders_sent. Emails route to the assigned owner.

const THRESHOLDS: { key: string; test: (days: number) => boolean }[] = [
  { key: "overdue", test: (d) => d < 0 },
  { key: "0", test: (d) => d <= 0 },
  { key: "1", test: (d) => d <= 1 },
  { key: "7", test: (d) => d <= 7 },
];

async function authorized(req: Request): Promise<boolean> {
  // Vercel cron sends "Authorization: Bearer <CRON_SECRET>" when the env var exists
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  // manual run from the app: managers and the MD
  const user = await getSessionUser();
  if (can(user, "send_digest")) return true;
  // no secret configured (local dev / demo): allow the cron path through
  return !secret && !req.headers.get("authorization");
}

async function run(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const store = await getStore();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayDiff = (iso: string) =>
    Math.round((new Date(iso + "T00:00:00").getTime() - start.getTime()) / 86400000);

  // which actions crossed a threshold that has not been emailed yet?
  const due = new Map<string, string[]>(); // owner_email -> action ids
  const newlySent: { actionId: string; threshold: string }[] = [];
  for (const a of store.actions) {
    if (!OPEN_STATUSES.includes(a.status) || !a.owner_email) continue;
    const days = dayDiff(a.due_date);
    const sent = store.meta.reminders_sent[a.id] ?? [];
    for (const t of THRESHOLDS) {
      if (t.test(days) && !sent.includes(t.key)) {
        newlySent.push({ actionId: a.id, threshold: t.key });
        const list = due.get(a.owner_email) ?? [];
        if (!list.includes(a.id)) list.push(a.id);
        due.set(a.owner_email, list);
        break; // one (the most urgent) new threshold per action per run
      }
    }
  }

  if (due.size === 0) {
    return NextResponse.json({ ok: true, sent: [], note: "no thresholds crossed" });
  }

  // one digest email per owner with anything newly due
  const groups = buildDigest(store.actions, today);
  const results = [];
  for (const [email] of due) {
    const group = groups.find((g) => g.email === email);
    if (!group) continue;
    const { subject, text } = renderDigestEmail(group);
    results.push(await sendEmail(email, subject, text));
  }

  // record thresholds only if actually delivered (unconfigured = retry next run)
  if (emailConfigured() && results.some((r) => r.sent)) {
    const deliveredTo = new Set(results.filter((r) => r.sent).map((r) => r.to));
    for (const { actionId, threshold } of newlySent) {
      const action = store.actions.find((a) => a.id === actionId);
      if (!action || !deliveredTo.has(action.owner_email)) continue;
      const sent = store.meta.reminders_sent[actionId] ?? [];
      if (!sent.includes(threshold)) sent.push(threshold);
      store.meta.reminders_sent[actionId] = sent;
    }
    await saveStore(store);
  }

  return NextResponse.json({
    ok: true,
    configured: emailConfigured(),
    sent: results,
    thresholds: newlySent,
  });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
