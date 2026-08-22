# GreenReceipt — QA Review Fixes

**Source:** QA walkthrough, 14:02–14:43, with screenshots
**Current build:** https://claude.ai/public/artifacts/29f0aeb2-50d2-4d4b-88bb-c65c7cf02e1d
**Mock company:** Sinaran Precision Sdn Bhd, No. 12 Jalan Utarid U1/17, Seksyen U1, 40150 Shah Alam, Selangor
**Current data volume:** 428 evidence rows (E: 40, S: 372, G: 16) — 426 verified, 1 estimated, 1 inferred
**Current nav:** Dashboard · Priorities · Actions · Report · Upload

**Guiding principle from QA:** *"Any rank should understand how to use this application."* An intern with no ESG background must open the app and know what to do. QA was not able to do this on several screens.

---

## P0 — Blocking

### 1. Priorities page suggests nothing
**Screen:** Priorities. **QA:** *"There is no suggested actions to be done here… that's the gist of this application."*

The page ranks 12 findings and gives each a **Create action** button — but the button opens a form with a blank **Next step** field. The app identifies the problem and then asks the user to figure out the fix themselves. That inverts the whole value proposition.

Fix:
- Every finding must carry a **pre-written suggested next step**, generated from the finding type and the evidence. Show it inline on the priority row, not only inside the modal.
- Pre-fill the modal's `Next step` field with that suggestion so the user edits rather than authors.
- Examples matching current findings:
  - `S-WAGE` → "Adjust January payroll run for SP-0009 and SP-0010 to RM1,700 minimum."
  - `S-INDUCT` → "Schedule safety induction for SP-0010 and SP-0036, then upload the signed attendance record."
  - `G-UNSIGNED` → "Route ABC policy v1.1 to the Managing Director for signature and name a Compliance Officer in the document control table."
  - `E-GAP` → "Request TNB bills for 2025-03, 2025-04 and 2025-09 for account 22014567890."

### 2. Explain the score formula
**Screen:** Priorities. Rows currently show a bare `3 × 2 × 1.5 = 9.0`.

- The header text explains it once (`severity × customer-asked × quick-win`) but the numbers are unlabelled at row level.
- Add a hover/tap breakdown per row: `Severity 3 (high) × Asked by customer 2 (yes) × Quick win 1.5 = 9.0`.
- Or drop the raw arithmetic and show a plain badge — `Priority 9.0 · High severity · Quick win` — with the formula behind an info icon.

### 3. Owner field must be a dropdown
**Screen:** Create action modal. **QA:** *"there should be a drop-down menu box for existing users."*

The `Owner` field is currently a text input pre-filled with `HR Manager (Siti Aishah)`. Replace with a select populated from the seeded user list, showing name + role. Keep the suggested owner as the default selection.

> Correction to earlier reading of this note: this is about the **action owner picker**, not a login screen user picker. A demo login picker is still worth having (see item 5) but it is a separate item.

### 4. "What we cannot prove" is being misread
**Screen:** Dashboard. **QA read the heading as "approve" and asked "Who cannot approve?"**

That misreading is the finding. The section lists gaps where no source document exists (`S-INDUCT`, `S-WAGE`, `G-UNSIGNED`, `S-ABSENT`), but the name reads like a permissions panel.

Fix:
- Rename to something unambiguous — **"Gaps with no evidence"** or **"Claims we can't back up yet"**.
- Add a one-line subtitle: *"These findings have no source document, so we cannot verify them either way. Missing is not the same as zero."*
- Each row should say what document would close the gap.

### 5. Authentication and roles
No login exists; the nav goes straight to Dashboard with no user menu.

- Implement **sign up / login / logout**.
- **Route guard:** unauthenticated users cannot reach Dashboard, Priorities, Actions, Report or Upload — redirect to login.
- Add a **demo user dropdown** on the login screen so judging doesn't need typed credentials.
- Seed three users on the three test emails (see item 11) with distinct roles.

Proposed role matrix — **confirm before building**:

| Role | View | Upload | Create/edit actions | Change action status | Sign off report |
|---|---|---|---|---|---|
| Owner / MD | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager (e.g. HR Manager) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Staff / Intern | ✅ | ✅ | ❌ | ❌ | ❌ |

Where a control is unavailable, grey it out with a tooltip explaining why — do not hide it silently.

### 6. Seed data + CRUD
- No CRUD fixtures exist. Add a seed file covering users, the 428 evidence rows, 12 findings and current actions.
- Full create / read / update / delete on evidence rows and actions.
- Add a **Reset demo data** button so the demo can be re-run cleanly.

---

## P1 — Chart and comprehension fixes

### 7. Put values on the charts
**Screens:** Environment card, Social card. **QA:** *"put small info in the graph"*, *"in between graph put small value"*, *"buat graph supaya budak sekolah boleh faham."*

- **Electricity consumption (E):** 12 monthly bars, no values at all. Add the kWh figure above or inside each bar. Label the missing months (M, A, S) with "No bill" rather than leaving a blank grey stub.
- **Headcount (S):** the three bars already show 45 / 43 / 42 at the right — good, keep that pattern. Add the *gap* explicitly: "HR system says 45, payroll register says 43 — 2 people unaccounted for."
- **Training hours (S):** the green/red split bar needs `31` and `12` printed inside the segments, not only in the caption below.
- **Minimum wage waffle (S):** 43 squares, 2 red. Add a count label — "41 compliant · 2 below RM1,700" — beside the grid, and make each square hoverable to show the staff ID.
- **Evidence health donut:** `428 ROWS` in the centre is fine, but the legend numbers (426 / 1 / 1) need a plain caption: *"426 rows trace to a source document. 2 do not."*
- Every chart gets a one-sentence plain-language caption stating what it means and why it's amber or red.

### 8. Decode the finding codes
**Screen:** Priorities. **QA:** *"add what S or E or G means above it, for those interns that don't understand."*

Codes like `S-WAGE`, `E-GAP`, `G-UNSIGNED`, `E-SCOPE` appear with no key.

- Add a pillar legend above the list: **E — Environmental** (energy, emissions, waste) · **S — Social** (staff, wages, safety, training) · **G — Governance** (policies, approvals, controls).
- Make each code a tooltip: `S-WAGE — Social · statutory minimum wage compliance`.
- Colour-code the pillar badge consistently with the pillar cards (green / amber / blue).

### 9. Layout at scale
**Screen:** Governance card. **QA:** *"if there is more data? then does it go vertically or horizontally?"*

The Governance card lists 3 failed control checks with 16 evidence rows behind it. At 100+ checks the current layout breaks.

- Decide and implement: **vertical scroll with a capped preview** — show top 5, then "Show all 47 checks". Never horizontal sprawl.
- Same treatment for Priorities (12 findings today) and the Actions table.
- Add sort and filter on the Actions table (by owner, status, due date, pillar).

### 10. Narrow-viewport rendering bug
One screenshot shows the Priorities list rendered in a ~150px column with every row's text clipped mid-word. Whatever container that is, it isn't responsive. Fix the breakpoint and test at 375px, 768px and 1440px.

---

## P2 — Workflow and output

### 11. Reminders must fire automatically
**Screen:** Reminder email digest modal. It currently says *"1 email would be sent. Preview only — no mail leaves this app."* and only opens when the user clicks **Email digest**.

**QA:** *"why do they need to trigger it themselves to be reminded? that should be the application job."*

- Auto-trigger on due-date proximity: 7 days before, 1 day before, on the due date, then overdue.
- Send real email, not a preview.
- Route to the assigned owner. Keep the manual button as an admin override only.
- Seed data uses due dates of 2026-08-23 and 2026-08-25 against today's 2026-08-22, so "Due soon" fires immediately — good for demo, keep it.

**Test accounts:**
| Email | Suggested role | Maps to |
|---|---|---|
| fiqrinewofficial@gmail.com | Owner / MD | Managing Director |
| hay733x@gmail.com | Manager | HR Manager (Siti Aishah) |
| izzatsamsuddin@gmail.com | Staff / Intern | — |

### 12. Upload must move the numbers, and prove it
**QA:** *"lets have a document to test that it will update or not, for example updating the wages for the staff."*

- Ship a **test document** in the repo: a revised December payroll showing SP-0009 and SP-0010 raised to RM1,700.
- Uploading it must re-run the 12 rules, close the `S-WAGE` finding, auto-resolve the linked action, and lift the Social score.
- Show a post-upload diff: *"1 finding closed, 1 action auto-resolved, Social score +6, 2 new evidence rows verified."*

### 13. Re-open semantics
**QA:** *"What if it is already done? but we updated here to open? will it update again or do we need to upload again?"*

The Actions header already promises *"auto-resolved when a re-scanned file makes the finding disappear"* — so the auto-close path exists. The undefined path is manual re-open.

Proposed rule — **confirm before building**:
- Status is derived from the latest evidence; manual override is allowed but recorded.
- Manually re-opening a resolved action sets it to `Open — needs re-verification` and does **not** silently re-run analysis on old files.
- The next relevant upload re-evaluates it and may auto-close it again.
- Audit trail on every status change: who, when, manual vs system.

### 14. Duplicate actions from one finding
The Actions table currently holds both *"Raise salaries to RM1,700 minimum"* and *"Salaries below statutory minimum wage"* — both tagged `S-WAGE`, both owned by HR Manager. One finding has produced two actions.

- Enforce one open action per finding code, or explicitly support sub-tasks with a parent link.
- If an action already exists, the Priorities row should show **View action** instead of **Create action**. (One row already shows "action exists" as plain grey text next to a live Create action button — that's the bug surfacing.)

### 15. Report framework alignment
**Screen:** Report. **QA:** *"Is this the correct report format to give to a company? since we are targeting SMEs, it should be using this ESG framework."*

The report currently has: company header, pillar summary, top 5 findings with scores, actions table, and Solana devnet anchoring with tx hash + explorer link. Structure is sound; the framework mapping is missing.

Candidate frameworks:
- **Bursa Malaysia Simplified ESG Disclosure Guide (SEDG)** — built for SMEs in listed-company supply chains. Probably the right default.
- **BNM Value-based Intermediation Financing and Impact Assessment Framework (VBIAF)** — QA named this one; relevant only if Sinaran Precision uses Islamic financing.
- **SME Corp Malaysia ESG guidance** — lightest touch.

Fix: pick one primary, map each pillar section to its named indicators, and print the framework name and version in the report header. ⚠️ Verify the current indicator list before hardcoding field names — do not rely on model recall for this.

### 16. Product naming
**QA:** *"Should be named something else"* — pointed at the **GreenReceipt / EVIDENCE & ACTION** logo lockup.

Separately, the naming is already inconsistent across screens:
- Logo: `GreenReceipt — Evidence & Action`
- Nav bar: `ESG Evidence & Action`
- Report title: `ESG Questionnaire Response — Evidence & Action Report`

Pick one name and apply it everywhere. ❓ QA didn't say what to rename it *to* — needs a decision.

### 17. Date format consistency
The Create action modal uses `25/08/2026`; the Actions table and report use `2026-08-25`. Standardise — recommend `25 Aug 2026` for display, ISO in data.

---

## Decisions needed before coding

1. **New product name** (item 16) — QA rejected GreenReceipt but proposed nothing.
2. **Role matrix** (item 5) — confirm, especially whether interns can upload.
3. **Primary framework** (item 15) — does Sinaran Precision use Islamic financing? That decides VBIAF vs SEDG.
4. **Re-open rule** (item 13) — confirm the proposal.

---

## Already working — don't regress

- Solana devnet anchoring is surfaced in the report with tx hash and explorer link, plus **Re-anchor report** and **Verify against anchor** buttons. QA didn't comment on it, so make sure the redesign keeps it visible — it's the Lab 3 differentiator.
- Evidence counts reconcile correctly across pillars (40 + 372 + 16 = 428).
- The proposed Actions redesign noted in one screenshot — owner avatars and due-date badges instead of plain text — is a good call. Keep it.
