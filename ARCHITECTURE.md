# ARCHITECTURE.md — ESG Evidence & Action Tool

Companion to CLAUDE.md. Read both before building. These diagrams are the
authoritative picture of the system: if code and diagram disagree, the diagram
plus CLAUDE.md win.

Three diagrams: (1) system architecture, (2) logical ERD, (3) the re-scan
auto-verify sequence. All Mermaid — GitHub renders them in the repo.

---

## 1. System architecture

Core principle made visual: **AI appears in exactly one layer** (extraction, left).
Everything to the right of the extraction contract is deterministic TypeScript.
Indicators and findings are derived on every read and never persisted — the store
holds only `evidence`, `actions`, and `meta.anchor`.

```mermaid
flowchart TD
  subgraph docs["Documents (seed_docs/ or user upload)"]
    PDF["E_electricity_bills_2025.pdf"]
    XLSX["S_payroll_headcount_2025.xlsx"]
    DOCX["G_anti_bribery_policy.docx"]
  end

  subgraph extract["EXTRACTION LAYER - the only place AI exists"]
    BILLS["lib/extract/bills.ts\nGemini vision, temp 0"]
    PAY["lib/extract/payroll.ts\nSheetJS - NO AI"]
    POL["lib/extract/policy.ts\nmammoth + Gemini text"]
  end

  PDF --> BILLS
  XLSX --> PAY
  DOCX --> POL

  CONTRACT["EXTRACTION CONTRACT\nEvidence[] - one shape for all three paths\nsource_ref + confidence on every row"]
  BILLS --> CONTRACT
  PAY --> CONTRACT
  POL --> CONTRACT

  SEED["scripts/extract-seed.mjs\nrun once, commit seed/evidence.json"]
  CONTRACT -.-> SEED

  subgraph store["PERSISTED STATE - lib/store.ts\nfile backend (dev) / Upstash Redis (Vercel)"]
    EV[("evidence")]
    ACT[("actions")]
    META[("meta.anchor")]
  end

  CONTRACT -->|"replaceEvidenceForFile()"| EV
  SEED -.->|"first boot"| EV

  subgraph derived["DERIVED ON EVERY READ - never persisted"]
    RULES["lib/rules.ts\n12 pure rules + visible scoring"]
    IND["indicators\ngreen / amber / red"]
    FND["findings\nranked by score"]
  end

  EV --> RULES
  RULES --> IND
  RULES --> FND

  subgraph ui["PAGES"]
    DASH["/ dashboard"]
    PRI["/priorities"]
    ACTP["/actions"]
    REP["/report"]
    UPL["/upload"]
  end

  IND --> DASH
  FND --> PRI
  PRI -->|"create action\n(suggested owner + due date)"| ACT
  ACT --> ACTP
  ACT --> REP
  IND --> REP
  FND --> REP

  UPL -->|"POST /api/ingest\n(re-scan)"| CONTRACT
  RULES -.->|"rule stopped firing ->\naction resolved_verified"| ACT

  SOL["/api/anchor\nsha256(canonical report) ->\nSolana memo tx (devnet)"]
  REP -->|"Anchor / Verify"| SOL
  SOL --> META
```

Reading notes for the builder:

- The **extraction contract** box is the interface everything hangs off. The three
  extractors and the rules engine can be built in parallel because both sides code
  against `Evidence[]`, never against each other.
- The **seed path** (dotted) means the app never depends on live AI to function:
  first boot loads `seed/evidence.json`; live extraction only happens via /upload.
- The dotted edge from rules to actions is the auto-verify: no user input, purely
  "the finding disappeared, therefore the action is verified resolved".
- `meta.anchor` is written only by /api/anchor and read only by /report.

---

## 2. Logical ERD

The store is a JSON blob (file or one Redis key), not SQL — but the logical model
is still relational and Claude Code must respect it. Solid entities persist;
`FINDING` and `INDICATOR` are **virtual** (recomputed by `runRules(evidence)` on
every read, never written anywhere). `ACTION.finding_rule_code` is a soft foreign
key into that virtual set — this is what makes auto-verify a set-diff instead of
a state-sync problem.

```mermaid
erDiagram
  EVIDENCE {
    string id PK
    string source_file "E_electricity_bills_2025.pdf"
    string source_ref "page 6 | Payroll Dec 2025!I14 - never empty"
    string pillar "E | S | G"
    string field "see field catalog in CLAUDE.md"
    string value "always string, parse at use site"
    string unit "kWh | RM | person | date | bool | text"
    string period "2025-08 | 2025 | null"
    string confidence "verified | estimated | inferred"
    string note "e.g. reading type ANGGARAN"
  }

  INDICATOR {
    string code PK "E1_ELECTRICITY - VIRTUAL, derived"
    string pillar
    string label
    string value
    string unit
    string status "green | amber | red"
    string coverage_note "8 of 12 months verified..."
  }

  FINDING {
    string id PK "VIRTUAL - recomputed every read"
    string rule_code "S-WAGE - stable identity for actions"
    string indicator_code FK
    string title
    string detail "plain English, cites source_refs"
    int severity "1 | 2 | 3"
    int customer_asked "always 1 in this dataset"
    int quick_win "0 | 1"
    float score "sev x asked x quickwin - printed in UI"
  }

  ACTION {
    string id PK
    string finding_rule_code FK "soft FK to virtual FINDING.rule_code"
    string title
    string owner "free text, suggested by lib/suggest.ts"
    string next_step
    string due_date "ISO, suggested: sev3+3d sev2+7d sev1+14d"
    string status "open | in_progress | done | resolved_verified"
    string resolved_by "manual | rescan | null"
    string created_at
  }

  META_ANCHOR {
    string hash "sha256 of canonical report JSON"
    string signature "Solana devnet tx signature"
    string anchored_at "ISO timestamp"
  }

  EVIDENCE }o..o{ FINDING : "rules derive from"
  INDICATOR ||..o{ FINDING : "groups"
  FINDING ||--o| ACTION : "promoted to"
```

Integrity rules the code must enforce (there is no database to do it):

1. `EVIDENCE.source_ref` is never empty — a fact you cannot point back to is not
   evidence and must be rejected at ingest.
2. An `INDICATOR` is green only if every supporting `EVIDENCE` row has
   `confidence = verified` AND no finding touches it. One estimated row → amber.
3. `ACTION.finding_rule_code` must equal the `rule_code` of the finding it was
   created from; auto-verify depends on this key being stable across re-scans.
4. `FINDING` and `INDICATOR` are never written to the store. If you find yourself
   persisting them, you are building the staleness bug this design exists to avoid.

---

## 3. Re-scan auto-verify sequence (the demo centerpiece)

Deterministic end to end — the payroll path contains no AI, so this behaves
identically on every run.

```mermaid
sequenceDiagram
  actor U as User
  participant UP as /upload page
  participant API as POST /api/ingest
  participant EX as extract/payroll.ts (SheetJS)
  participant ST as lib/store.ts
  participant RU as lib/rules.ts

  U->>UP: drop S_payroll_..._FIXED.xlsx, docType=payroll
  UP->>API: multipart file + docType
  API->>ST: getStore()
  API->>RU: before = runRules(evidence)
  Note over RU: before contains S-WAGE
  API->>EX: parse workbook
  EX-->>API: Evidence[] (new payroll rows)
  API->>ST: replaceEvidenceForFile("payroll", newRows)
  Note over ST: replacement keys on docType,<br/>so _FIXED still replaces the original
  API->>RU: after = runRules(evidence)
  Note over RU: S-WAGE absent - salaries now >= 1700.<br/>S-RECON, S-BLANK, S-DUP still fire
  API->>ST: for each open action:<br/>rule in before AND not in after<br/>-> status=resolved_verified, resolved_by=rescan
  API-->>UP: { resolved: ["S-WAGE"], stillOpen: ["S-RECON","S-BLANK",...] }
  UP-->>U: toast: "S-WAGE no longer detected -<br/>action resolved, verified by re-scan"
```

The precision matters as much as the resolution: findings that still fire leave
their actions untouched. In the demo, exactly ONE action flips — that is the
proof the system checks data rather than optimism.

---

## 4. Deployment topology (one paragraph, no diagram needed)

One Next.js app on Vercel. API routes are the entire backend. Persistence is a
single Upstash Redis key in production (`STORAGE_BACKEND=redis`) because Vercel's
filesystem is read-only and lambdas don't share memory; locally it's
`data/store.json` (`STORAGE_BACKEND=file`). External calls: Gemini (extraction
only, seed-first), Solana devnet RPC (anchor/verify only, cached-signature
fallback). No other services exist.
