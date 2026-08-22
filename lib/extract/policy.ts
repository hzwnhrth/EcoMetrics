import mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NewEvidence } from "../types";

// mammoth pulls raw text from the DOCX, Gemini converts it to JSON (temp 0,
// verbatim prompt from CLAUDE.md), then deterministic mapping below.
// Control-table fields: a visibly blank cell IS a fact — emit value "" with
// confidence "verified" (you verified what the page says, even when blank).

const PROMPT = `You audit corporate policy documents. From the text, extract: title, issue_date
(ISO), version, is_draft (true if any header/watermark says DRAFT),
approved_by (the literal content of the Approved By field, "" if blank),
owner (literal content, including unfilled placeholders like "[Insert name...]"),
last_review_date ("" if blank), next_review_date (ISO or ""), referenced_documents
(array of document/appendix names this policy refers to), reporting_channel
(the email/phone for reports), commitments (array of promises the policy makes,
e.g. training deadlines, acknowledgement records). Return ONLY a JSON object.
Copy field contents literally. Do not infer or improve anything.`;

interface PolicyJson {
  title?: string;
  issue_date?: string;
  version?: string | number;
  is_draft?: boolean;
  approved_by?: string;
  owner?: string;
  last_review_date?: string;
  next_review_date?: string;
  referenced_documents?: string[];
  reporting_channel?: string;
  commitments?: string[];
}

const CONTROL_TABLE = "document control table";

export async function extractPolicy(buf: Buffer, source_file: string): Promise<NewEvidence[]> {
  const { value: text } = await mammoth.extractRawText({ buffer: buf });

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });
  const res = await model.generateContent([PROMPT, "\n\nPOLICY TEXT:\n\n" + text]);
  const p = JSON.parse(res.response.text()) as PolicyJson;

  const row = (
    field: string,
    value: string,
    unit: string,
    source_ref: string
  ): NewEvidence => ({
    source_file,
    source_ref,
    pillar: "G",
    field,
    value,
    unit,
    period: null,
    confidence: "verified",
  });

  const rows: NewEvidence[] = [
    // control-table fields are always emitted, blank or not
    row("policy_title", p.title ?? "", "text", CONTROL_TABLE),
    row("policy_issue_date", p.issue_date ?? "", "date", CONTROL_TABLE),
    row("policy_version", String(p.version ?? ""), "text", CONTROL_TABLE),
    row("policy_is_draft", String(p.is_draft ?? false), "bool", "document header"),
    row("policy_approved_by", p.approved_by ?? "", "text", CONTROL_TABLE),
    row("policy_owner", p.owner ?? "", "text", CONTROL_TABLE),
    row("policy_last_review", p.last_review_date ?? "", "date", CONTROL_TABLE),
    row("policy_next_review", p.next_review_date ?? "", "date", CONTROL_TABLE),
  ];

  for (const doc of p.referenced_documents ?? []) {
    if (doc) rows.push(row("policy_referenced_doc", doc, "text", "policy body — references"));
  }
  if (p.reporting_channel) {
    rows.push(row("policy_reporting_channel", p.reporting_channel, "text", "policy body — reporting section"));
  }
  for (const c of p.commitments ?? []) {
    if (c) rows.push(row("policy_commitment", c, "text", "policy body — commitments"));
  }
  return rows;
}
