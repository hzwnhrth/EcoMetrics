import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Stored as "salt:sha256hex". Demo-grade on purpose — no external auth service.

export const DEMO_PASSWORD = "demo123"; // seeded demo accounts all use this

export function hashPassword(password: string, salt?: string): string {
  const s = salt ?? randomBytes(8).toString("hex");
  const digest = createHash("sha256").update(`${s}:${password}`).digest("hex");
  return `${s}:${digest}`;
}

export function checkPassword(password: string, stored: string): boolean {
  const [salt] = stored.split(":");
  if (!salt) return false;
  const candidate = Buffer.from(hashPassword(password, salt));
  const expected = Buffer.from(stored);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
