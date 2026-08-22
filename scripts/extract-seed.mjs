// Runs all three extractors against seed_docs/ and writes seed/evidence.json.
// Run once, commit the output — the app never depends on live extraction.
//
//   node scripts/extract-seed.mjs
//
// Requires Node 23.6+ (imports the .ts extractors via native type stripping)
// and GEMINI_API_KEY in .env.local (bills + policy paths).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// minimal .env.local loader (dotenv is not an allowed dependency)
const envFile = path.join(root, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY missing — bills and policy extraction need it.");
  process.exit(1);
}

const { extractBills } = await import("../lib/extract/bills.ts");
const { extractPayroll } = await import("../lib/extract/payroll.ts");
const { extractPolicy } = await import("../lib/extract/policy.ts");

const docs = {
  bills: "E_electricity_bills_2025.pdf",
  payroll: "S_payroll_headcount_2025.xlsx",
  policy: "G_anti_bribery_policy.docx",
};
const read = (name) => fs.readFileSync(path.join(root, "seed_docs", name));

console.log("extracting bills (Gemini vision) + policy (mammoth + Gemini) + payroll (SheetJS)...");
const [bills, policy] = await Promise.all([
  extractBills(read(docs.bills), docs.bills),
  extractPolicy(read(docs.policy), docs.policy),
]);
const payroll = extractPayroll(read(docs.payroll), docs.payroll);

const evidence = [...bills, ...payroll, ...policy];

// integrity rule 1: a fact you cannot point back to is not evidence
const bad = evidence.filter((e) => !e.source_ref || !e.source_file || !e.field);
if (bad.length) {
  console.error("rows with empty source_ref/source_file/field:", bad);
  process.exit(1);
}

const out = path.join(root, "seed", "evidence.json");
fs.writeFileSync(out, JSON.stringify(evidence, null, 2) + "\n");

const byConf = {};
for (const e of evidence) byConf[e.confidence] = (byConf[e.confidence] ?? 0) + 1;
console.log(`wrote ${out}`);
console.log(`rows: ${evidence.length} (bills ${bills.length}, payroll ${payroll.length}, policy ${policy.length})`);
console.log("confidence:", byConf);
console.log("\nspot checks:");
const aug = evidence.filter((e) => e.field === "electricity_kwh" && e.period === "2025-08");
console.log("  2025-08 kWh rows:", aug.map((e) => `${e.value} kWh ${e.confidence}`).join("; ") || "NONE");
const appr = evidence.find((e) => e.field === "policy_approved_by");
console.log("  policy_approved_by:", JSON.stringify(appr?.value), appr?.confidence);
console.log("  training_hours rows:", evidence.filter((e) => e.field === "training_hours").length,
  "of", evidence.filter((e) => e.field === "basic_salary").length, "staff with salary");
