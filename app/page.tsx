import { getStore } from "@/lib/store";
import { computeIndicators, indicatorEvidence, runRules } from "@/lib/rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndicatorRow } from "@/components/indicator-row";
import { StatusDot } from "@/components/status";
import type { Pillar } from "@/lib/types";

const PILLARS: { key: Pillar; title: string }[] = [
  { key: "E", title: "Environment" },
  { key: "S", title: "Social" },
  { key: "G", title: "Governance" },
];

function worst(statuses: ("green" | "amber" | "red")[]): "green" | "amber" | "red" {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber")) return "amber";
  return "green";
}

export default async function DashboardPage() {
  const store = await getStore();
  const findings = runRules(store.evidence);
  const indicators = computeIndicators(store.evidence, findings);
  const red = indicators.filter((i) => i.status === "red");
  const sev3ByIndicator = new Map(
    findings.filter((f) => f.severity === 3).map((f) => [f.indicator_code, f])
  );
  const absent = findings.find((f) => f.rule_code === "S-ABSENT");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every number is traceable — click an indicator to see the evidence rows behind it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PILLARS.map(({ key, title }) => {
          const inds = indicators.filter((i) => i.pillar === key);
          const rows = store.evidence.filter((e) => e.pillar === key);
          const tally = { verified: 0, estimated: 0, inferred: 0 };
          for (const e of rows) tally[e.confidence]++;
          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <StatusDot status={worst(inds.map((i) => i.status))} />
                  {title}
                  <span className="ml-auto text-xs font-normal text-muted-foreground">{key}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {inds.map((i) => (
                  <IndicatorRow
                    key={i.code}
                    indicator={i}
                    evidence={indicatorEvidence(store.evidence, i.code)}
                  />
                ))}
                <p className="border-t pt-3 text-xs text-muted-foreground">
                  {rows.length} evidence rows: {tally.verified} verified · {tally.estimated}{" "}
                  estimated · {tally.inferred} inferred
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusDot status="red" />
            What we cannot prove
          </CardTitle>
        </CardHeader>
        <CardContent>
          {red.length === 0 && !absent ? (
            <p className="text-sm text-muted-foreground">Nothing — every indicator is supported.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {red.map((i) => {
                const f = sev3ByIndicator.get(i.code);
                return (
                  <li key={i.code} className="flex gap-2">
                    <span className="text-red-600 dark:text-red-400">✕</span>
                    <span>
                      <span className="font-medium">{i.label}</span>
                      {" — "}
                      {f ? f.title.toLowerCase() : i.coverage_note}
                      {f ? ` (${f.rule_code})` : ""}
                    </span>
                  </li>
                );
              })}
              {absent && (
                <li className="flex gap-2">
                  <span className="text-red-600 dark:text-red-400">✕</span>
                  <span>
                    <span className="font-medium">Safety incidents & staff turnover</span>
                    {" — "}no source document provided; unknown, not zero ({absent.rule_code})
                  </span>
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
