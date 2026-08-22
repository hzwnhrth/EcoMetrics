export type Confidence = "verified" | "estimated" | "inferred";
export type Pillar = "E" | "S" | "G";

export type Role = "owner" | "manager" | "staff";

export interface User {
  id: string;
  name: string;           // "Siti Aishah"
  title: string;          // "HR Manager"
  email: string;
  role: Role;
  password_hash: string;  // "salt:sha256hex"
  demo?: boolean;         // seeded demo account — one-click login from the picker
}

export interface Evidence {
  id: string;
  source_file: string;      // "E_electricity_bills_2025.pdf"
  source_ref: string;       // "page 6" | "Payroll Dec 2025!I14" — never empty
  pillar: Pillar;
  field: string;            // see field catalog in CLAUDE.md
  value: string;            // ALWAYS string; parse at use site
  unit: string;             // "kWh" | "RM" | "person" | "date" | "bool" | "text"
  period: string | null;    // "2025-08" | "2025" | null
  confidence: Confidence;
  note?: string;
}

// Extractors return Evidence without id; the store assigns ids.
export type NewEvidence = Omit<Evidence, "id">;

export interface Indicator {
  code: string;              // "E1_ELECTRICITY" etc.
  pillar: Pillar;
  label: string;
  value: string;
  unit: string;
  status: "green" | "amber" | "red";
  coverage_note: string;     // "8 of 12 months verified, 1 estimated, 3 missing"
}

export interface Finding {
  id: string;
  rule_code: string;         // "S-WAGE"
  indicator_code: string;
  title: string;
  detail: string;            // plain English, cites evidence source_refs
  suggested_step: string;    // pre-written next step, deterministic from the evidence
  severity: 1 | 2 | 3;
  customer_asked: 0 | 1;     // 1 for ALL rules in this demo dataset
  quick_win: 0 | 1;
  score: number;             // computed, never stored stale
}

// "reopened" = manually re-opened after done/resolved — "Open — needs
// re-verification". Behaves as open everywhere; the next relevant upload
// re-evaluates it and may auto-close it again.
export type ActionStatus =
  | "open"
  | "in_progress"
  | "done"
  | "resolved_verified"
  | "reopened";

export const OPEN_STATUSES: readonly ActionStatus[] = ["open", "in_progress", "reopened"];

export interface AuditEntry {
  at: string;                     // ISO datetime
  by: string;                     // user name; "system (re-scan)" for auto-resolve
  via: "manual" | "rescan" | "seed";
  from: ActionStatus | null;
  to: ActionStatus;
}

export interface Action {
  id: string;
  finding_rule_code: string; // links action to the rule that spawned it
  title: string;
  owner: string;             // display string: "Siti Aishah (HR Manager)"
  owner_email: string;       // reminder emails route here; "" if unknown
  next_step: string;
  due_date: string;          // ISO date
  status: ActionStatus;
  resolved_by: "manual" | "rescan" | null;
  created_at: string;
  audit: AuditEntry[];       // every status change: who, when, manual vs system
}

export interface Anchor {
  hash: string;
  signature: string;
  anchored_at: string;
}

export interface Store {
  evidence: Evidence[];
  actions: Action[];
  users: User[];
  meta: {
    anchor: Anchor | null;
    // reminder thresholds already emailed, keyed by action id
    // (values from: "-7", "-1", "0", "overdue")
    reminders_sent: Record<string, string[]>;
  };
}
