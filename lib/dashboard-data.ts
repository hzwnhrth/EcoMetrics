import type { Evidence, Finding } from "./types";

// Pure data prep for the dashboard charts (QA item 7) — same source of truth
// as lib/rules.ts, no AI, no network.

function rowsByField(evidence: Evidence[], field: string): Evidence[] {
  return evidence.filter((e) => e.field === field);
}

function payrollRow(source_ref: string): string | null {
  const m = source_ref.match(/![A-Z]+(\d+)$/);
  return m ? m[1] : null;
}

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export interface MonthBar {
  period: string;        // "2025-01"
  label: string;         // "J"
  kwh: number | null;    // null = no bill
  estimated: boolean;
}

export function electricityByMonth(evidence: Evidence[]): { bars: MonthBar[]; account: string | null } {
  const pageAccount = new Map<string, string>();
  for (const e of rowsByField(evidence, "account_number")) pageAccount.set(e.source_ref, e.value);
  const counts = new Map<string, number>();
  for (const v of pageAccount.values()) counts.set(v, (counts.get(v) ?? 0) + 1);
  let account: string | null = null;
  for (const [acc, n] of counts) if (account === null || n > (counts.get(account) ?? 0)) account = acc;

  const kwh = rowsByField(evidence, "electricity_kwh").filter(
    (e) => pageAccount.get(e.source_ref) === account
  );
  const bars: MonthBar[] = MONTH_LETTERS.map((label, i) => {
    const period = `2025-${String(i + 1).padStart(2, "0")}`;
    const row = kwh.find((e) => e.period === period);
    return {
      period,
      label,
      kwh: row ? Number(row.value) : null,
      estimated: row?.confidence === "estimated",
    };
  });
  return { bars, account };
}

export function headcountComparison(evidence: Evidence[]): {
  hr: number | null;
  register: number;
  distinct: number;
} {
  const hr = rowsByField(evidence, "hr_system_headcount")[0];
  return {
    hr: hr ? Number(hr.value) : null,
    register: rowsByField(evidence, "basic_salary").length,
    distinct: new Set(rowsByField(evidence, "staff_id").map((e) => e.value)).size,
  };
}

export function trainingSplit(evidence: Evidence[]): {
  recorded: number;
  blank: number;
  hoursSum: number;
} {
  const staff = rowsByField(evidence, "basic_salary").length;
  const training = rowsByField(evidence, "training_hours");
  return {
    recorded: training.length,
    blank: Math.max(0, staff - training.length),
    hoursSum: training.reduce((s, e) => s + Number(e.value), 0),
  };
}

export interface WaffleSquare {
  staffId: string;
  amount: number;
  ok: boolean; // >= RM1,700
}

export function wageWaffle(evidence: Evidence[]): WaffleSquare[] {
  const idByRow = new Map<string, string>();
  for (const e of rowsByField(evidence, "staff_id")) {
    const r = payrollRow(e.source_ref);
    if (r) idByRow.set(r, e.value);
  }
  return rowsByField(evidence, "basic_salary")
    .map((e) => {
      const amount = Number(e.value);
      return {
        staffId: idByRow.get(payrollRow(e.source_ref) ?? "") ?? "?",
        amount,
        ok: amount >= 1700,
      };
    })
    .sort((a, b) => a.staffId.localeCompare(b.staffId));
}

export function evidenceHealth(evidence: Evidence[]): {
  verified: number;
  estimated: number;
  inferred: number;
  total: number;
} {
  const t = { verified: 0, estimated: 0, inferred: 0, total: evidence.length };
  for (const e of evidence) t[e.confidence]++;
  return t;
}

// Governance control checks (QA item 9): every check the policy either passes
// or fails, fails first — rendered as a capped list that scales vertically.
export interface ControlCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export function governanceChecks(evidence: Evidence[], findings: Finding[], today: Date): ControlCheck[] {
  const val = (field: string) => rowsByField(evidence, field)[0]?.value;
  const checks: ControlCheck[] = [];
  const push = (label: string, pass: boolean, detail: string) =>
    checks.push({ label, pass, detail });

  const title = val("policy_title");
  push("Policy document provided", !!title, title ? `"${title}"` : "no policy uploaded");
  const version = val("policy_version");
  push("Version recorded", !!version, version ? `v${version}` : "no version in the control table");
  const issued = val("policy_issue_date");
  push("Issue date recorded", !!issued, issued ?? "no issue date");
  const approved = val("policy_approved_by");
  push("Approved-by signed", approved !== undefined && approved !== "", approved ? approved : "Approved By cell is blank");
  push("Not marked DRAFT", val("policy_is_draft") !== "true", val("policy_is_draft") === "true" ? "header/watermark says DRAFT" : "no draft marking");
  const owner = val("policy_owner") ?? "";
  push("Owner named", !!owner && !owner.includes("["), owner.includes("[") ? `unfilled placeholder ${owner}` : owner || "no owner");
  const nextReview = val("policy_next_review");
  const reviewOk = !!nextReview && !isNaN(new Date(nextReview).getTime()) && new Date(nextReview) >= today;
  push("Review up to date", reviewOk, nextReview ? `next review ${nextReview}` : "no next-review date");
  const orphan = findings.find((f) => f.rule_code === "G-ORPHAN");
  push("Referenced documents on file", !orphan, orphan ? "referenced documents missing from the uploads" : "all references resolve");
  const channel = val("policy_reporting_channel");
  push("Reporting channel defined", !!channel, channel ?? "no reporting channel");

  return checks.sort((a, b) => Number(a.pass) - Number(b.pass));
}
