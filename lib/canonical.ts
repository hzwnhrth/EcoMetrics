import { createHash } from "node:crypto";
import { computeIndicators, runRules } from "./rules";
import type { Store } from "./types";

// Canonical JSON: recursive, object keys sorted alphabetically, JSON.stringify
// semantics for undefined (dropped in objects, null in arrays) — so the same
// report always hashes to the same value.
export function stableStringify(obj: unknown): string {
  if (obj === undefined) return "null";
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return "[" + obj.map(stableStringify).join(",") + "]";
  const entries = Object.keys(obj as Record<string, unknown>)
    .sort()
    .filter((k) => (obj as Record<string, unknown>)[k] !== undefined)
    .map((k) => JSON.stringify(k) + ":" + stableStringify((obj as Record<string, unknown>)[k]));
  return "{" + entries.join(",") + "}";
}

export function sha256Hex(str: string): string {
  return createHash("sha256").update(str).digest("hex");
}

// The ONE code path both /api/anchor and /api/anchor/verify use — indicators
// and findings computed fresh, actions as persisted.
export function computeReportHash(store: Store): string {
  const findings = runRules(store.evidence);
  const indicators = computeIndicators(store.evidence, findings);
  const report = { indicators, findings, actions: store.actions };
  return sha256Hex(stableStringify(report));
}
