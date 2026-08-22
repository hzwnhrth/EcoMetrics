import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role, User } from "./types";
import { findUserById } from "./store";

// Cookie-session auth, homegrown on purpose (demo app, three seeded users, no
// external auth service). Token = base64url(payload).hmac; verified both here
// (Node) and in proxy.ts (Web Crypto, same algorithm).

export const SESSION_COOKIE = "ecometrics_session";
const SESSION_DAYS = 7;

// Falls back so the demo runs with zero config; set AUTH_SECRET in production.
export function authSecret(): string {
  return process.env.AUTH_SECRET || "ecometrics-demo-secret";
}

export function signSession(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_DAYS * 86400000 })
  ).toString("base64url");
  const sig = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", authSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof uid !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = verifySessionToken(token);
  if (!uid) return null;
  return findUserById(uid);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 86400,
};

// ---- role matrix (confirmed with QA, greenreceipt-qa-fixes.md item 5) ----
// owner: everything incl. report sign-off; manager: everything except
// sign-off and reset; staff: view + upload only.

export type Capability =
  | "upload"
  | "create_action"
  | "edit_action"
  | "change_status"
  | "delete_action"
  | "manage_evidence"
  | "send_digest"
  | "sign_off"
  | "reset";

const CAPS: Record<Role, readonly Capability[]> = {
  owner: [
    "upload", "create_action", "edit_action", "change_status", "delete_action",
    "manage_evidence", "send_digest", "sign_off", "reset",
  ],
  manager: [
    "upload", "create_action", "edit_action", "change_status", "delete_action",
    "manage_evidence", "send_digest",
  ],
  staff: ["upload"],
};

export function can(user: User | null, cap: Capability): boolean {
  return !!user && CAPS[user.role].includes(cap);
}

// Tooltip text for greyed-out controls — never hide a control silently.
export function denyReason(user: User | null, cap: Capability): string {
  if (!user) return "Sign in first.";
  const who = `${user.title} (${user.role})`;
  switch (cap) {
    case "sign_off":
      return `Only the Managing Director can sign off and anchor the report — you are signed in as ${who}.`;
    case "reset":
      return `Only the Managing Director can reset demo data — you are signed in as ${who}.`;
    case "send_digest":
      return `Only Managers and the Managing Director can send reminder emails — you are signed in as ${who}.`;
    case "manage_evidence":
      return `Your role ${who} can view and upload only; editing evidence needs a Manager or the Managing Director.`;
    default:
      return `Your role ${who} can view and upload only; managing actions needs a Manager or the Managing Director.`;
  }
}
