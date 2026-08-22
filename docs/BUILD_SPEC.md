# BUILD SPEC — ESG Evidence & Action Tool (final)

Lab 3, DevLeague 2026. Team of 3. Build window 09:30–16:30, feature freeze 14:30.
Hand the relevant sections of this file to Claude Code. The "Do NOT build" list is
as important as the feature list.

**Product in one sentence:** upload three messy company documents, see what you can
prove and what you can't, turn every gap into an owned, dated, tracked action — and
anchor the final report on Solana so nobody can quietly edit it later.

---

## 1. Tech stack (final, closed list)

| Piece | Choice | Notes |
|---|---|---|
| App | Next.js (App Router) + Tailwind | API routes are the entire backend |
| UI kit | shadcn/ui | Clean by default; chase the Best UI/UX prize with ONE polished screen (dashboard) |
| Excel parsing | SheetJS (`xlsx`) | **No AI on the Excel file.** Deterministic, instant, zero hallucination |
| DOCX to text | mammoth | Text then goes to Gemini |
| PDF extraction | Gemini API (vision) | Seed-first: live extraction is a demo bonus, never a dependency |
| Persistence | One JSON file `data/store.json` via `lib/store.js` | No DB server, no ORM |
| Blockchain | `@solana/web3.js`, devnet, Memo program | Server-side keypair. NO wallet adapter |
| Email | On-screen digest preview; Resend free tier only if time allows | Never SMTP, never cron |
| Export | Print stylesheet + `window.print()` | Browser makes the PDF |
| Deploy | Vercel, hour 1, empty skeleton first | Every push auto-deploys |

**Do NOT build:** auth, user accounts, database server, ORM, migrations, Redux/Zustand,
Docker, tests, cron jobs, SMTP config, chart libraries, wallet-adapter UI, settings page.

---

## 2. Data model — four tables + one meta key

Storage is `data/store.json`, accessed only through `lib/store.js` exposing:
`getEvidence, getIndicators, getFindings, getActions, saveAction, updateActionStatus,
replaceEvidenceForFile, getMeta, setMeta`.

### `evidence` — the spine
One row per fact. Provenance columns matter more than value columns.

| Column | Notes |
|---|---|
| `id` | |
| `source_file` | `E_electricity_bills_2025.pdf` |
| `source_ref` | `page 6` or `Payroll Dec 2025!I14` |
| `pillar` | `E` / `S` / `G` |
| `field` | `electricity_kwh`, `basic_salary`, `policy_next_review` |
| `value` | stored as text, parsed at use site |
| `unit` | `kWh`, `RM`, `person`, `date`, `bool` |
| `period` | `2025-08`, `2025`, or null |
| `confidence` | `verified` / `estimated` / `inferred` |
| `note` | e.g. "reading type ANGGARAN" |

### `indicators`
`id, code, pillar, label, value, unit, status(green|amber|red), coverage_note`

An indicator is **green only if every supporting evidence row is `verified`**.
One estimated input drags it to amber. Do not soften this rule.

### `findings`
`id, rule_code, indicator_code, title, detail, severity(1-3), customer_asked(0|1),
quick_win(0|1), score`

### `actions`
`id, finding_id, title, owner, next_step, due_date,
status(open|in_progress|done|resolved_verified), resolved_by(manual|rescan|null),
created_at`

### `meta`
`{ "anchor": { "hash": "...", "signature": "...", "anchored_at": "..." } | null }`

---

## 3. Extraction — what to pull from each document

Rule: **if no rule consumes the field, don't extract it.**

All three paths emit the SAME JSON shape (the extraction contract):

```json
{
  "source_file": "E_electricity_bills_2025.pdf",
  "evidence": [
    { "source_ref": "page 6", "pillar": "E", "field": "electricity_kwh",
      "value": "31900", "unit": "kWh", "period": "2025-08",
      "confidence": "estimated", "note": "Reading type ANGGARAN" }
  ]
}
```

**Bills (PDF → Gemini vision), 6 fields per page:** period, kWh, account number,
site address, reading type (SEBENAR → verified, ANGGARAN → estimated), total RM.

**Payroll (XLSX → SheetJS, no AI):** per staff row: staff_id, department, gender,
nationality, basic_salary, training_hours (blank stays null — never coerce to 0),
safety_induction, date_joined, date_left, employment_type. Plus the hand-typed
headcount from the Summary sheet (confidence `inferred` — someone typed it in).

**Policy (DOCX → mammoth → Gemini text), ~10 fields:** title, issue_date, version,
is_draft, approved_by (empty?), owner (placeholder?), last_review, next_review,
referenced_documents[], reporting_channel, commitments[] (e.g. "training within 3 months").

**Extractor rules:** never invent a value — omit the row instead of emitting 0 or
"unknown"; always fill `source_ref`; document says estimate → `confidence: estimated`.

**Seed-first:** run all three extractions once early, commit output as
`seed/evidence.json`. App boots from seed. Live extraction is a button, not a dependency.

---

## 4. Rules engine — 12 pure functions, no AI, no network

| Code | Detects | Sev | Default owner | Quick win |
|---|---|---|---|---|
| `E-GAP` | Months with no bill in range | 2 | Admin/Finance Exec | 1 |
| `E-EST` | Evidence with `confidence=estimated` | 2 | Admin/Finance Exec | 1 |
| `E-SCOPE` | >1 account number or site | 1 | Admin/Finance Exec | 0 |
| `S-WAGE` | basic_salary < 1700 | **3** | HR Manager | 1 |
| `S-INDUCT` | safety_induction = No | **3** | HR Manager | 1 |
| `S-RECON` | Headcount figures disagree | 2 | HR Manager | 1 |
| `S-BLANK` | Required field blank | 2 | HR Manager | 1 |
| `S-DUP` | Duplicate staff ID | 1 | HR Manager | 1 |
| `S-ABSENT` | Expected indicator has zero evidence | 2 | HR Manager | 0 |
| `G-STALE` | next_review in the past | 2 | Managing Director | 0 |
| `G-UNSIGNED` | Approval/signature empty | **3** | Managing Director | 1 |
| `G-ORPHAN` | Referenced doc never provided | 2 | Managing Director | 1 |

**Score** = `severity × (customer_asked ? 2 : 1) × (quick_win ? 1.5 : 1)`
**Print the arithmetic under every ranked item**: `3 × 2 × 1.5 = 9.0`.
For the demo dataset, set `customer_asked = 1` on all rules (the scenario is a
customer questionnaire; everything here is asked).

**Due date suggestion** (editable): severity 3 → today+3d, sev 2 → today+7d,
sev 1 → today+14d, all capped at the questionnaire deadline (today+14d).
Pitch line: "everything is due before the customer's deadline — by construction."

**Owner suggestion** (editable dropdown): the four roles above; populate names from
the payroll file where possible (e.g. Siti Aishah — HR).

---

## 5. Action lifecycle and auto-verify

States: `open → in_progress → done`. Two ways to close:

1. **Manual** — user ticks it (`resolved_by: manual`).
2. **Re-scan verify** — user re-uploads a corrected file. Pipeline:
   `replaceEvidenceForFile(file)` → re-run all 12 rules → diff findings.
   Any OPEN action whose underlying finding no longer fires flips to
   `resolved_verified` (`resolved_by: rescan`) with a timestamp. Show a toast:
   "S-WAGE no longer detected — action auto-resolved, verified by re-scan."
   Findings that still fire stay untouched — precision is the point.

Demo uses `S_payroll_headcount_2025_FIXED.xlsx` (salaries corrected, everything
else still broken) so exactly ONE action auto-resolves and the rest stay open.

**Due-status badges**, computed on page load, pure function of due_date vs today:
`Overdue` (red) / `Due soon` (≤3 days, amber) / `On track`.

**Email digest:** a button that renders the reminder email on screen — recipient,
overdue items, due-this-week items. Real send via Resend ONLY if core is done and
video is recorded; one hardcoded recipient, triggered by button, never a cron.

---

## 6. Solana anchor (MANDATORY — the Solana Lab entry)

**What it is:** tamper-evident ESG reporting. When the report is final, the app
hashes it and writes the hash to Solana. Anyone can later verify the report hasn't
been edited since it was filed. This is the honest use of blockchain here — it
strengthens the evidence story instead of greenwashing it. NOT an offset button.

**Implementation (server-side, ~60 lines total):**
- One devnet keypair, secret in env var `SOLANA_SECRET_KEY`. Fund via airdrop
  BEFORE 09:30 (devnet faucet rate-limits; do it early, confirm balance ≥ 0.1 SOL).
- API route `POST /api/anchor`:
  1. Build canonical report JSON (indicators + findings + actions, stable key order)
  2. `hash = sha256(json)`
  3. Send transaction with a Memo instruction
     (program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`) whose data is
     `ESGPROOF|v1|<hash>`
  4. Save `{hash, signature, anchored_at}` to `meta.anchor`
- UI: "Anchor report on Solana" button → shows tx signature + link to
  `https://explorer.solana.com/tx/<sig>?cluster=devnet`
- `POST /api/anchor/verify`: recompute hash from current data, fetch the memo from
  chain, compare, display MATCH (report untouched) or MISMATCH (report changed
  since anchoring). The MISMATCH path is demoable: anchor, then edit an action,
  then verify → mismatch. Honest by design.

**Failure plan:** anchor once successfully during the day and keep that signature.
If devnet is down during video/demo, show the cached signature and the explorer
page — clearly labelled as "anchored earlier today", which is true.

**Submission note:** Solana track = SEPARATE submission on Superteam Earn, in
addition to Devpost. Budgeted in the run-of-day.

---

## 7. Pages (five, no more)

1. `/` **Dashboard** — the polished one. Three pillar cards with traffic lights,
   evidence tally (verified / estimated / missing), per-indicator status with
   coverage notes. This screen carries the Best UI/UX prize attempt.
2. `/priorities` — findings sorted by score desc, arithmetic shown, "Create action"
   button pre-filled with suggested owner + due date.
3. `/actions` — list/board with owner, next step, due badge, status control,
   "verified by re-scan" markers, Email digest preview button.
4. `/report` — the one-pager: pillar summary, top 5 priorities, action statuses,
   evidence tally, anchor status + signature. Print stylesheet → Export button
   calls `window.print()`.
5. `/upload` — drop zone, list of ingested files, re-upload triggers re-scan.

Design rules: shadcn defaults, one accent color, status colors green/amber/red only,
no charts, no animation beyond the auto-resolve toast. Functionality over decoration.

---

## 8. Claude Code prompt (paste roughly this)

> Read BUILD_SPEC.md in the repo root. Build exactly what it specifies, in this order:
> 1. `lib/store.js` over `data/store.json`, seeded from `seed/evidence.json`
> 2. `lib/rules.js` — the 12 rules and scoring, pure functions, unit-testable via a
>    single `node scripts/run-rules.mjs` that prints findings to console
> 3. The five pages, dashboard first
> 4. Re-scan pipeline for re-uploaded files with auto-resolve
> 5. `/api/anchor` and `/api/anchor/verify` per section 6
>
> Constraints: no auth, no database server, no ORM, no Redux, no Docker, no tests,
> no cron, no extra tables, no extra pages. shadcn/ui components only. If a feature
> is not in BUILD_SPEC.md, ask before adding it.

Then integrate before asking Claude Code for anything else. When it offers to
"improve" something mid-build, the answer is no until step 5 of section 9 works.

---

## 9. Build order (each step runs before the next starts)

1. Skeleton deployed to Vercel (empty page is fine)
2. Store + seed loading; rules printing findings to console
3. Dashboard on real seed data
4. Priorities + create action; Actions page with badges
5. Re-upload re-scan + auto-resolve
6. Solana anchor + verify
7. Report page + print export
8. **Freeze. Video. Submissions.**

If it is 14:00 and step 5 is not done, cut step 7's polish, never step 6 —
Solana is a separate prize pool and a hard commitment.
