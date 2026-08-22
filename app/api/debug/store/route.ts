import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

// Phase 1 scratch route: dumps the store as JSON to prove seed loading
// on both backends (file locally, redis on Vercel). Password hashes are
// redacted — any signed-in role can hit this.
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await getStore();
  return NextResponse.json({
    backend: process.env.STORAGE_BACKEND ?? "file",
    evidence_count: store.evidence.length,
    actions_count: store.actions.length,
    users_count: store.users.length,
    store: {
      ...store,
      users: store.users.map(({ password_hash: _, ...u }) => u),
    },
  });
}
