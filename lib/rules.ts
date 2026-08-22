import type { Evidence, Finding, Indicator } from "./types";

// 12 pure rules + indicators. No network, no AI; `today` is a parameter so
// runs are testable and identical. Findings/indicators are virtual — derived
// on every read, never persisted.

const CUSTOMER_ASKED: 0 | 1 = 1; // the scenario is a customer questionnaire

function score(severity: 1 | 2 | 3, quick_win: 0 | 1): number {
  return severity * (CUSTOMER_ASKED ? 2 : 1) * (quick_win ? 1.5 : 1);
}

function finding(
  rule_code: string,
  indicator_code: string,
  severity: 1 | 2 | 3,
  quick_win: 0 | 1,
  title: string,
  detail: string
): Finding {
  return {
    id: rule_code,
    rule_code,
    indicator_code,
    title,
    detail,
    severity,
    customer_asked: CUSTOMER_ASKED,
    quick_win,
    score: score(severity, quick_win),
  };
}

const MONTHS_2025 = Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, "0")}`);

// "Payroll Dec 2025!I14" -> "14"; links cells on the same sheet row
function payrollRow(source_ref: string): string | null {
  const m = source_ref.match(/![A-Z]+(\d+)$/);
  return m ? m[1] : null;
}

function rowsByField(evidence: Evidence[], field: string): Evidence[] {
  return evidence.filter((e) => e.field === field);
}

// account for each bill page: account_number rows keyed by source_ref ("page N")
function accountByPage(evidence: Evidence[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of rowsByField(evidence, "account_number")) m.set(e.source_ref, e.value);
  return m;
}

function primaryAccount(evidence: Evidence[]): string | null {
  const counts = new Map<string, number>();
  for (const e of rowsByField(evidence, "account_number"))
    counts.set(e.value, (counts.get(e.value) ?? 0) + 1);
  let best: string | null = null;
  for (const [acc, n] of counts) if (best === null || n > (counts.get(best) ?? 0)) best = acc;
  return best;
}

export function runRules(evidence: Evidence[], today: Date = new Date()): Finding[] {
  const findings: Finding[] = [];
  const kwh = rowsByField(evidence, "electricity_kwh");
  const pageAccount = accountByPage(evidence);
  const primary = primaryAccount(evidence);

  // ---- E-GAP: months of 2025 with no bill on the primary account ----
  if (primary) {
    const covered = new Set(
      kwh.filter((e) => pageAccount.get(e.source_ref) === primary && e.period).map((e) => e.period as string)
    );
    const missing = MONTHS_2025.filter((p) => !covered.has(p));
    if (missing.length) {
      findings.push(
        finding("E-GAP", "E1_ELECTRICITY", 2, 1, "Missing electricity bills",
          `Primary account ${primary} has bills for ${covered.size} of 12 months of 2025; missing ${missing.join(", ")}. Consumption for those months is unknown, not zero.`)
      );
    }
  }

  // ---- E-EST: any E evidence with confidence=estimated ----
  const estimated = evidence.filter((e) => e.pillar === "E" && e.confidence === "estimated");
  if (estimated.length) {
    const parts = estimated.map((e) => `${e.period ?? "?"} (${e.source_ref}${e.note ? ", " + e.note : ""})`);
    findings.push(
      finding("E-EST", "E1_ELECTRICITY", 2, 1, "Estimated meter readings",
        `Estimated (not actual) readings for: ${parts.join("; ")}. Ask the utility for actual-read bills or meter photos.`)
    );
  }

  // ---- E-SCOPE: more than one electricity account ----
  const accounts = [...new Set(rowsByField(evidence, "account_number").map((e) => e.value))];
  if (accounts.length > 1 && primary) {
    const extras = accounts.filter((a) => a !== primary).map((acc) => {
      const page = rowsByField(evidence, "account_number").find((e) => e.value === acc)?.source_ref;
      const addr = rowsByField(evidence, "site_address").find((e) => e.source_ref === page)?.value;
      return `${acc}${addr ? ` at ${addr}` : ""}${page ? ` (${page})` : ""}`;
    });
    findings.push(
      finding("E-SCOPE", "E1_ELECTRICITY", 1, 0, "Second electricity account found",
        `${accounts.length} distinct accounts in the bills. Besides primary ${primary}: ${extras.join("; ")}. Confirm whether this site is in scope of the questionnaire.`)
    );
  }

  // payroll row linking
  const staffIdByRow = new Map<string, string>();
  for (const e of rowsByField(evidence, "staff_id")) {
    const r = payrollRow(e.source_ref);
    if (r) staffIdByRow.set(r, e.value);
  }
  const salaries = rowsByField(evidence, "basic_salary");

  // ---- S-WAGE: basic salary below RM1,700 ----
  const low = salaries.filter((e) => Number(e.value) < 1700);
  if (low.length) {
    const parts = low.map((e) => {
      const id = staffIdByRow.get(payrollRow(e.source_ref) ?? "") ?? "?";
      return `${id} (RM${e.value}, ${e.source_ref})`;
    });
    findings.push(
      finding("S-WAGE", "S3_WAGE_COMPLIANCE", 3, 1, "Salaries below statutory minimum wage",
        `${low.length} staff paid below the Minimum Wages Order 2024, RM1,700/month: ${parts.join("; ")}.`)
    );
  }

  // ---- S-INDUCT: safety induction marked "No" ----
  const noInduct = rowsByField(evidence, "safety_induction").filter((e) => e.value === "No");
  if (noInduct.length) {
    const parts = noInduct.map((e) => {
      const id = staffIdByRow.get(payrollRow(e.source_ref) ?? "") ?? "?";
      return `${id} (${e.source_ref})`;
    });
    findings.push(
      finding("S-INDUCT", "S2_TRAINING", 3, 1, "Staff without safety induction",
        `Safety induction recorded as "No" for: ${parts.join("; ")}.`)
    );
  }

  // ---- S-RECON: HR headcount vs register rows vs distinct IDs ----
  const hr = rowsByField(evidence, "hr_system_headcount")[0];
  const staffRowCount = salaries.length; // rows having basic_salary
  const distinctIds = new Set(rowsByField(evidence, "staff_id").map((e) => e.value)).size;
  if (hr) {
    const hrCount = Number(hr.value);
    if (!(hrCount === staffRowCount && staffRowCount === distinctIds)) {
      findings.push(
        finding("S-RECON", "S1_HEADCOUNT", 2, 1, "Headcount figures do not reconcile",
          `HR system says ${hr.value} (${hr.source_ref}${hr.note ? ", " + hr.note : ""}), the register has ${staffRowCount} rows with a salary, and ${distinctIds} distinct staff IDs. All three should be equal.`)
      );
    }
  }

  // ---- S-BLANK: staff with salary but no gender / no training hours ----
  const salaryRows = new Set(salaries.map((e) => payrollRow(e.source_ref)).filter(Boolean) as string[]);
  const blanks: string[] = [];
  for (const field of ["gender", "training_hours"]) {
    const present = new Set(rowsByField(evidence, field).map((e) => payrollRow(e.source_ref)));
    const missing = [...salaryRows].filter((r) => !present.has(r));
    if (missing.length) {
      const ids = missing.map((r) => staffIdByRow.get(r) ?? `row ${r}`);
      const shown = ids.length > 6 ? ids.slice(0, 6).join(", ") + `, … (${ids.length} total)` : ids.join(", ");
      blanks.push(`${field} blank for ${missing.length} of ${salaryRows.size} staff (${shown})`);
    }
  }
  if (blanks.length) {
    findings.push(
      finding("S-BLANK", "S1_HEADCOUNT", 2, 1, "Blank cells in the payroll register",
        `${blanks.join("; ")}. Blank means not recorded — it cannot be reported as zero.`)
    );
  }

  // ---- S-DUP: same staff_id under 2+ distinct source_refs ----
  const refsById = new Map<string, string[]>();
  for (const e of rowsByField(evidence, "staff_id")) {
    refsById.set(e.value, [...(refsById.get(e.value) ?? []), e.source_ref]);
  }
  const dups = [...refsById].filter(([, refs]) => new Set(refs).size >= 2);
  if (dups.length) {
    const parts = dups.map(([id, refs]) => `${id} (${refs.join(", ")})`);
    findings.push(
      finding("S-DUP", "S1_HEADCOUNT", 1, 1, "Duplicate staff IDs",
        `Same staff ID on more than one register row: ${parts.join("; ")}.`)
    );
  }

  // ---- S-ABSENT: expected fields with zero evidence anywhere ----
  const absent = ["lti_count", "turnover"].filter((f) => rowsByField(evidence, f).length === 0);
  if (absent.length) {
    findings.push(
      finding("S-ABSENT", "S1_HEADCOUNT", 2, 0, "No data source for safety and turnover",
        `No source document provided for: ${absent.join(", ")} — unknown, not zero. The questionnaire cannot be answered on these until a safety log / leavers report is uploaded.`)
    );
  }

  // ---- G-STALE: next review date in the past ----
  const nextReview = rowsByField(evidence, "policy_next_review").find((e) => e.value !== "");
  if (nextReview) {
    const due = new Date(nextReview.value);
    if (!isNaN(due.getTime()) && due < today) {
      const years = Math.floor((today.getTime() - due.getTime()) / (365.25 * 24 * 3600 * 1000));
      const overdue = years >= 1 ? `${years} year${years > 1 ? "s" : ""}` : "less than a year";
      findings.push(
        finding("G-STALE", "G1_ABC_POLICY", 2, 0, "Policy review overdue",
          `Next review was due ${nextReview.value} (${nextReview.source_ref}) — ${overdue} overdue.`)
      );
    }
  }

  // ---- G-UNSIGNED: unapproved / draft / placeholder owner ----
  const approvedBy = rowsByField(evidence, "policy_approved_by")[0];
  const isDraft = rowsByField(evidence, "policy_is_draft")[0];
  const owner = rowsByField(evidence, "policy_owner")[0];
  const failures: string[] = [];
  if (approvedBy && approvedBy.value === "")
    failures.push(`Approved By is blank (${approvedBy.source_ref})`);
  if (isDraft && isDraft.value === "true")
    failures.push(`document is marked DRAFT (${isDraft.source_ref})`);
  if (owner && owner.value.includes("["))
    failures.push(`Owner is an unfilled placeholder "${owner.value}" (${owner.source_ref})`);
  if (failures.length) {
    findings.push(
      finding("G-UNSIGNED", "G1_ABC_POLICY", 3, 1, "Policy is not signed off",
        `Control failures: ${failures.join("; ")}. An unapproved policy does not evidence "adequate procedures".`)
    );
  }

  // ---- G-ORPHAN: referenced documents not among uploaded files ----
  const files = [...new Set(evidence.map((e) => e.source_file))];
  const fuzzyMatch = (docName: string) => {
    const tokens = docName.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((t) => t.length >= 4);
    return files.some((f) => {
      const fn = f.toLowerCase().replace(/[^a-z0-9]/g, " ");
      return tokens.filter((t) => fn.includes(t)).length >= 2;
    });
  };
  const orphans = rowsByField(evidence, "policy_referenced_doc").filter((e) => !fuzzyMatch(e.value));
  if (orphans.length) {
    findings.push(
      finding("G-ORPHAN", "G1_ABC_POLICY", 2, 1, "Referenced documents not provided",
        `The policy refers to documents that are not among the uploaded files: ${orphans.map((e) => `"${e.value}"`).join("; ")}. The customer may ask to see them.`)
    );
  }

  return findings.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Indicators — status rule: green only if EVERY supporting row is verified AND
// no finding touches the indicator; amber if any estimated/inferred input or a
// sev-1/2 finding; red if a sev-3 finding or zero evidence. One estimated
// input drags green to amber — never soften this.

function statusOf(
  support: Evidence[],
  code: string,
  findings: Finding[]
): "green" | "amber" | "red" {
  const touching = findings.filter((f) => f.indicator_code === code);
  if (support.length === 0 || touching.some((f) => f.severity === 3)) return "red";
  if (support.some((e) => e.confidence !== "verified") || touching.length > 0) return "amber";
  return "green";
}

export function computeIndicators(evidence: Evidence[], findings: Finding[]): Indicator[] {
  const kwh = rowsByField(evidence, "electricity_kwh");
  const pageAccount = accountByPage(evidence);
  const primary = primaryAccount(evidence);

  // E1: sum of verified kWh; coverage counts months of the primary account
  const verifiedSum = kwh.filter((e) => e.confidence === "verified").reduce((s, e) => s + Number(e.value), 0);
  const primaryKwh = kwh.filter((e) => pageAccount.get(e.source_ref) === primary && e.period);
  const vMonths = new Set(primaryKwh.filter((e) => e.confidence === "verified").map((e) => e.period)).size;
  const eMonths = new Set(primaryKwh.filter((e) => e.confidence === "estimated").map((e) => e.period)).size;
  const e1: Indicator = {
    code: "E1_ELECTRICITY", pillar: "E", label: "Electricity consumption 2025",
    value: String(verifiedSum), unit: "kWh",
    status: statusOf(kwh, "E1_ELECTRICITY", findings),
    coverage_note: `${vMonths} of 12 months verified, ${eMonths} estimated, ${12 - vMonths - eMonths} missing`,
  };

  const salaries = rowsByField(evidence, "basic_salary");
  const staffIds = rowsByField(evidence, "staff_id");
  const hr = rowsByField(evidence, "hr_system_headcount")[0];
  const s1Support = [...staffIds, ...(hr ? [hr] : [])];
  const s1: Indicator = {
    code: "S1_HEADCOUNT", pillar: "S", label: "Headcount (Dec 2025)",
    value: String(salaries.length), unit: "person",
    status: statusOf(s1Support, "S1_HEADCOUNT", findings),
    coverage_note: `register: ${salaries.length} rows with salary, ${new Set(staffIds.map((e) => e.value)).size} distinct IDs; HR system: ${hr ? hr.value + " (inferred)" : "not provided"}`,
  };

  const training = rowsByField(evidence, "training_hours");
  const induction = rowsByField(evidence, "safety_induction");
  const trainingSum = training.reduce((s, e) => s + Number(e.value), 0);
  const s2: Indicator = {
    code: "S2_TRAINING", pillar: "S", label: "Training hours 2025",
    value: String(trainingSum), unit: "hours",
    status: statusOf([...training, ...induction], "S2_TRAINING", findings),
    coverage_note: `${training.length} of ${salaries.length} staff have recorded hours; ${salaries.length - training.length} blank (not recorded, not zero)`,
  };

  const below = salaries.filter((e) => Number(e.value) < 1700);
  const s3: Indicator = {
    code: "S3_WAGE_COMPLIANCE", pillar: "S", label: "Minimum wage compliance",
    value: `${salaries.length - below.length} of ${salaries.length}`, unit: "person",
    status: statusOf(salaries, "S3_WAGE_COMPLIANCE", findings),
    coverage_note: below.length
      ? `${below.length} staff below RM1,700/month (Minimum Wages Order 2024)`
      : "all recorded salaries at or above RM1,700/month",
  };

  const gRows = evidence.filter((e) => e.pillar === "G");
  const version = rowsByField(evidence, "policy_version")[0]?.value;
  const issued = rowsByField(evidence, "policy_issue_date")[0]?.value;
  const gFindings = findings.filter((f) => f.indicator_code === "G1_ABC_POLICY");
  const g1: Indicator = {
    code: "G1_ABC_POLICY", pillar: "G", label: "Anti-bribery & corruption policy",
    value: version ? `v${version}${issued ? ` (issued ${issued})` : ""}` : "not provided",
    unit: "text",
    status: statusOf(gRows, "G1_ABC_POLICY", findings),
    coverage_note: gFindings.length
      ? `policy exists but ${gFindings.length} control finding${gFindings.length > 1 ? "s" : ""}: ${gFindings.map((f) => f.rule_code).join(", ")}`
      : "policy provided and controls in order",
  };

  return [e1, s1, s2, s3, g1];
}
