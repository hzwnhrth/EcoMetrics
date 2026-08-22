import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStore } from "@/lib/store";
import { runRules } from "@/lib/rules";
import { ownerDisplay, suggestAction } from "@/lib/suggest";
import { can, denyReason, getSessionUser } from "@/lib/auth";
import { OPEN_STATUSES } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SeverityBadge } from "@/components/status";
import { CreateActionDialog } from "@/components/create-action-dialog";
import { PillarLegend, RuleCodeBadge } from "@/components/pillar-badge";
import { CappedList } from "@/components/capped-list";

const SEVERITY_WORD: Record<number, string> = { 3: "high", 2: "medium", 1: "low" };

export default async function PrioritiesPage() {
  const store = await getStore();
  const user = await getSessionUser();
  const today = new Date();
  const findings = runRules(store.evidence, today); // already sorted by score desc
  const openActionByRule = new Map(
    store.actions
      .filter((a) => OPEN_STATUSES.includes(a.status))
      .map((a) => [a.finding_rule_code, a])
  );
  const owners = store.users.map((u) => ({ display: ownerDisplay(u), email: u.email }));
  const createDenied = can(user, "create_action") ? undefined : denyReason(user, "create_action");

  const cards = findings.map((f) => {
    const s = suggestAction(f, store.users, today);
    const existing = openActionByRule.get(f.rule_code);
    const breakdown =
      `Severity ${f.severity} (${SEVERITY_WORD[f.severity]}) × Asked by customer ×${f.customer_asked ? 2 : 1}` +
      `${f.quick_win ? " × Quick win ×1.5" : ""} = ${f.score.toFixed(1)}`;
    return (
      <Card key={f.rule_code}>
        <CardHeader>
          <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
            <RuleCodeBadge code={f.rule_code} />
            <span className="min-w-0">{f.title}</span>
            <SeverityBadge severity={f.severity} />
            {f.quick_win === 1 && (
              <span
                className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                title="Quick win: fixable within days with documents the company already controls — worth ×1.5 in the priority score."
              >
                quick win
              </span>
            )}
            <span
              className="ml-auto cursor-help rounded-full bg-secondary px-2.5 py-0.5 text-sm font-semibold tabular-nums"
              title={breakdown}
            >
              Priority {f.score.toFixed(1)}
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground" title={breakdown}>
            {breakdown}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="max-w-3xl text-sm text-muted-foreground">{f.detail}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
            <p className="min-w-0 flex-1 basis-64 text-sm">
              <span className="font-medium">Suggested next step:</span>{" "}
              {f.suggested_step}
            </p>
            {existing ? (
              <Button
                variant="outline"
                size="sm"
                render={
                  <Link
                    href="/actions"
                    title={`"${existing.title}" — ${existing.owner}, due ${existing.due_date}`}
                  />
                }
              >
                View action
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : (
              <CreateActionDialog
                ruleCode={f.rule_code}
                defaultTitle={f.title}
                suggestedOwner={s.owner}
                suggestedDueDate={s.due_date}
                suggestedStep={s.next_step}
                owners={owners}
                disabledReason={createDenied}
              />
            )}
          </div>
        </CardContent>
      </Card>
    );
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Priorities</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {findings.length} findings, ranked by priority score — severity × asked-by-customer ×
          quick-win. Each comes with a suggested next step; promote it to an action with one click.
        </p>
      </div>

      <PillarLegend />

      <CappedList items={cards} cap={5} noun="findings" className="space-y-3" />
    </div>
  );
}
