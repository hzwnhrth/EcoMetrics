import { getStore } from "@/lib/store";
import { AnchorBlock } from "@/components/anchor-block";

export default async function ReportPage() {
  const store = await getStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Full report body (pillar summary, top findings, actions, print styles) lands in Phase 7.
        </p>
      </div>
      <AnchorBlock anchor={store.meta.anchor} />
    </div>
  );
}
