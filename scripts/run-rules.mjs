// Phase 3 acceptance test: loads seed/evidence.json, prints the findings
// table sorted by score desc, plus the indicators. Requires Node 23.6+.
//
//   node scripts/run-rules.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidence = JSON.parse(fs.readFileSync(path.join(root, "seed", "evidence.json"), "utf8"));
const users = JSON.parse(fs.readFileSync(path.join(root, "seed", "users.json"), "utf8"));

const { runRules, computeIndicators } = await import("../lib/rules.ts");
const { suggestAction } = await import("../lib/suggest.ts");

const today = new Date();
const findings = runRules(evidence, today);
const indicators = computeIndicators(evidence, findings);

console.log(`\n${findings.length} findings from ${evidence.length} evidence rows (today = ${today.toISOString().slice(0, 10)})\n`);
console.table(
  findings.map((f) => {
    const s = suggestAction(f, users, today);
    return {
      rule: f.rule_code,
      score: `${f.severity} × ${f.customer_asked ? 2 : 1}${f.quick_win ? " × 1.5" : ""} = ${f.score.toFixed(1)}`,
      title: f.title,
      owner: s.owner,
      due: s.due_date,
    };
  })
);

console.log("\nindicators:");
console.table(
  indicators.map((i) => ({
    code: i.code,
    status: i.status,
    value: `${i.value} ${i.unit}`,
    coverage: i.coverage_note,
  }))
);

for (const f of findings)
  console.log(`\n[${f.rule_code}] ${f.title}\n  ${f.detail}\n  → next step: ${f.suggested_step}`);

const fired = new Set(findings.map((f) => f.rule_code));
const ALL = ["E-GAP", "E-EST", "E-SCOPE", "S-WAGE", "S-INDUCT", "S-RECON", "S-BLANK", "S-DUP", "S-ABSENT", "G-STALE", "G-UNSIGNED", "G-ORPHAN"];
const missing = ALL.filter((r) => !fired.has(r));
console.log(`\n${fired.size} of 12 rules fired.` + (missing.length ? ` NOT FIRING: ${missing.join(", ")}` : " ✔ all 12."));
