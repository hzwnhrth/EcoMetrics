import type { Action, Finding } from "./types";

// Suggested owner + due date for the create-action dialog. Pre-filled
// defaults only — the user can edit both before saving.

const OWNER_BY_PREFIX: Record<string, string> = {
  S: "HR Manager (Siti Aishah)",
  E: "Finance Exec",
  G: "Managing Director",
};

const DUE_DAYS: Record<number, number> = { 3: 3, 2: 7, 1: 14 };
const CAP_DAYS = 14; // the questionnaire deadline

export function suggestAction(
  finding: Finding,
  today: Date = new Date()
): { owner: string; due_date: string } {
  const prefix = finding.rule_code.split("-")[0];
  const owner = OWNER_BY_PREFIX[prefix] ?? "Managing Director";
  const days = Math.min(DUE_DAYS[finding.severity] ?? CAP_DAYS, CAP_DAYS);
  const due = new Date(today);
  due.setDate(due.getDate() + days);
  return { owner, due_date: due.toISOString().slice(0, 10) };
}

// Reminder-email digest: one email per owner, overdue + due-this-week
// sections. Rendering only — nothing is sent.
export interface DigestGroup {
  owner: string;
  overdue: Action[];
  dueThisWeek: Action[];
}

export function buildDigest(actions: Action[], today: Date = new Date()): DigestGroup[] {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayDiff = (iso: string) =>
    Math.round((new Date(iso + "T00:00:00").getTime() - start.getTime()) / 86400000);

  const byOwner = new Map<string, DigestGroup>();
  for (const a of actions) {
    if (a.status !== "open" && a.status !== "in_progress") continue;
    const days = dayDiff(a.due_date);
    const bucket = days < 0 ? "overdue" : days <= 7 ? "dueThisWeek" : null;
    if (!bucket) continue;
    const g = byOwner.get(a.owner) ?? { owner: a.owner, overdue: [], dueThisWeek: [] };
    g[bucket].push(a);
    byOwner.set(a.owner, g);
  }
  for (const g of byOwner.values()) {
    g.overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
    g.dueThisWeek.sort((a, b) => a.due_date.localeCompare(b.due_date));
  }
  return [...byOwner.values()].sort((a, b) => a.owner.localeCompare(b.owner));
}
