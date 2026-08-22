import { NextResponse } from "next/server";
import { extractBills } from "@/lib/extract/bills";
import { extractPayroll } from "@/lib/extract/payroll";
import { extractPolicy } from "@/lib/extract/policy";
import { runRules } from "@/lib/rules";
import { getStore, replaceEvidenceForFile, saveStore } from "@/lib/store";
import type { NewEvidence } from "@/lib/types";

export const dynamic = "force-dynamic";

// Replacement keys on docType, not filename — an uploaded ..._FIXED.xlsx must
// replace the original payroll evidence. Each docType maps to one extension,
// so the current file(s) for a docType are the ones with that extension.
const DOC_TYPES = {
  payroll: { ext: ".xlsx", extract: async (buf: Buffer, name: string) => extractPayroll(buf, name) },
  bills: { ext: ".pdf", extract: extractBills },
  policy: { ext: ".docx", extract: extractPolicy },
} as const;

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const docType = form?.get("docType") as keyof typeof DOC_TYPES | null;
  if (!file || !(file instanceof File) || !docType || !(docType in DOC_TYPES)) {
    return NextResponse.json(
      { error: "multipart form with 'file' and docType (payroll|bills|policy) required" },
      { status: 400 }
    );
  }

  let newRows: NewEvidence[];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    newRows = await DOC_TYPES[docType].extract(buf, file.name);
  } catch (err) {
    return NextResponse.json(
      { error: `extraction failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 422 }
    );
  }
  // integrity rule: a fact you cannot point back to is not evidence
  if (newRows.length === 0 || newRows.some((r) => !r.source_ref || !r.field)) {
    return NextResponse.json(
      { error: "extraction produced no usable evidence (missing source_ref)" },
      { status: 422 }
    );
  }

  const store = await getStore();
  const before = runRules(store.evidence);

  // remove evidence of every current file for this docType, then insert
  const ext = DOC_TYPES[docType].ext;
  const currentFiles = [
    ...new Set(store.evidence.filter((e) => e.source_file.toLowerCase().endsWith(ext)).map((e) => e.source_file)),
  ];
  for (const f of currentFiles) {
    if (f !== file.name) await replaceEvidenceForFile(f, []);
  }
  const updated = await replaceEvidenceForFile(file.name, newRows);

  const after = runRules(updated.evidence);
  const beforeCodes = new Set(before.map((f) => f.rule_code));
  const afterCodes = new Set(after.map((f) => f.rule_code));

  // auto-verify: the finding disappeared, therefore the action is resolved
  const resolved: string[] = [];
  for (const a of updated.actions) {
    if (
      (a.status === "open" || a.status === "in_progress") &&
      beforeCodes.has(a.finding_rule_code) &&
      !afterCodes.has(a.finding_rule_code)
    ) {
      a.status = "resolved_verified";
      a.resolved_by = "rescan";
      resolved.push(a.finding_rule_code);
    }
  }
  if (resolved.length) await saveStore(updated);

  const stillOpen = updated.actions
    .filter((a) => a.status === "open" || a.status === "in_progress")
    .map((a) => a.finding_rule_code);

  return NextResponse.json({
    resolved,
    stillOpen,
    source_file: file.name,
    rows: newRows.length,
    replaced: currentFiles,
  });
}
