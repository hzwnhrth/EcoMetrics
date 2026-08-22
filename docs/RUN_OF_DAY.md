# RUN OF DAY — DevLeague 2026, Lab 3

Team of 3. Build session 09:30–16:30. Submission deadline 16:30 SHARP — one minute
late is rejected. Open-floor demo 16:45–17:15 (do it — People's Choice is $450).

## Roles

- **A — Lead / Pipelines (Fiqri):** Claude Code driver for extraction (Gemini PDF +
  DOCX paths), Solana anchor, Vercel deploy, env vars. Owns the repo.
- **B — Data & Rules:** SheetJS payroll parser, `lib/store.js`, the 12 rules +
  scoring, re-scan/auto-resolve pipeline, seed generation.
- **C — UI & Story:** the five pages (dashboard first), report + print stylesheet,
  Devpost/Superteam write-ups, records the video with A narrating (or Fiqri records
  himself per plan — then C owns the write-ups and slides for open floor).

Everyone codes against the extraction contract agreed in the first 30 minutes.

## Before 09:30 (allowed prep — accounts and data, not code)

- [ ] Create Vercel account, connect GitHub org/repo access
- [ ] Gemini API key created and tested with one curl
- [ ] Resend account (optional, only if email send is attempted)
- [ ] Generate Solana devnet keypair, airdrop, CONFIRM balance ≥ 0.1 SOL
      (faucet rate-limits — do not leave this for the afternoon)
- [ ] The 4 mock files + BUILD_SPEC.md + VIDEO_SCRIPT.md on every laptop
- [ ] Devpost accounts created for all 3 members (rule requirement)
- [ ] Phone/mic test for video narration

## Timeline

| Time | A (Lead/Pipelines) | B (Data & Rules) | C (UI & Story) |
|---|---|---|---|
| **09:30–10:00** | Init repo, Next.js + Tailwind + shadcn, push, **deploy empty skeleton to Vercel**, set env vars | Agree extraction contract with A; scaffold `lib/store.js` | Sketch the 5 pages on paper; set up shadcn theme, layout shell |
| **10:00–11:00** | Gemini extraction: bills PDF → contract JSON | SheetJS payroll parser → contract JSON; rules engine skeleton | Dashboard with hardcoded fake data |
| **11:00–11:30** | DOCX path (mammoth → Gemini) | 12 rules + scoring printing findings to console | Priorities page, fake data |
| **11:30–12:00** | **CHECKPOINT 1:** run all three extractors, commit `seed/evidence.json`. Eat while it runs. | ← same | ← same |
| **12:00–13:00** | Solana anchor API route + verify | Wire rules → indicators/findings into store; suggested owner + due date | Dashboard + priorities on REAL seed. Kill all fake data |
| **13:00–14:00** | Anchor button + explorer link in UI; **anchor once for real, save signature** | Re-scan pipeline + auto-resolve | Actions page: badges, status control, digest preview modal |
| **14:00–14:30** | **CHECKPOINT 2:** full demo path walked once by all 3, on the DEPLOYED url, not localhost | Fix what broke | Report page + print stylesheet |
| **14:30** | **FEATURE FREEZE.** Only bug fixes past this line. | | |
| **14:30–15:15** | Support video with live app | Bug fixes only | **Fiqri records the 3-min video** (script in VIDEO_SCRIPT.md). Two takes max |
| **15:15–15:50** | README: setup, run, env vars, architecture paragraph | Final data sanity pass | **Devpost form filled and SUBMITTED by 15:50**, then Superteam Earn submission |
| **15:50–16:20** | Buffer — re-verify deployed URL works logged-out/incognito | Buffer | Verify both submissions confirmed, video plays |
| **16:30** | Deadline. Should be irrelevant to you by now | | |
| **16:45–17:15** | **Open-floor demo** — run the live path, end on red-turns-green + anchor | Crowd wrangling | Talk to judges |

Golden rule: **submit at 15:50, not 16:29.** Devpost can be edited after submitting
in most hackathons; a missed deadline cannot.

## The live demo path (protect this above everything)

1. Upload three messy documents from a small Malaysian factory (10 seconds of story)
2. Dashboard: what we can prove vs what we can't — verified / estimated / missing
3. The policy reveal: exists, but draft, unsigned, 6 years stale, points to a
   register that doesn't exist → amber, never green
4. Priorities: minimum wage breach at the top, score arithmetic visible: 3 × 2 × 1.5 = 9.0
5. Create the action — owner Siti (HR), due in 3 days, suggested automatically
6. Re-upload the FIXED payroll file → S-WAGE action flips to "Resolved — verified
   by re-scan" → red turns green live. Say: "nobody clicked done — the system
   checked the data."
7. Anchor the report on Solana, show the explorer link: "and now nobody can quietly
   edit this report before the auditor sees it."

## Devpost submission checklist

- [ ] Lab identified: Lab 3 — Operational Sustainability & ESG
- [ ] GitHub repo link (README: what it is, setup, how to run, env vars, stack)
- [ ] Live demo link (Vercel URL, tested in incognito)
- [ ] Video ≤ 3:00 uploaded and playing
- [ ] Description: problem / solution / how it works / stack / target users
      (Malaysian SMEs facing customer ESG questionnaires) / what's unique
      (evidence-vs-assumption separation, explainable scoring, verify-by-rescan,
      tamper-evident Solana anchor)

## Superteam Earn (Solana) checklist

- [ ] Read the listing requirements FIRST (they may want a specific format/wallet)
- [ ] Same repo + video links
- [ ] One paragraph on the Solana integration: devnet memo-program anchoring of the
      report hash, verify endpoint, why tamper-evidence fits ESG (auditability,
      not offsets)
- [ ] Transaction signature + explorer link pasted as proof it ran

## If things go wrong

- Gemini down/slow → app already runs on committed seed; say "loaded from saved
  extraction" (true, and labelled)
- Devnet down → show the cached morning anchor signature + explorer page,
  labelled "anchored earlier today" (true)
- Vercel build broken at 14:00 → roll back to last green deploy, demo that; local
  only as last resort with run instructions in README
- Behind at 14:00 → cut report polish and email send. Never cut auto-verify or
  the anchor
