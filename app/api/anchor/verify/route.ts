import { NextResponse } from "next/server";
import { computeReportHash } from "@/lib/canonical";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// Recompute the hash from CURRENT data via the exact code path /api/anchor
// used, and compare with what was anchored. No network involved.
export async function POST() {
  try {
    const store = await getStore();
    const currentHash = computeReportHash(store);
    const anchor = store.meta.anchor;
    if (!anchor) {
      return NextResponse.json({
        match: false,
        anchoredHash: null,
        currentHash,
        signature: null,
        error: "report has not been anchored yet",
      });
    }
    return NextResponse.json({
      match: currentHash === anchor.hash,
      anchoredHash: anchor.hash,
      currentHash,
      signature: anchor.signature,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err), live: false },
      { status: 500 }
    );
  }
}
