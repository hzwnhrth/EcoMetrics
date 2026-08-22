import { NextResponse } from "next/server";
import { computeReportHash } from "@/lib/canonical";
import { anchorOnDevnet } from "@/lib/solana";
import { getStore, setAnchor } from "@/lib/store";
import { can, denyReason, getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Anchoring IS the report sign-off — owner (Managing Director) only.
export async function POST() {
  const user = await getSessionUser();
  if (!can(user, "sign_off")) {
    return NextResponse.json({ error: denyReason(user, "sign_off") }, { status: 403 });
  }
  const store = await getStore();
  try {
    const hash = computeReportHash(store);
    const signature = await anchorOnDevnet(hash);
    const anchor = { hash, signature, anchored_at: new Date().toISOString() };
    await setAnchor(anchor);
    return NextResponse.json({ anchor, live: true });
  } catch (err) {
    // network failure: fall back to the cached anchor ("anchored earlier today")
    return NextResponse.json({
      anchor: store.meta.anchor,
      live: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
