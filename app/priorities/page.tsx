import { getStore } from "@/lib/store";
import { runRules } from "@/lib/rules";
import { suggestAction } from "@/lib/suggest";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/status";
import { CreateActionDialog } from "@/components/create-action-dialog";

export default async function PrioritiesPage() {
  const store = await getStore();
  const today = new Date();
  const findings = runRules(store.evidence, today); // already sorted by score desc
  const openRules = new Set(
    store.actions
      .filter((a) => a.status === "open" || a.status === "in_progress")
      .map((a) => a.finding_rule_code)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Priorities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {findings.length} findings, ranked by score = severity × customer-asked × quick-win.
        </p>
      </div>

      <div className="space-y-3">
        {findings.map((f) => {
          const s = suggestAction(f, today);
          return (
            <Card key={f.rule_code}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  <span className="font-mono text-xs text-muted-foreground">{f.rule_code}</span>
                  {f.title}
                  <SeverityBadge severity={f.severity} />
                  {f.quick_win === 1 && (
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      quick win
                    </span>
                  )}
                  <span className="ml-auto font-mono text-sm tabular-nums">
                    {f.severity} × {f.customer_asked ? 2 : 1}
                    {f.quick_win ? " × 1.5" : ""} = {f.score.toFixed(1)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end justify-between gap-3">
                <p className="max-w-3xl text-sm text-muted-foreground">{f.detail}</p>
                <div className="flex items-center gap-2">
                  {openRules.has(f.rule_code) && (
                    <span className="text-xs text-muted-foreground">action exists</span>
                  )}
                  <CreateActionDialog
                    ruleCode={f.rule_code}
                    defaultTitle={f.title}
                    suggestedOwner={s.owner}
                    suggestedDueDate={s.due_date}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
