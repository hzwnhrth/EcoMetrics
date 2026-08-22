# CLAUDE.md — ESG Evidence & Action Tool

You are building a hackathon project in ONE day. This file plus ARCHITECTURE.md
(system diagram, ERD, re-scan sequence — read it FIRST) form the complete
specification. Follow them exactly; if code and diagram disagree, the diagram
and this file win. Do not add features, tables, pages, or
dependencies that are not listed here. If something is ambiguous, ask the human
before building — do not pick silently.

## What this app is

A small Malaysian company received an ESG questionnaire from its biggest customer
and has two weeks to respond. The user uploads three messy documents (electricity
bills PDF, payroll Excel, anti-bribery policy Word doc). The app:

1. Extracts facts into an evidence table, each fact tagged with its source and a
   confidence level (verified / estimated / inferred)
2. Runs 12 deterministic rules to find gaps, inconsistencies, and compliance risks
3. Scores and ranks findings with visible arithmetic
4. Lets the user promote findings into actions with a suggested owner and due date
5. Auto-resolves actions when a corrected file is re-uploaded and the rule no
   longer fires ("verified by re-scan")
6. Anchors a hash of the final report on Solana devnet (tamper-evidence)

Design philosophy: **AI reads, code decides.** The LLM only converts documents to
JSON. Every rule, score, and ranking is deterministic TypeScript — explainable and
identical on every run.

---

## Hard constraints (violating these fails the build)

- NO auth, user accounts, sessions, or login
- NO database server, ORM, or migrations
- NO Redux/Zustand/Jotai — React state + server data only
- NO Docker during Phases 0–7 (an optional post-freeze Dockerfile exists as a
  separate task in DOCKER.md — never before Phase 7 is done), NO test framework,
  NO CI config
- NO cron jobs, NO SMTP
- NO wallet-adapter UI — Solana signing is server-side
- NO chart libraries — status is shown with colored badges and numbers
- NO extra pages beyond the five specified
- Dependencies allowed: next, react, tailwindcss, shadcn/ui components,
  xlsx (SheetJS), mammoth, @google/generative-ai, @solana/web3.js, bs58,
  @upstash/redis, lucide-react. Nothing else without asking.

---

## Stack and scaffold

- Next.js 15+, App Router, TypeScript (pragmatic — no strict-mode gymnastics)
- Tailwind + shadcn/ui (init with defaults; components: button, card, badge,
  table, dialog, select, input, toast/sonner, tabs)
- Node 20+

```
app/
  page.tsx                 # Dashboard
  priorities/page.tsx
  actions/page.tsx
  report/page.tsx
  upload/page.tsx
  api/ingest/route.ts      # POST file -> extract -> replace evidence -> re-run rules
  api/actions/route.ts     # POST create, PATCH update status
  api/anchor/route.ts      # POST anchor report hash on Solana
  api/anchor/verify/route.ts
lib/
  types.ts
  store.ts                 # single data-access module, dual backend
  rules.ts                 # 12 rules + scoring
  suggest.ts               # owner + due date suggestion
  canonical.ts             # stable stringify + sha256
  solana.ts
  extract/payroll.ts       # SheetJS, NO AI
  extract/bills.ts         # Gemini vision
  extract/policy.ts        # mammoth + Gemini text
scripts/
  extract-seed.mjs         # runs extractors on seed_docs/, writes seed/evidence.json
  run-rules.mjs            # prints findings table to console
seed_docs/                 # the 3 mock files (human provides)
seed/evidence.json         # committed extraction output
data/store.json            # local dev persistence only
```

Env vars (`.env.local`):
```
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash        # configurable; verify model name on the day
SOLANA_SECRET_KEY=                   # base58-encoded devnet keypair secret
UPSTASH_REDIS_REST_URL=              # prod persistence
UPSTASH_REDIS_REST_TOKEN=
STORAGE_BACKEND=file                 # "file" locally, "redis" on Vercel
```

---

## Data model (lib/types.ts)

```ts
export type Confidence = "verified" | "estimated" | "inferred";
export type Pillar = "E" | "S" | "G";

export interface Evidence {
  id: string;
  source_file: string;      // "E_electricity_bills_2025.pdf"
  source_ref: string;       // "page 6" | "Payroll Dec 2025!I14" — never empty
  pillar: Pillar;
  field: string;            // see field catalog below
  value: string;            // ALWAYS string; parse at use site
  unit: string;             // "kWh" | "RM" | "person" | "date" | "bool" | "text"
  period: string | null;    // "2025-08" | "2025" | null
  confidence: Confidence;
  note?: string;
}

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

export interface Store {
  evidence: Evidence[];
  actions: Action[];
  meta: { anchor: { hash: string; signature: string; anchored_at: string } | null };
}
```

Indicators and findings are NOT persisted — they are pure functions of evidence,
recomputed on every read. Only evidence, actions, and meta persist. This makes
re-scan trivial and eliminates staleness bugs.

---

## lib/store.ts — dual backend (CRITICAL)

Vercel's serverless filesystem is READ-ONLY and instances don't share memory.
A JSON file works locally but silently loses data in production. Therefore:

- `STORAGE_BACKEND=file` → read/write `data/store.json` (local dev)
- `STORAGE_BACKEND=redis` → the ENTIRE store is one Upstash key `"store"` via
  `@upstash/redis` REST client: `redis.get<Store>("store")` / `redis.set("store", s)`

Expose exactly: `getStore(): Promise<Store>`, `saveStore(s: Store): Promise<void>`,
plus helpers `replaceEvidenceForFile(source_file, rows)`, `addAction`,
`updateAction`, `setAnchor`. On first read with empty backend, initialize from
`seed/evidence.json` with `actions: []`, `meta: { anchor: null }`.

Last-write-wins is acceptable; do not build locking.

---

## Extraction — three paths, ONE output contract

Every extractor returns `Evidence[]` (without `id`; store assigns ids).
Never invent a value: if a field is absent from the document, emit no row —
never emit "0" or "unknown". Exception: the policy control-table fields, where a
visibly blank cell IS a fact — emit `value: ""` with `confidence: "verified"`.
Always fill `source_ref`.

### Field catalog (rules depend on these exact names)

E: `electricity_kwh` (per month), `account_number`, `site_address`, `bill_total_rm`
S (one set per staff row): `staff_id`, `department`, `gender`, `nationality`,
   `basic_salary`, `training_hours`, `safety_induction`, `date_joined`,
   `date_left`, `employment_type`; plus once: `hr_system_headcount`
G: `policy_title`, `policy_issue_date`, `policy_version`, `policy_is_draft`,
   `policy_approved_by`, `policy_owner`, `policy_last_review`,
   `policy_next_review`, `policy_referenced_doc` (one row per referenced doc),
   `policy_reporting_channel`, `policy_commitment` (one row per commitment)

### lib/extract/payroll.ts — SheetJS, deterministic, NO AI

Read sheet "Payroll Dec 2025". Header row is row 5; data rows 6 onward until
first empty Staff ID. For each staff row emit evidence rows for every NON-EMPTY
cell among the S fields, `source_ref` = `"Payroll Dec 2025!" + cellAddress`,
`confidence: "verified"`, `pillar: "S"`, `period: "2025-12"`.
- Blank cells: emit NOTHING (blank ≠ zero; rules detect absence)
- Trim department strings for display but store the RAW value (rules need the
  raw inconsistency)
- From sheet "Summary", find the row labeled "Headcount per HR system" and emit
  `hr_system_headcount` with `confidence: "inferred"` and
  note "typed manually, not reconciled"

### lib/extract/bills.ts — Gemini vision

Send the PDF as inline base64 to Gemini with `responseMimeType: "application/json"`,
temperature 0. Prompt (verbatim):

> You extract data from Malaysian electricity bills. The PDF has one bill per page.
> For EACH page return: page_number, billing_period as YYYY-MM, kwh_used (integer),
> account_number, site_address (single line), reading_type ("SEBENAR" or
> "ANGGARAN"), total_rm (number). Return ONLY a JSON array, one object per page.
> If a value is not present on a page, omit that key. Do not guess.

Map to Evidence: `electricity_kwh` with `confidence: reading_type === "ANGGARAN"
? "estimated" : "verified"`, note "reading type ANGGARAN" when estimated;
`account_number` and `site_address` per page; `source_ref: "page N"`;
`pillar: "E"`; `period: billing_period`.

### lib/extract/policy.ts — mammoth then Gemini

`mammoth.extractRawText` on the DOCX, send text to Gemini, temperature 0, JSON
response. Prompt (verbatim):

> You audit corporate policy documents. From the text, extract: title, issue_date
> (ISO), version, is_draft (true if any header/watermark says DRAFT),
> approved_by (the literal content of the Approved By field, "" if blank),
> owner (literal content, including unfilled placeholders like "[Insert name...]"),
> last_review_date ("" if blank), next_review_date (ISO or ""), referenced_documents
> (array of document/appendix names this policy refers to), reporting_channel
> (the email/phone for reports), commitments (array of promises the policy makes,
> e.g. training deadlines, acknowledgement records). Return ONLY a JSON object.
> Copy field contents literally. Do not infer or improve anything.

Map each to the G fields above, `source_ref: "document control table"` or the
section name, `confidence: "verified"` (you verified what the page says — even
when what it says is blank).

### Seed workflow

`scripts/extract-seed.mjs` runs all three extractors against `seed_docs/` and
writes `seed/evidence.json`. Human runs it once (~11:30), commits the output.
The app NEVER depends on live extraction to function.

---

## lib/rules.ts — 12 pure functions

Signature: `(evidence: Evidence[]) => Finding[]`. No network, no AI, no Date.now()
except where noted. `today` is passed in for testability.

Scoring: `score = severity * (customer_asked ? 2 : 1) * (quick_win ? 1.5 : 1)`.
Set `customer_asked = 1` for every rule (the scenario is a customer questionnaire).

| Code | Sev | QW | Logic (precise) |
|---|---|---|---|
| E-GAP | 2 | 1 | Primary account = account_number with most rows. Expected periods = 2025-01..2025-12. Missing = expected minus periods having electricity_kwh for primary account. Fire if any; list them. |
| E-EST | 2 | 1 | Any E evidence with confidence=estimated. List periods. |
| E-SCOPE | 1 | 0 | Distinct account_number values > 1. Name the extra site address. |
| S-WAGE | 3 | 1 | Any basic_salary with Number(value) < 1700. List staff_ids + amounts. Detail must mention "Minimum Wages Order 2024, RM1,700/month". |
| S-INDUCT | 3 | 1 | Any safety_induction with value "No". List staff_ids. |
| S-RECON | 2 | 1 | Compare: hr_system_headcount value, count of staff rows (rows having basic_salary), count of DISTINCT staff_id. Fire if not all equal; state all three numbers. |
| S-BLANK | 2 | 1 | Staff ids that have basic_salary but NO gender row; same for training_hours. Fire per field with counts. |
| S-DUP | 1 | 1 | Same staff_id value appearing with 2+ distinct source_refs. |
| S-ABSENT | 2 | 0 | Zero evidence rows for expected fields: lti_count, turnover — report as "no source document provided; unknown, not zero". |
| G-STALE | 2 | 0 | policy_next_review non-empty and date < today. State how overdue ("6 years"). |
| G-UNSIGNED | 3 | 1 | policy_approved_by is "" OR policy_is_draft is "true" OR policy_owner contains "[". Detail lists which of the three failed. |
| G-ORPHAN | 2 | 1 | Any policy_referenced_doc whose name does not fuzzy-match any uploaded source_file. |

Indicators (computed alongside): E1_ELECTRICITY (sum of verified kWh, coverage
note "X of 12 months verified, Y estimated, Z missing"), S1_HEADCOUNT,
S2_TRAINING, S3_WAGE_COMPLIANCE, G1_ABC_POLICY. Status rule: **green only if
every supporting evidence row is confidence=verified AND no finding touches the
indicator; amber if any estimated/inferred input or a sev-1/2 finding; red if a
sev-3 finding or zero evidence.** One estimated input drags green to amber —
never soften this.

`scripts/run-rules.mjs` loads seed/evidence.json, prints a console table of
findings sorted by score desc. This is the Phase 3 acceptance test.

## lib/suggest.ts

Owner by rule prefix: `S-` → "HR Manager (Siti Aishah)", `E-` → "Finance Exec",
`G-` → "Managing Director". Due date: sev 3 → today+3d, sev 2 → today+7d,
sev 1 → today+14d, all capped at today+14d (the questionnaire deadline). Both
are pre-filled defaults in the create-action dialog, editable before saving.

---

## Auto-verify by re-scan (the demo centerpiece)

`POST /api/ingest` with the uploaded file + docType (payroll|bills|policy):
1. Run the matching extractor → `newRows`
2. `before = runRules(store.evidence)`
3. `replaceEvidenceForFile(source_file_of_that_docType, newRows)` — replacement
   keys on docType, so `..._FIXED.xlsx` still replaces the payroll evidence
4. `after = runRules(store.evidence)`
5. For every action with status open|in_progress: if its `finding_rule_code` is in
   `before` but NOT in `after` → set `status: "resolved_verified"`,
   `resolved_by: "rescan"`. Actions whose rule still fires are untouched.
6. Respond with `{ resolved: [...rule codes...], stillOpen: [...] }`; UI shows a
   toast: "S-WAGE no longer detected — action resolved, verified by re-scan"

The payroll path has no AI in it, so this behaves identically every run.

---

## Solana anchor (lib/solana.ts + two API routes)

`lib/canonical.ts`: `stableStringify(obj)` — recursive, keys sorted
alphabetically; `sha256Hex(str)` via node:crypto.

`POST /api/anchor`:
1. Report object = `{ indicators, findings, actions }` (computed fresh)
2. `hash = sha256Hex(stableStringify(report))`
3. Connection to `https://api.devnet.solana.com`; keypair from
   `bs58.decode(process.env.SOLANA_SECRET_KEY)`
4. Transaction with ONE instruction: `new TransactionInstruction({ keys: [],
   programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
   data: Buffer.from("ESGPROOF|v1|" + hash) })`
5. `sendAndConfirmTransaction`, save `{hash, signature, anchored_at}` to meta
6. Return signature; UI renders link
   `https://explorer.solana.com/tx/{sig}?cluster=devnet`

`POST /api/anchor/verify`:
1. Recompute the hash from CURRENT data (same code path as step 1–2)
2. Compare with `meta.anchor.hash`
3. Return `{ match: boolean, anchoredHash, currentHash, signature }`
4. UI: MATCH → green "Report unchanged since anchoring"; MISMATCH → red
   "Report has been modified since it was anchored" — the mismatch path is a
   feature, demo it by editing an action after anchoring.

Wrap both routes in try/catch; on network failure return the cached
`meta.anchor` with `{ live: false }` so the UI can show "anchored earlier today".

---

## Pages

Shared layout: top nav with the five links + a small pill showing evidence tally
("32 verified · 1 estimated · 2 unknown"). Colors: green/amber/red for status
ONLY, one neutral accent for everything else. shadcn defaults. No animations
except the resolve toast.

1. **/ Dashboard** (the polished one — Best UI/UX entry). Three pillar cards
   (E/S/G), each with: traffic-light dot, indicator list with status badges and
   coverage notes, evidence tally. Below: "What we cannot prove" panel listing
   red items. Every indicator row clickable → dialog listing its evidence rows
   WITH source_file + source_ref (this is the provenance money-shot).
2. **/priorities** — findings sorted by score desc. Each card: title, detail,
   severity badge, and the score arithmetic printed literally, e.g.
   `3 × 2 × 1.5 = 9.0`. Button "Create action" → dialog pre-filled from
   lib/suggest.ts, editable, saves via POST /api/actions.
3. **/actions** — table: title, owner, next step, due date + computed badge
   (Overdue red / Due soon ≤3d amber / On track), status select
   (open/in_progress/done), "verified by re-scan" badge where resolved_by=rescan.
   Button "Email digest" → dialog rendering the reminder email as it would send:
   recipient per owner, overdue section, due-this-week section. (Real sending
   only if explicitly requested later.)
4. **/report** — one page: company header, pillar summary, top 5 findings with
   arithmetic, all actions with status, evidence tally, anchor block (hash,
   signature link, verify button + result). "Export" button = `window.print()`.
   Include `@media print` styles: hide nav/buttons, black on white, A4-clean.
5. **/upload** — drop zone + docType select (payroll/bills/policy), list of
   currently ingested files with row counts, calls /api/ingest, shows the
   resolved/stillOpen toast on completion.

---

## Build phases — run each as a SEPARATE Claude Code task, verify, then proceed

Do not let a later phase refactor an earlier one. `/clear` between phases.

**Phase 0 — Scaffold (target 20 min):** Next.js + Tailwind + shadcn init, layout
shell, empty pages, deploy to Vercel. DONE WHEN: Vercel URL renders the nav.

**Phase 1 — Types + store (20 min):** lib/types.ts, lib/store.ts dual backend,
seed loading. DONE WHEN: a scratch route dumps the seeded store as JSON both
locally (file) and on Vercel (redis).

**Phase 2 — Extractors + seed (45 min):** the three extractors +
scripts/extract-seed.mjs. DONE WHEN: seed/evidence.json exists, spot-checked:
August kWh row says estimated; policy approved_by is ""; payroll has no
training_hours rows for blank cells.

**Phase 3 — Rules (40 min):** lib/rules.ts + lib/suggest.ts +
scripts/run-rules.mjs. DONE WHEN: console shows ALL 12 rules firing on seed data,
S-WAGE and S-INDUCT and G-UNSIGNED at 9.0 on top.

**Phase 4 — Pages (90 min):** dashboard, priorities, actions on real data;
create-action flow works end to end on the DEPLOYED url. DONE WHEN: an action
created in the browser survives a hard refresh on Vercel.

**Phase 5 — Re-scan (30 min):** /api/ingest + upload page + auto-resolve.
DONE WHEN: uploading S_payroll_headcount_2025_FIXED.xlsx resolves ONLY the
S-WAGE action and the toast names it; all other actions stay open.

**Phase 6 — Solana (30 min):** anchor + verify + UI block on /report.
DONE WHEN: real devnet signature opens in explorer; editing an action then
verifying returns MISMATCH.

**Phase 7 — Report + digest + print (30 min):** DONE WHEN: browser print preview
of /report is one clean page; digest dialog groups by owner correctly.

If behind at 14:00: cut Phase 7 polish. Never cut Phase 5 or 6.
