import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/types";

// Green/amber/red are reserved for STATUS; everything else stays neutral.

type Status = "green" | "amber" | "red";

const DOT: Record<Status, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", DOT[status], className)} />;
}

const BADGE: Record<Status, string> = {
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/15 text-red-700 dark:text-red-400",
};

export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", BADGE[status])}>
      {label ?? status}
    </span>
  );
}

const SEVERITY: Record<number, Status> = { 3: "red", 2: "amber" };

export function SeverityBadge({ severity }: { severity: 1 | 2 | 3 }) {
  const status = SEVERITY[severity];
  if (!status) {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
        sev 1
      </span>
    );
  }
  return <StatusBadge status={status} label={`sev ${severity}`} />;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  if (confidence === "verified") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
        verified
      </span>
    );
  }
  return <StatusBadge status="amber" label={confidence} />;
}
