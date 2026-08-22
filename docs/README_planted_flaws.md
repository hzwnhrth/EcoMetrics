# Mock ESG Data Pack — Answer Key

**Company:** Sinaran Precision Sdn Bhd — a fictional 42-person precision metal parts
manufacturer in Shah Alam, Selangor. It supplies a large multinational customer, and that
customer has just sent it an ESG questionnaire with a two-week deadline.

**Three documents, three file formats, three ESG pillars:**

| Pillar | Document | Format | What it proves |
|---|---|---|---|
| **E** — Environment | `E_electricity_bills_2025.pdf` | PDF (10 pages) | Energy use in kWh |
| **S** — Social | `S_payroll_headcount_2025.xlsx` | Excel (3 sheets) | Headcount, pay, training, safety |
| **G** — Governance | `G_anti_bribery_policy.docx` | Word (3 pages) | Anti-corruption controls |

Every document is deliberately imperfect. **The flaws are the point** — they are what your
app finds, scores, and turns into actions. A clean dataset would give you nothing to demo.

> All three files carry a visible "MOCK DOCUMENT — SYNTHETIC TEST DATA" footer. Keep it.
> A judge who spots fabricated-looking data with no label will distrust the whole demo;
> a clearly labelled sample reads as professional. Rates and figures are illustrative.

---

## E — Electricity bills (PDF)

Ten pages, one bill per page, styled as a TNB commercial electricity bill in Bahasa
Malaysia and English. Text extracts cleanly with `pdftotext` or any LLM vision call.

**Fields on each bill:** account no, contract no, name, address, tariff code, meter no,
bill date, billing period, due date, previous reading, current reading, **kWh used**,
maximum demand (kW), reading type, itemised charges, total RM.

### Planted flaws

| # | Flaw | What the app should say |
|---|---|---|
| 1 | **Mar, Apr and Sep 2025 bills are missing entirely** | "Only 9 of 12 months captured. Annual energy figure is incomplete — do not report it as a full-year total." |
| 2 | **Aug 2025 is marked `ANGGARAN` (estimated reading)** | "This month is an estimate, not a real meter reading. Treat as unverified." |
| 3 | **Aug 2025 shows 31,900 kWh vs a ~20,000 kWh norm** | "Consumption spike of ~55%. Likely an estimation artefact, not real usage." |
| 4 | **Page 9 is a different account (220198334521) at a Klang address, tariff C1** | "A second premises appears in the data. Is Klang in scope for this report? Nobody mentioned it." |
| 5 | Aug maximum demand is blank (`-`) | Minor: a field that exists on every other bill is absent here. |

**Numbers to expect:** 9 Shah Alam bills totalling **196,330 kWh**, of which **31,900 kWh
(16%) is estimated**. So only 164,430 kWh is genuinely evidence-backed, across 8 months.
That gap between "total" and "actually verified" is your best E demo moment.

**Carbon conversion:** multiply kWh by Malaysia's grid emission factor (roughly
0.55–0.76 tCO2e/MWh depending on year and source — cite whichever you use, and show the
factor on screen rather than hiding it).

---

## S — Payroll & headcount register (Excel)

Three sheets:

- **`Payroll Dec 2025`** — 43 staff rows, 14 columns (ID, name, department, gender,
  nationality, employment type, dates, salary, allowance, EPF, SOCSO, training hours,
  safety induction). EPF and SOCSO are live formulas.
- **`Summary`** — computed indicators. Hand-typed values are blue on yellow fill;
  calculated values are black. Ends with a **"NOT AVAILABLE IN THIS FILE"** block.
- **`Notes`** — a legend, plus known issues Finance flagged and nobody fixed.

### Planted flaws

| # | Flaw | Actual value | What the app should say |
|---|---|---|---|
| 1 | **Headcount does not reconcile** | HR system says **45**, file has **43 rows**, only **42 unique IDs** | "Three different headcounts. None can be trusted until reconciled." |
| 2 | **Duplicate Staff ID** | `SP-0031` appears twice | "Chong Ah Meng is counted twice, under two different department spellings." |
| 3 | **Gender field blank** | **4 staff** | "Gender split cannot be reported accurately. 4 people are excluded from the calculation." |
| 4 | **Training hours blank** | **12 staff** | "Blank means *not recorded*, not zero. Average of 12 hrs covers only 31 of 43 staff." |
| 5 | **Below statutory minimum wage** | **2 staff** at RM1,500 and RM1,620 | "Minimum wage is RM1,700/month. Two foreign contract workers are below it. Urgent." |
| 6 | **Safety induction not completed** | **2 staff** | "Two workers on the floor without induction." |
| 7 | **Department names inconsistent** | **9 labels** for 7 real departments | `Production` / `PRODUCTION` / `Prod.` / `Production ` (trailing space) |
| 8 | **Date Joined in three formats** | date, `"12/3/2021"`, `"Mar-2019"` | "Cannot compute average tenure — dates are not all dates." |
| 9 | **Resigned employee with no leave date** | `SP-0034` | "Turnover rate cannot be calculated." |
| 10 | **Whole indicators absent** | LTI count, turnover, overtime, union status | "No source document exists for these. Not zero — unknown." |

Flaw #5 is your strongest S demo moment: it is a real Malaysian legal exposure
(Minimum Wages Order 2024), found automatically, from a spreadsheet nobody had read
properly. That is exactly "from information to action."

---

## G — Anti-Bribery and Corruption Policy (Word)

A three-page policy: document control table, ten numbered sections, and a sign-off table.
Reads like a genuine SME policy because it *is* structured like one — which is the trap.
A naive tool ticks the box "Yes, they have an anti-bribery policy." A good tool reads it
properly and finds it is close to worthless as evidence.

### Planted flaws

| # | Flaw | Where | What the app should say |
|---|---|---|---|
| 1 | **Never reviewed** | Issued 15 Mar 2019, next review "March 2020", last review blank | "Six years overdue. Section 9 commits to annual review — that commitment has been broken." |
| 2 | **Not formally approved** | Header says `DRAFT FOR MANAGEMENT REVIEW` | "This is a draft, not an adopted policy." |
| 3 | **No signatures** | Sign-off table completely empty | "No director, compliance officer or HR signature. Nobody has owned this." |
| 4 | **Unfilled placeholder** | Document Owner = `[Insert name of Compliance Officer]` | "No named owner. The policy names a role that may not exist." |
| 5 | **References a missing appendix** | §4 points to "Appendix A" for the gift register; last line says "to be attached" | "The gift register the policy depends on does not exist. The control is not operating." |
| 6 | **Weak reporting channel** | §6 gives `spsb.report@gmail.com` | "Whistleblowing goes to a personal Gmail. Not confidential, not controlled." |
| 7 | **Unevidenced training commitment** | §7 promises training within 3 months and signed acknowledgements | "No training records and no signed acknowledgements were provided. Unverified claim." |
| 8 | **Outdated legal basis** | §1 says MACC s.17A *"will introduce"* corporate liability | "Written before s.17A came into force on 1 June 2020. The legal framing is stale." |

### Why G needs different logic from E

This is the design insight worth putting on a slide.

- **E is extraction** — read a number off the page, do arithmetic.
- **G is verification** — there is no number. The questions are: does the document exist,
  is it signed, how old is it, and is there any proof anyone follows it?

A policy with no signature, no owner, no review in six years and a missing appendix is
**"Yellow — exists but not operating"**, never green. Showing that distinction proves you
understood the brief's "separate what's verified from what's assumed" better than a team
that just counted carbon.

---

## Suggested traffic-light output

| Light | Meaning | Example from this pack |
|---|---|---|
| 🟢 **Green** | Answerable, evidence attached | Jan–Jul 2025 electricity: real meter readings, 7 bills |
| 🟡 **Yellow** | Claim exists, evidence weak, stale or partial | Anti-bribery policy: exists, unsigned, 6 years old |
| 🔴 **Red** | No evidence at all | Safety incident count: no document anywhere |

Every 🟡 and 🔴 becomes an action with an owner, a next step and a due date. That is the
whole product.

---

## Adding a fourth document later

If you have time after the core flow works, the highest-value additions are, in order:

1. **The customer's questionnaire itself** (Excel) — turns your app from "analyse my files"
   into "answer this specific form", which is a much sharper story.
2. **A water bill** — proves the E pipeline generalises beyond one bill format.
3. **A signed employee handbook** — gives you one genuinely 🟢 governance item, so the demo
   is not uniformly bad news.
