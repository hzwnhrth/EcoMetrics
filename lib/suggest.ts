import type { Finding } from "./types";

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
