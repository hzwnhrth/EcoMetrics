import { cn } from "@/lib/utils";
import { PILLAR_NAMES, PILLAR_TOPICS, RULE_INFO } from "@/lib/rules";
import type { Pillar } from "@/lib/types";

// Pillar colour-coding (QA item 8): E green · S amber · G blue, everywhere.
export const PILLAR_STYLES: Record<Pillar, string> = {
  E: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  S: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  G: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
};

export function PillarBadge({ pillar, className }: { pillar: Pillar; className?: string }) {
  return (
    <span
      title={`${pillar} — ${PILLAR_NAMES[pillar]} (${PILLAR_TOPICS[pillar]})`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
        PILLAR_STYLES[pillar],
        className
      )}
    >
      {pillar} — {PILLAR_NAMES[pillar]}
    </span>
  );
}

// Rule code with a hover key: "S-WAGE — Social · statutory minimum wage compliance"
export function RuleCodeBadge({ code, className }: { code: string; className?: string }) {
  const info = RULE_INFO[code];
  const pillar = (info?.pillar ?? code[0]) as Pillar;
  return (
    <span
      title={info ? `${code} — ${PILLAR_NAMES[pillar]} · ${info.label}` : code}
      className={cn(
        "inline-flex shrink-0 cursor-help items-center rounded-full px-2 py-0.5 font-mono text-xs font-medium",
        PILLAR_STYLES[pillar],
        className
      )}
    >
      {code}
    </span>
  );
}

// Legend shown above the findings list so an intern can decode the codes.
export function PillarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Reading the codes:</span>
      {(Object.keys(PILLAR_NAMES) as Pillar[]).map((p) => (
        <span key={p} className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex size-4 items-center justify-center rounded-full text-[10px] font-semibold",
              PILLAR_STYLES[p]
            )}
          >
            {p}
          </span>
          <span className="font-medium text-foreground">{PILLAR_NAMES[p]}</span>
          <span>({PILLAR_TOPICS[p]})</span>
        </span>
      ))}
      <span className="w-full sm:w-auto">Hover any code for its meaning.</span>
    </div>
  );
}
