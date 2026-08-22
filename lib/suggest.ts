import type { Action, ActionStatus, Finding, User } from "./types";

// mirrors OPEN_STATUSES in lib/types.ts — kept type-only here so
// scripts/run-rules.mjs can load this file under Node's native TS stripping
const OPEN: readonly ActionStatus[] = ["open", "in_progress", "reopened"];

// Suggested owner + due date + next step for the create-action dialog.
// Pre-filled defaults only — the user edits rather than authors.
// Owners resolve against the user list so the owner picker and reminder
// routing share one source of truth. (E- findings go to the Managing
// Director: the three seeded accounts have no Finance Exec.)

const TITLE_BY_PREFIX: Record<string, string> = {
  S: "HR Manager",
  E: "Managing Director",
  G: "Managing Director",
};

const DUE_DAYS: Record<number, number> = { 3: 3, 2: 7, 1: 14 };
const CAP_DAYS = 14; // the questionnaire deadline

export function ownerDisplay(u: User): string {
  return `${u.name} (${u.title})`;
}

export function suggestAction(
  finding: Finding,
  users: User[],
  today: Date = new Date()
): { owner: string; owner_email: string; due_date: string; next_step: string } {
  const prefix = finding.rule_code.split("-")[0];
  const title = TITLE_BY_PREFIX[prefix] ?? "Managing Director";
  const user =
    users.find((u) => u.title === title) ??
    users.find((u) => u.role === "owner") ??
    users[0];
  const days = Math.min(DUE_DAYS[finding.severity] ?? CAP_DAYS, CAP_DAYS);
  const due = new Date(today);
  due.setDate(due.getDate() + days);
  return {
    owner: user ? ownerDisplay(user) : title,
    owner_email: user?.email ?? "",
    due_date: due.toISOString().slice(0, 10),
    next_step: finding.suggested_step,
  };
}

// Reminder-email digest: one email per owner, overdue + due-this-week
// sections. Shared by the manual "Email digest" dialog and /api/reminders.
export interface DigestGroup {
  owner: string;
  email: string;
  overdue: Action[];
  dueThisWeek: Action[];
}

export function buildDigest(actions: Action[], today: Date = new Date()): DigestGroup[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayDiff = (iso: string) =>
    Math.round((new Date(iso + "T00:00:00").getTime() - start.getTime()) / 86400000);

  const byOwner = new Map<string, DigestGroup>();
  for (const a of actions) {
    if (!OPEN.includes(a.status)) continue;
    const days = dayDiff(a.due_date);
    const bucket = days < 0 ? "overdue" : days <= 7 ? "dueThisWeek" : null;
    if (!bucket) continue;
    const g = byOwner.get(a.owner) ?? {
      owner: a.owner,
      email: a.owner_email ?? "",
      overdue: [],
      dueThisWeek: [],
    };
    if (!g.email && a.owner_email) g.email = a.owner_email;
    g[bucket].push(a);
    byOwner.set(a.owner, g);
  }
  for (const g of byOwner.values()) {
    g.overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
    g.dueThisWeek.sort((a, b) => a.due_date.localeCompare(b.due_date));
  }
  return [...byOwner.values()].sort((a, b) => a.owner.localeCompare(b.owner));
}
