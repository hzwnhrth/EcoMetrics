import { getStore } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UploadForm } from "@/components/upload-form";

export default async function UploadPage() {
  const store = await getStore();
  const byFile = new Map<string, number>();
  for (const e of store.evidence) byFile.set(e.source_file, (byFile.get(e.source_file) ?? 0) + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a corrected document — evidence is replaced, rules re-run, and open actions whose
          finding disappears are resolved as “verified by re-scan”.
        </p>
      </div>

      <UploadForm />

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
