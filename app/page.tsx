import { getStore } from "@/lib/store";
import { computeIndicators, indicatorEvidence, runRules, RULE_INFO } from "@/lib/rules";
import {
  electricityByMonth,
  evidenceHealth,
  governanceChecks,
  headcountComparison,
  trainingSplit,
  wageWaffle,
} from "@/lib/dashboard-data";
import { can, denyReason, getSessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IndicatorRow } from "@/components/indicator-row";
import { StatusDot } from "@/components/status";
import { CappedList } from "@/components/capped-list";
import {
  CompareBars,
  EvidenceDonut,
  MonthlyKwhBars,
  SplitBar,
  WageWaffle,
} from "@/components/charts";
import type { Pillar } from "@/lib/types";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function worst(statuses: ("green" | "amber" | "red")[]): "green" | "amber" | "red" {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("amber")) return "amber";
  return "green";
}

export default async function DashboardPage() {
  const store = await getStore();
  const user = await getSessionUser();
  const today = new Date();
  const findings = runRules(store.evidence, today);
  const indicators = computeIndicators(store.evidence, findings);
  const canManage = can(user, "manage_evidence");
  const manageDenied = canManage ? undefined : denyReason(user, "manage_evidence");

  // chart data
  const elec = electricityByMonth(store.evidence);
  const missingMonths = elec.bars.filter((b) => b.kwh === null).map((b) => MONTH_NAMES[Number(b.period.slice(5)) - 1]);
  const estMonths = elec.bars.filter((b) => b.estimated).map((b) => MONTH_NAMES[Number(b.period.slice(5)) - 1]);
  const verifiedKwh = elec.bars.filter((b) => b.kwh !== null && !b.estimated).reduce((s, b) => s + (b.kwh ?? 0), 0);
  const head = headcountComparison(store.evidence);
  const training = trainingSplit(store.evidence);
  const waffle = wageWaffle(store.evidence);
  const health = evidenceHealth(store.evidence);
  const checks = governanceChecks(store.evidence, findings, today);
  const failedChecks = checks.filter((c) => !c.pass).length;

  // "Gaps with no evidence": red indicators + the no-source finding
  const red = indicators.filter((i) => i.status === "red");
  const sev3ByIndicator = new Map(
    findings.filter((f) => f.severity === 3).map((f) => [f.indicator_code, f])
  );
  const absent = findings.find((f) => f.rule_code === "S-ABSENT");

  const pillarCard = (key: Pillar, title: string, chart: React.ReactNode) => {
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
        <CardContent className="space-y-3">
          <div className="space-y-1">
            {inds.map((i) => (
              <IndicatorRow
                key={i.code}
                indicator={i}
                evidence={indicatorEvidence(store.evidence, i.code)}
                canManage={canManage}
                manageDenied={manageDenied}
              />
            ))}
          </div>
          <div className="space-y-4 border-t pt-3">{chart}</div>
          <p className="border-t pt-3 text-xs text-muted-foreground">
            {rows.length} evidence rows: {tally.verified} verified · {tally.estimated} estimated ·{" "}
            {tally.inferred} inferred
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every number is traceable — click an indicator to see the evidence rows behind it.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pillarCard(
          "E",
          "Environment",
          <MonthlyKwhBars
            bars={elec.bars}
            caption={
              <>
                Monthly electricity use on account {elec.account}: {verifiedKwh.toLocaleString()} kWh
                verified across {elec.bars.filter((b) => b.kwh !== null && !b.estimated).length} months.
                Amber because {estMonths.join(", ")} is an estimated reading and{" "}
                {missingMonths.join(", ")} have no bill at all — those months are unknown, not zero.
              </>
            }
          />
        )}
        {pillarCard(
          "S",
          "Social",
          <>
            <CompareBars
              items={[
                { label: "HR system says", value: head.hr ?? 0, tone: "warn", note: "Typed manually into the Summary sheet — inferred, not reconciled" },
                { label: "Payroll register", value: head.register, tone: "neutral", note: "Rows with a salary in Payroll Dec 2025" },
                { label: "Distinct staff IDs", value: head.distinct, tone: "neutral", note: "Unique staff IDs — duplicates collapse here" },
              ]}
              caption={
                <>
                  HR system says {head.hr}, the payroll register says {head.register} —{" "}
                  <span className="font-medium text-foreground">
                    {Math.abs((head.hr ?? 0) - head.register)} people unaccounted for
                  </span>
                  {head.distinct !== head.register &&
                    `, and only ${head.distinct} distinct IDs (a duplicate row)`}
                  . The three numbers should be equal.
                </>
              }
            />
            <SplitBar
              a={training.recorded}
              b={training.blank}
              aLabel="training hours recorded"
              bLabel="blank (not recorded)"
              caption={
                <>
                  {training.recorded} of {training.recorded + training.blank} staff have recorded
                  training hours ({training.hoursSum.toLocaleString()} h total); {training.blank} cells
                  are blank. Blank means not recorded — it cannot be reported as zero.
                </>
              }
            />
            <WageWaffle
              squares={waffle}
              caption={
                <>
                  Each square is one staff member&apos;s December salary. Red squares are below the
                  RM1,700 statutory minimum (Minimum Wages Order 2024) — that is a legal compliance
                  issue, which is why this pillar is red.
                </>
              }
            />
          </>
        )}
        {pillarCard(
          "G",
          "Governance",
          <figure>
            <CappedList
              noun="checks"
              cap={5}
              className="space-y-1"
              items={checks.map((c) => (
                <div key={c.label} className="flex items-start gap-2 rounded-md px-1 py-1 text-sm" title={c.detail}>
                  {c.pass ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">✕</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={c.pass ? "" : "font-medium"}>{c.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.detail}</span>
                  </span>
                </div>
              ))}
            />
            <figcaption className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {failedChecks} of {checks.length} document controls fail on the anti-bribery policy —
              an unapproved, overdue policy cannot evidence “adequate procedures”, which is why this
              pillar is red.
            </figcaption>
          </figure>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evidence health</CardTitle>
          </CardHeader>
          <CardContent>
            <EvidenceDonut
              verified={health.verified}
              estimated={health.estimated}
              inferred={health.inferred}
              caption={
                <>
                  {health.verified} of {health.total} rows trace directly to a source document;{" "}
                  {health.estimated + health.inferred} do not. One estimated or inferred input is
                  enough to drag an indicator from green to amber — never softened.
                </>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusDot status="red" />
              Gaps with no evidence
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              These findings have no source document, so we cannot verify them either way. Missing is
              not the same as zero.
            </p>
          </CardHeader>
          <CardContent>
            {red.length === 0 && !absent ? (
              <p className="text-sm text-muted-foreground">Nothing — every indicator is supported.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {red.map((i) => {
                  const f = sev3ByIndicator.get(i.code);
                  const closes = f ? RULE_INFO[f.rule_code]?.closes_gap : undefined;
                  return (
                    <li key={i.code} className="flex gap-2">
                      <span className="text-red-600 dark:text-red-400">✕</span>
                      <span className="min-w-0">
                        <span className="font-medium">{i.label}</span>
                        {" — "}
                        {f ? f.title.toLowerCase() : i.coverage_note}
                        {f ? ` (${f.rule_code})` : ""}
                        {closes && (
                          <span className="block text-xs text-muted-foreground">
                            Document that closes this gap: {closes}.
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
                {absent && (
                  <li className="flex gap-2">
                    <span className="text-red-600 dark:text-red-400">✕</span>
                    <span className="min-w-0">
                      <span className="font-medium">Safety incidents &amp; staff turnover</span>
                      {" — "}no source document provided; unknown, not zero ({absent.rule_code})
                      <span className="block text-xs text-muted-foreground">
                        Document that closes this gap: {RULE_INFO["S-ABSENT"].closes_gap}.
                      </span>
                    </span>
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
