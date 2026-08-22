import { getStore } from "@/lib/store";
import { computeIndicators, runRules } from "@/lib/rules";
import { AnchorBlock } from "@/components/anchor-block";
import { ExportButton } from "@/components/export-button";
import { StatusBadge, StatusDot } from "@/components/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Pillar } from "@/lib/types";

const PILLAR_NAMES: Record<Pillar, string> = { E: "Environment", S: "Social", G: "Governance" };

export default async function ReportPage() {
  const store = await getStore();
  const findings = runRules(store.evidence);
  const indicators = computeIndicators(store.evidence, findings);
  const top5 = findings.slice(0, 5);
  const tally = { verified: 0, estimated: 0, inferred: 0 };
  for (const e of store.evidence) tally[e.confidence]++;

  return (
    <div className="report-print mx-auto max-w-3xl space-y-8">
      {/* company header */}
      <header className="space-y-1 border-b pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">SINARAN PRECISION SDN BHD</h1>
            <p className="text-sm text-muted-foreground">
              No. 12, Jalan Utarid U5/17, Seksyen U5, 40150 Shah Alam, Selangor
            </p>
          </div>
          <ExportButton />
        </div>
        <p className="pt-2 text-sm font-medium">ESG Questionnaire Response — Evidence & Action Report</p>
        <p className="text-xs text-muted-foreground">
          Generated {new Date().toISOString().slice(0, 10)} · evidence: {tally.verified} verified ·{" "}
          {tally.estimated} estimated · {tally.inferred} inferred · every value traceable to a source
          document
        </p>
      </header>

      {/* pillar summary */}
      <section className="break-inside-avoid">
        <h2 className="mb-2 text-lg font-semibold">Pillar summary</h2>
        <div className="space-y-4">
          {(Object.keys(PILLAR_NAMES) as Pillar[]).map((p) => (
            <div key={p}>
              <h3 className="mb-1 text-sm font-medium text-muted-foreground">{PILLAR_NAMES[p]}</h3>
              <ul className="space-y-1">
                {indicators
                  .filter((i) => i.pillar === p)
                  .map((i) => (
                    <li key={i.code} className="flex items-baseline gap-2 text-sm">
                      <StatusDot status={i.status} className="translate-y-px" />
                      <span className="font-medium">{i.label}:</span>
                      <span>
                        {i.value} {i.unit !== "text" ? i.unit : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">— {i.coverage_note}</span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* top 5 findings */}
      <section className="break-inside-avoid">
        <h2 className="mb-2 text-lg font-semibold">Top findings</h2>
        <ol className="list-decimal space-y-2 pl-5">
          {top5.map((f) => (
            <li key={f.rule_code} className="text-sm">
              <span className="font-medium">
                {f.title} ({f.rule_code})
              </span>{" "}
              <span className="font-mono text-xs text-muted-foreground">
                score {f.severity} × {f.customer_asked ? 2 : 1}
                {f.quick_win ? " × 1.5" : ""} = {f.score.toFixed(1)}
              </span>
              <p className="text-xs text-muted-foreground">{f.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* all actions */}
      <section className="break-inside-avoid">
        <h2 className="mb-2 text-lg font-semibold">Actions</h2>
        {store.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No actions recorded.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {store.actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">
                    {a.title} <span className="font-mono text-xs text-muted-foreground">{a.finding_rule_code}</span>
                  </TableCell>
                  <TableCell className="text-sm">{a.owner}</TableCell>
                  <TableCell className="text-sm tabular-nums">{a.due_date}</TableCell>
                  <TableCell className="text-sm">
                    {a.resolved_by === "rescan" ? (
                      <StatusBadge status="green" label="verified by re-scan" />
                    ) : (
                      a.status.replace("_", " ")
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {/* anchor block */}
      <section className="break-inside-avoid">
        <AnchorBlock anchor={store.meta.anchor} />
      </section>
    </div>
  );
}
