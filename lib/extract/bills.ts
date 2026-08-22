import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NewEvidence } from "../types";

// Gemini vision over the bills PDF — inline base64, JSON response, temp 0.
// Prompt is verbatim from CLAUDE.md; the model only converts pages to JSON,
// all interpretation happens in deterministic code below.

const PROMPT = `You extract data from Malaysian electricity bills. The PDF has one bill per page.
For EACH page return: page_number, billing_period as YYYY-MM, kwh_used (integer),
account_number, site_address (single line), reading_type ("SEBENAR" or
"ANGGARAN"), total_rm (number). Return ONLY a JSON array, one object per page.
If a value is not present on a page, omit that key. Do not guess.`;

interface BillPage {
  page_number?: number;
  billing_period?: string;
  kwh_used?: number;
  account_number?: string;
  site_address?: string;
  reading_type?: string;
  total_rm?: number;
}

export async function extractBills(buf: Buffer, source_file: string): Promise<NewEvidence[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: { temperature: 0, responseMimeType: "application/json" },
  });

  const res = await model.generateContent([
    { inlineData: { mimeType: "application/pdf", data: buf.toString("base64") } },
    PROMPT,
  ]);
  const pages = JSON.parse(res.response.text()) as BillPage[];

  const rows: NewEvidence[] = [];
  for (const p of pages) {
    const source_ref = `page ${p.page_number}`;
    const period = p.billing_period ?? null;
    const base = { source_file, source_ref, pillar: "E" as const, period };

    if (p.kwh_used !== undefined) {
      const estimated = p.reading_type === "ANGGARAN";
      rows.push({
        ...base,
        field: "electricity_kwh",
        value: String(p.kwh_used),
        unit: "kWh",
        confidence: estimated ? "estimated" : "verified",
        ...(estimated ? { note: "reading type ANGGARAN" } : {}),
      });
    }
    if (p.account_number !== undefined) {
      rows.push({ ...base, field: "account_number", value: String(p.account_number), unit: "text", confidence: "verified" });
    }
    if (p.site_address !== undefined) {
      rows.push({ ...base, field: "site_address", value: p.site_address, unit: "text", confidence: "verified" });
    }
    if (p.total_rm !== undefined) {
      rows.push({ ...base, field: "bill_total_rm", value: String(p.total_rm), unit: "RM", confidence: "verified" });
    }
  }
  return rows;
}
