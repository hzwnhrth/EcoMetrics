export type Confidence = "verified" | "estimated" | "inferred";
export type Pillar = "E" | "S" | "G";

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
  severity: 1 | 2 | 3;
  customer_asked: 0 | 1;     // 1 for ALL rules in this demo dataset
  quick_win: 0 | 1;
  score: number;             // computed, never stored stale
}

export interface Action {
  id: string;
  finding_rule_code: string; // links action to the rule that spawned it
  title: string;
  owner: string;
  next_step: string;
  due_date: string;          // ISO date
  status: "open" | "in_progress" | "done" | "resolved_verified";
  resolved_by: "manual" | "rescan" | null;
  created_at: string;
}

export interface Anchor {
  hash: string;
  signature: string;
  anchored_at: string;
}

export interface Store {
  evidence: Evidence[];
  actions: Action[];
  meta: { anchor: Anchor | null };
}
