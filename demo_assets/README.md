# Demo assets — corrected payroll files for the re-scan demo

Upload these on the **Upload** page as docType **Payroll**. The payroll path has
no AI in it, so the result is identical on every run. Start the demo clean:
sign in as the Managing Director and click **Reset demo data** first.

| File | What's fixed | What happens on upload |
|---|---|---|
| `S_payroll_headcount_2025_FIXED.xlsx` | SP-0009 & SP-0010 raised to RM1,700+ | **S-WAGE** closes, its action auto-resolves ("verified by re-scan"), Social score 63 → 72. Everything else stays open — the precision moment. |
| `S_payroll_headcount_2025_FIXED_ALL.xlsx` | Wages + safety inductions set to Yes + blank gender/training cells filled + duplicate SP-0031 row removed + HR headcount reconciled to 42 | **S-WAGE, S-INDUCT, S-RECON, S-BLANK, S-DUP** all close at once, Social score 63 → 96. **S-ABSENT stays open** — no payroll file can prove safety incidents or turnover, and the app refuses to pretend. |

For the video: use FIXED for the main beat (one fix → one resolution), and
FIXED_ALL as the optional finale (HR fixes everything → five findings close,
the app still keeps the honest gap open).
