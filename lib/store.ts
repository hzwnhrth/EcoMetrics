import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import type { Action, Anchor, Evidence, NewEvidence, Store } from "./types";
import seedEvidence from "@/seed/evidence.json";

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

// Seed rows are extractor output (no id); the store assigns ids.
function initialStore(): Store {
  const rows = seedEvidence as unknown as (NewEvidence & { id?: string })[];
  return {
    evidence: rows.map((r) => ({ ...r, id: r.id ?? randomUUID() }) as Evidence),
    actions: [],
    meta: { anchor: null },
  };
}

export async function getStore(): Promise<Store> {
  if (useRedis()) {
    const existing = await redis().get<Store>(STORE_KEY);
    if (existing) return existing;
    const fresh = initialStore();
    await redis().set(STORE_KEY, fresh);
    return fresh;
  }
  try {
    const raw = await fs.readFile(FILE_PATH, "utf8");
    return JSON.parse(raw) as Store;
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

export async function addAction(
  input: Omit<Action, "id" | "created_at" | "status" | "resolved_by">
): Promise<Action> {
  const s = await getStore();
  const action: Action = {
    ...input,
    id: randomUUID(),
    status: "open",
    resolved_by: null,
    created_at: new Date().toISOString(),
  };
  s.actions.push(action);
  await saveStore(s);
  return action;
}

export async function updateAction(
  id: string,
  patch: Partial<Omit<Action, "id" | "created_at">>
): Promise<Action | null> {
  const s = await getStore();
  const action = s.actions.find((a) => a.id === id);
  if (!action) return null;
  Object.assign(action, patch);
  await saveStore(s);
  return action;
}

export async function setAnchor(anchor: Anchor): Promise<void> {
  const s = await getStore();
  s.meta.anchor = anchor;
  await saveStore(s);
}
