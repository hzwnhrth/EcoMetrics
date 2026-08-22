import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type {
  Action,
  ActionStatus,
  Anchor,
  AuditEntry,
  Evidence,
  NewEvidence,
  Store,
  User,
} from "./types";
import { hashPassword, DEMO_PASSWORD } from "./password";
import seedEvidence from "@/seed/evidence.json";
import seedActions from "@/seed/actions.json";
import seedUsers from "@/seed/users.json";

// Dual backend: "file" reads/writes data/store.json (local dev);
// "redis" keeps the ENTIRE store under one Upstash key "store" (Vercel —
// its filesystem is read-only and lambdas don't share memory).
// Last-write-wins by design; no locking.

const STORE_KEY = "store";
const FILE_PATH = path.join(process.cwd(), "data", "store.json");

function useRedis(): boolean {
  return process.env.STORAGE_BACKEND === "redis";
}

let redisClient: Redis | null = null;
function redis(): Redis {
  if (!redisClient) redisClient = Redis.fromEnv();
  return redisClient;
}

function seededUsers(): User[] {
  return (seedUsers as Omit<User, "password_hash">[]).map((u) => ({
    ...u,
    password_hash: hashPassword(DEMO_PASSWORD),
  }));
}

// Seed rows are extractor output (no id); the store assigns ids.
export function initialStore(): Store {
  const rows = seedEvidence as unknown as (NewEvidence & { id?: string })[];
  return {
    evidence: rows.map((r) => ({ ...r, id: r.id ?? randomUUID() }) as Evidence),
    actions: (seedActions as Action[]).map((a) => ({ ...a })),
    users: seededUsers(),
    meta: { anchor: null, reminders_sent: {} },
  };
}

// Stores written before the QA round lack users / audit / reminders_sent —
// fill them in so an existing data/store.json or redis key keeps working.
function withDefaults(s: Store): Store {
  if (!Array.isArray(s.users) || s.users.length === 0) s.users = seededUsers();
  s.meta.reminders_sent ??= {};
  for (const a of s.actions) {
    a.audit ??= [{ at: a.created_at, by: "seed", via: "seed", from: null, to: a.status }];
    a.owner_email ??= s.users.find((u) => a.owner.includes(u.name))?.email ?? "";
  }
  return s;
}

export async function getStore(): Promise<Store> {
  if (useRedis()) {
    const existing = await redis().get<Store>(STORE_KEY);
    if (existing) return withDefaults(existing);
    const fresh = initialStore();
    await redis().set(STORE_KEY, fresh);
    return fresh;
  }
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return withDefaults(JSON.parse(raw) as Store);
  } catch {
    const fresh = initialStore();
    await saveStore(fresh);
    return fresh;
  }
}

export async function saveStore(s: Store): Promise<void> {
  if (useRedis()) {
    await redis().set(STORE_KEY, s);
    return;
  }
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(s, null, 2), "utf8");
}

// "Reset demo data" — wipes everything back to the committed seed.
export async function resetStore(): Promise<Store> {
  const fresh = initialStore();
  await saveStore(fresh);
  return fresh;
}

// Removes all evidence rows for source_file, then appends the new rows
// (which carry their own source_file — an uploaded ..._FIXED.xlsx still
// replaces the original once /api/ingest resolves docType -> source_file).
export async function replaceEvidenceForFile(
  source_file: string,
  rows: NewEvidence[]
): Promise<Store> {
  const s = await getStore();
  s.evidence = [
    ...s.evidence.filter((e) => e.source_file !== source_file),
    ...rows.map((r) => ({ ...r, id: randomUUID() })),
  ];
  await saveStore(s);
  return s;
}

// ---- evidence CRUD (manager+ only; enforced in the API route) ----

export async function addEvidence(row: NewEvidence): Promise<Evidence> {
  const s = await getStore();
  const created: Evidence = { ...row, id: randomUUID() };
  s.evidence.push(created);
  await saveStore(s);
  return created;
}

export async function updateEvidence(
  id: string,
  patch: Partial<Omit<Evidence, "id">>
): Promise<Evidence | null> {
  const s = await getStore();
  const row = s.evidence.find((e) => e.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  await saveStore(s);
  return row;
}

export async function deleteEvidence(id: string): Promise<boolean> {
  const s = await getStore();
  const before = s.evidence.length;
  s.evidence = s.evidence.filter((e) => e.id !== id);
  if (s.evidence.length === before) return false;
  await saveStore(s);
  return true;
}

// ---- actions ----

export async function addAction(
  input: Omit<Action, "id" | "created_at" | "status" | "resolved_by" | "audit">,
  by: string
): Promise<Action> {
  const s = await getStore();
  const now = new Date().toISOString();
  const action: Action = {
    ...input,
    id: randomUUID(),
    status: "open",
    resolved_by: null,
    created_at: now,
    audit: [{ at: now, by, via: "manual", from: null, to: "open" }],
  };
  s.actions.push(action);
  await saveStore(s);
  return action;
}

// Status changes go through here so every one lands in the audit trail.
// Re-open rule (confirmed with QA): moving a done/resolved action back to
// "open" records it as "reopened" — Open, needs re-verification. Nothing is
// re-analysed until the next relevant upload.
export async function updateAction(
  id: string,
  patch: Partial<Omit<Action, "id" | "created_at" | "audit">>,
  by: string
): Promise<Action | null> {
  const s = await getStore();
  const action = s.actions.find((a) => a.id === id);
  if (!action) return null;

  if (patch.status && patch.status !== action.status) {
    let to: ActionStatus = patch.status;
    const wasClosed = action.status === "done" || action.status === "resolved_verified";
    if (to === "open" && wasClosed) to = "reopened";
    const entry: AuditEntry = { at: new Date().toISOString(), by, via: "manual", from: action.status, to };
    action.audit.push(entry);
    patch = { ...patch, status: to, resolved_by: to === "done" ? "manual" : null };
  }

  Object.assign(action, patch);
  await saveStore(s);
  return action;
}

export async function deleteAction(id: string): Promise<boolean> {
  const s = await getStore();
  const before = s.actions.length;
  s.actions = s.actions.filter((a) => a.id !== id);
  if (s.actions.length === before) return false;
  await saveStore(s);
  return true;
}

// ---- users ----

export async function findUserByEmail(email: string): Promise<User | null> {
  const s = await getStore();
  return s.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const s = await getStore();
  return s.users.find((u) => u.id === id) ?? null;
}

export async function addUser(
  input: Omit<User, "id" | "role" | "demo"> & { role?: User["role"] }
): Promise<User> {
  const s = await getStore();
  const user: User = { role: "staff", ...input, id: randomUUID() };
  s.users.push(user);
  await saveStore(s);
  return user;
}

export async function setAnchor(anchor: Anchor): Promise<void> {
  const s = await getStore();
  s.meta.anchor = anchor;
  await saveStore(s);
}
