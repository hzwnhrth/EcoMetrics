import type { DigestGroup } from "./suggest";
import { formatDate } from "./format";

// Real email via the Resend REST API (the Vercel Marketplace "resend"
// integration injects RESEND_API_KEY). No SDK — one fetch. When the key is
// missing every send comes back {sent:false, error} and the UI says so
// honestly instead of pretending.

export interface SendResult {
  sent: boolean;
  to: string;
  subject: string;
  error?: string;
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return { sent: false, to, subject, error: "email not configured — RESEND_API_KEY is missing" };
  }
  const from = process.env.EMAIL_FROM || "EcoMetrics <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      return { sent: false, to, subject, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }
    return { sent: true, to, subject };
  } catch (err) {
    return { sent: false, to, subject, error: err instanceof Error ? err.message : String(err) };
  }
}

// One reminder email per owner — same content the digest dialog previews.
export function renderDigestEmail(g: DigestGroup): { subject: string; text: string } {
  const count = g.overdue.length + g.dueThisWeek.length;
  const subject = `ESG questionnaire actions — ${count} need${count === 1 ? "s" : ""} attention`;
  const lines: string[] = [`Hello ${g.owner},`, ""];
  if (g.overdue.length) {
    lines.push("OVERDUE");
    for (const a of g.overdue) {
      lines.push(`• ${a.title} — was due ${formatDate(a.due_date)}${a.next_step ? ` · next: ${a.next_step}` : ""}`);
    }
    lines.push("");
  }
  if (g.dueThisWeek.length) {
    lines.push("DUE THIS WEEK");
    for (const a of g.dueThisWeek) {
      lines.push(`• ${a.title} — due ${formatDate(a.due_date)}${a.next_step ? ` · next: ${a.next_step}` : ""}`);
    }
    lines.push("");
  }
  lines.push(`Open EcoMetrics: ${appUrl()}/actions`);
  lines.push("");
  lines.push("— EcoMetrics automated reminder");
  return { subject, text: lines.join("\n") };
}
