"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Anchor } from "@/lib/types";

type VerifyResult = {
  match: boolean;
  anchoredHash: string | null;
  currentHash: string;
  signature: string | null;
  error?: string;
};

const short = (h: string) => `${h.slice(0, 10)}…${h.slice(-10)}`;

export function AnchorBlock({
  anchor,
  signOffDenied,
}: {
  anchor: Anchor | null;
  signOffDenied?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"anchor" | "verify" | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);

  async function doAnchor() {
    setBusy("anchor");
    setVerify(null);
    try {
      const res = await fetch("/api/anchor", { method: "POST" });
      const data = await res.json();
      if (data.live && data.anchor) {
        toast.success("Report hash anchored on Solana devnet");
      } else if (data.anchor) {
        toast.warning("Solana unreachable — showing the anchor recorded earlier");
      } else {
        throw new Error(data.error ?? "anchoring failed");
      }
      router.refresh();
    } catch (err) {
      toast.error(`Anchor failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  async function doVerify() {
    setBusy("verify");
    try {
      const res = await fetch("/api/anchor/verify", { method: "POST" });
      const data = (await res.json()) as VerifyResult;
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setVerify(data);
    } catch (err) {
      toast.error(`Verify failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tamper evidence — Solana devnet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {anchor ? (
          <div className="space-y-1">
            <p>
              <span className="text-muted-foreground">Anchored hash: </span>
              <span className="font-mono text-xs" title={anchor.hash}>{short(anchor.hash)}</span>
              <span className="text-muted-foreground"> · {new Date(anchor.anchored_at).toLocaleString()}</span>
            </p>
            <p>
              <a
                href={`https://explorer.solana.com/tx/${anchor.signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                View transaction on Solana Explorer
                <ExternalLink className="size-3.5" />
              </a>
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Not anchored yet — anchoring writes a SHA-256 of the canonical report into a devnet memo
            transaction.
          </p>
        )}

        <div className="flex gap-2 print:hidden">
          {/* anchoring IS the sign-off — owner (Managing Director) only */}
          <span title={signOffDenied}>
            <Button size="sm" onClick={doAnchor} disabled={busy !== null || !!signOffDenied}>
              {busy === "anchor" ? "Anchoring…" : anchor ? "Re-anchor report" : "Anchor report (sign off)"}
            </Button>
          </span>
          {anchor && (
            <Button size="sm" variant="outline" onClick={doVerify} disabled={busy !== null}>
              {busy === "verify" ? "Verifying…" : "Verify against anchor"}
            </Button>
          )}
        </div>

        {verify && (
          <div
            className={
              verify.match
                ? "rounded-md bg-emerald-500/15 p-3 text-emerald-700 dark:text-emerald-400"
                : "rounded-md bg-red-500/15 p-3 text-red-700 dark:text-red-400"
            }
          >
            <p className="font-medium">
              {verify.match ? "MATCH — report unchanged since anchoring" : "MISMATCH — report has been modified since it was anchored"}
            </p>
            <p className="mt-1 font-mono text-xs">
              anchored {verify.anchoredHash ? short(verify.anchoredHash) : "—"} · current {short(verify.currentHash)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
