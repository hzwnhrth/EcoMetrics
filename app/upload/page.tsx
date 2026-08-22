import { getStore } from "@/lib/store";
import { can, denyReason, getSessionUser } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadForm } from "@/components/upload-form";
import { ResetButton } from "@/components/reset-button";
import { AddEvidenceDialog } from "@/components/add-evidence-dialog";

export default async function UploadPage() {
  const store = await getStore();
  const user = await getSessionUser();
  const byFile = new Map<string, number>();
  for (const e of store.evidence) byFile.set(e.source_file, (byFile.get(e.source_file) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a corrected document — evidence is replaced, rules re-run, and open actions whose
            finding disappears are resolved as “verified by re-scan”.
          </p>
        </div>
        <div className="flex gap-2">
          <AddEvidenceDialog
            sourceFiles={[...byFile.keys()]}
            disabledReason={can(user, "manage_evidence") ? undefined : denyReason(user, "manage_evidence")}
          />
          <ResetButton
            disabledReason={can(user, "reset") ? undefined : denyReason(user, "reset")}
          />
        </div>
      </div>

      <UploadForm />

      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Try the demo:</span> the repo ships a corrected
        payroll register at{" "}
        <code className="font-mono">demo_assets/S_payroll_headcount_2025_FIXED.xlsx</code> in which
        SP-0009 and SP-0010 are raised to RM1,700+. Upload it as Payroll and watch S-WAGE close, its
        action auto-resolve, and the Social score lift — while every other action stays open.
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Currently ingested files</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead className="text-right">Evidence rows</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...byFile.entries()].map(([file, count]) => (
                <TableRow key={file}>
                  <TableCell className="font-mono text-xs">{file}</TableCell>
                  <TableCell className="text-right tabular-nums">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
