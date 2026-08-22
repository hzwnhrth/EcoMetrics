import { cn } from "@/lib/utils";
import type { MonthBar, WaffleSquare } from "@/lib/dashboard-data";

// Server-rendered SVG/CSS charts — no chart library. Specs: marks ≤24px thick
// with a 4px rounded data-end, 2px surface gaps between touching marks, values
// in text tokens (never the mark color), one plain-language caption per chart,
// native-title hover on every mark. Status colors (emerald/amber/red) are used
// only where the mark IS a status; magnitude marks stay neutral.

function compact(v: number): string {
  return v >= 10000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString();
}

export function ChartCaption({ children }: { children: React.ReactNode }) {
  return <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">{children}</figcaption>;
}

function LegendChip({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("size-2.5 rounded-full", tone)} />
      {label}
    </span>
  );
}

// ---- E: 12 monthly kWh bars, value on every bar, "No bill" slots ----------

export function MonthlyKwhBars({ bars, caption }: { bars: MonthBar[]; caption: React.ReactNode }) {
  const max = Math.max(...bars.map((b) => b.kwh ?? 0), 1);
  return (
    <figure>
      <div className="flex items-end gap-[2px]" style={{ height: 132 }}>
        {bars.map((b) => (
          <div key={b.period} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1 self-stretch">
            {b.kwh !== null ? (
              <>
                <span className="text-[9px] leading-none text-muted-foreground tabular-nums">
                  {compact(b.kwh)}
                </span>
                <div
                  title={`${b.period}: ${b.kwh.toLocaleString()} kWh${b.estimated ? " — ESTIMATED reading (ANGGARAN), not an actual meter read" : " (actual meter read)"}`}
                  className={cn(
                    "w-full max-w-6 rounded-t-[4px]",
                    b.estimated ? "bg-amber-500" : "bg-primary/75"
                  )}
                  style={{ height: Math.max(4, Math.round((b.kwh / max) * 96)) }}
                />
              </>
            ) : (
              <div
                title={`${b.period}: no bill uploaded — consumption unknown, not zero`}
                className="flex w-full max-w-6 items-center justify-center rounded-[4px] border border-dashed border-border"
                style={{ height: 96 }}
              >
                <span
                  className="text-[8px] uppercase tracking-wide text-muted-foreground"
                  style={{ writingMode: "vertical-rl" }}
                >
                  No bill
                </span>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <LegendChip tone="bg-primary/75" label="actual read" />
        <LegendChip tone="bg-amber-500" label="estimated read" />
        <LegendChip tone="border border-dashed border-border bg-transparent" label="no bill" />
      </div>
      <ChartCaption>{caption}</ChartCaption>
    </figure>
  );
}

// ---- S: horizontal comparison bars (headcount), value at the right ---------

export interface CompareBar {
  label: string;
  value: number;
  tone: "neutral" | "warn";
  note: string;
}

export function CompareBars({ items, caption }: { items: CompareBar[]; caption: React.ReactNode }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <figure>
      <div className="space-y-1.5">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2" title={i.note}>
            <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">{i.label}</span>
            <div className="h-5 min-w-0 flex-1">
              <div
                className={cn(
                  "h-full rounded-r-[4px]",
                  i.tone === "warn" ? "bg-amber-500" : "bg-primary/75"
                )}
                style={{ width: `${Math.max(4, (i.value / max) * 100)}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">{i.value}</span>
          </div>
        ))}
      </div>
      <ChartCaption>{caption}</ChartCaption>
    </figure>
  );
}

// ---- S: split bar (training recorded vs blank), values inside segments -----

export function SplitBar({
  a,
  b,
  aLabel,
  bLabel,
  caption,
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  caption: React.ReactNode;
}) {
  const total = a + b || 1;
  return (
    <figure>
      <div className="flex h-7 w-full gap-[2px] overflow-hidden">
        {a > 0 && (
          <div
            title={`${aLabel}: ${a} of ${total} staff`}
            className="flex items-center justify-center rounded-l-[4px] bg-emerald-600 last:rounded-r-[4px]"
            style={{ width: `${(a / total) * 100}%` }}
          >
            <span className="text-[11px] font-semibold text-white">{a}</span>
          </div>
        )}
        {b > 0 && (
          <div
            title={`${bLabel}: ${b} of ${total} staff`}
            className="flex items-center justify-center rounded-r-[4px] bg-amber-500 first:rounded-l-[4px]"
            style={{ width: `${(b / total) * 100}%` }}
          >
            <span className="text-[11px] font-semibold text-black/80">{b}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <LegendChip tone="bg-emerald-600" label={aLabel} />
        <LegendChip tone="bg-amber-500" label={bLabel} />
      </div>
      <ChartCaption>{caption}</ChartCaption>
    </figure>
  );
}

// ---- S: minimum-wage waffle — one square per staff row, hover = staff ID ----

export function WageWaffle({ squares, caption }: { squares: WaffleSquare[]; caption: React.ReactNode }) {
  const ok = squares.filter((s) => s.ok).length;
  const below = squares.length - ok;
  return (
    <figure>
      <div className="flex flex-wrap items-start gap-3">
        <div className="grid w-fit grid-cols-11 gap-[3px]">
          {squares.map((s, i) => (
            <span
              key={`${s.staffId}-${i}`}
              title={`${s.staffId} — RM${s.amount.toLocaleString()}${s.ok ? "" : " (below RM1,700 statutory minimum)"}`}
              className={cn(
                "size-3.5 cursor-help rounded-[3px]",
                s.ok ? "bg-emerald-600/70" : "bg-red-500"
              )}
            />
          ))}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-600/70" />
            <span className="font-medium text-foreground">{ok} compliant</span>
          </p>
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500" />
            <span className="font-medium text-foreground">{below} below RM1,700</span>
          </p>
          <p>hover a square for the staff ID</p>
        </div>
      </div>
      <ChartCaption>{caption}</ChartCaption>
    </figure>
  );
}

// ---- Evidence health donut — center stat + plain-language legend ------------

export function EvidenceDonut({
  verified,
  estimated,
  inferred,
  caption,
}: {
  verified: number;
  estimated: number;
  inferred: number;
  caption: React.ReactNode;
}) {
  const total = verified + estimated + inferred || 1;
  const R = 44;
  const C = 2 * Math.PI * R;
  const seg = (n: number) => (n / total) * C;
  // verified is the base ring; the two small slices overlay at their offsets
  const estOffset = seg(verified);
  const infOffset = seg(verified) + seg(estimated);
  return (
    <figure>
      <div className="flex flex-wrap items-center gap-4">
        <svg viewBox="0 0 120 120" className="size-32 shrink-0" role="img" aria-label={`${total} evidence rows: ${verified} verified, ${estimated} estimated, ${inferred} inferred`}>
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="13" className="stroke-emerald-600/80" />
          {estimated > 0 && (
            <circle
              cx="60" cy="60" r={R} fill="none" strokeWidth="13"
              className="stroke-amber-500"
              strokeDasharray={`${Math.max(seg(estimated), 2)} ${C}`}
              strokeDashoffset={-estOffset}
              transform="rotate(-90 60 60)"
            />
          )}
          {inferred > 0 && (
            <circle
              cx="60" cy="60" r={R} fill="none" strokeWidth="13"
              className="stroke-sky-500"
              strokeDasharray={`${Math.max(seg(inferred), 2)} ${C}`}
              strokeDashoffset={-infOffset}
              transform="rotate(-90 60 60)"
            />
          )}
          <text x="60" y="57" textAnchor="middle" className="fill-foreground text-xl font-semibold">
            {total}
          </text>
          <text x="60" y="74" textAnchor="middle" className="fill-muted-foreground text-[10px] uppercase tracking-wider">
            rows
          </text>
        </svg>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-emerald-600/80" />
            <span className="font-medium text-foreground">{verified} verified</span>
            — read directly off a document
          </p>
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            <span className="font-medium text-foreground">{estimated} estimated</span>
            — the document itself is an estimate
          </p>
          <p className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-sky-500" />
            <span className="font-medium text-foreground">{inferred} inferred</span>
            — typed in by a person, not traceable
          </p>
        </div>
      </div>
      <ChartCaption>{caption}</ChartCaption>
    </figure>
  );
}
