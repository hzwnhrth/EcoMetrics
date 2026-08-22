import * as XLSX from "xlsx";
import type { NewEvidence } from "../types";

// Deterministic SheetJS extraction — NO AI in this path (re-scan demo relies
// on it behaving identically every run).

const SHEET = "Payroll Dec 2025";
const HEADER_ROW = 5; // 1-indexed; data rows 6+ until first empty Staff ID
const PERIOD = "2025-12";

// Header text (trimmed) -> catalog field. Only cataloged S fields are emitted;
// numeric fields use the raw cell value so rules can Number(value) them.
const HEADER_MAP: Record<string, { field: string; unit: string; numeric?: boolean }> = {
  "Staff ID": { field: "staff_id", unit: "text" },
  "Department": { field: "department", unit: "text" },
  "Gender": { field: "gender", unit: "text" },
  "Nationality": { field: "nationality", unit: "text" },
  "Employment Type": { field: "employment_type", unit: "text" },
  "Date Joined": { field: "date_joined", unit: "date" },
  "Date Left": { field: "date_left", unit: "date" },
  "Basic Salary (RM)": { field: "basic_salary", unit: "RM", numeric: true },
  "Training Hours 2025": { field: "training_hours", unit: "hours", numeric: true },
  "Safety Induction Completed": { field: "safety_induction", unit: "bool" },
};

type Cell = { t: string; v: unknown; w?: string } | undefined;

function cellText(cell: Cell, numeric: boolean): string {
  if (!cell || cell.v === null || cell.v === undefined) return "";
  // numeric fields: raw value ("1620", not "1,620.00"); dates/text: formatted
  return numeric ? String(cell.v) : (cell.w ?? String(cell.v));
}

export function extractPayroll(buf: Buffer, source_file: string): NewEvidence[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[SHEET];
  if (!ws) throw new Error(`sheet "${SHEET}" not found in ${source_file}`);

  // resolve column index per cataloged field from the header row
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  const cols: { c: number; field: string; unit: string; numeric: boolean }[] = [];
  let staffIdCol = -1;
  for (let c = range.s.c; c <= range.e.c; c++) {
    const header = String(
      (ws[XLSX.utils.encode_cell({ r: HEADER_ROW - 1, c })] as Cell)?.v ?? ""
    ).trim();
    const m = HEADER_MAP[header];
    if (!m) continue;
    cols.push({ c, field: m.field, unit: m.unit, numeric: !!m.numeric });
    if (m.field === "staff_id") staffIdCol = c;
  }
  if (staffIdCol === -1) throw new Error(`no "Staff ID" header on row ${HEADER_ROW}`);

  const rows: NewEvidence[] = [];
  for (let r = HEADER_ROW; r <= range.e.r; r++) {
    const staffId = cellText(ws[XLSX.utils.encode_cell({ r, c: staffIdCol })] as Cell, false);
    if (!staffId.trim()) break; // first empty Staff ID ends the data
    for (const col of cols) {
      const addr = XLSX.utils.encode_cell({ r, c: col.c });
      // department: store RAW value (rules need the raw inconsistency);
      // blank cells emit NOTHING — blank ≠ zero, rules detect absence
      const value = cellText(ws[addr] as Cell, col.numeric);
      if (value === "") continue;
      rows.push({
        source_file,
        source_ref: `${SHEET}!${addr}`,
        pillar: "S",
        field: col.field,
        value,
        unit: col.unit,
        period: PERIOD,
        confidence: "verified",
      });
    }
  }

  // Summary sheet: "Headcount per HR system" row -> hr_system_headcount
  const summary = wb.Sheets["Summary"];
  if (summary) {
    const sRange = XLSX.utils.decode_range(summary["!ref"] as string);
    for (let r = sRange.s.r; r <= sRange.e.r; r++) {
      const label = String((summary[XLSX.utils.encode_cell({ r, c: 0 })] as Cell)?.v ?? "");
      if (!label.startsWith("Headcount per HR system")) continue;
      const addr = XLSX.utils.encode_cell({ r, c: 1 });
      const value = cellText(summary[addr] as Cell, true);
      if (value !== "") {
        rows.push({
          source_file,
          source_ref: `Summary!${addr}`,
          pillar: "S",
          field: "hr_system_headcount",
          value,
          unit: "person",
          period: PERIOD,
          confidence: "inferred",
          note: "typed manually, not reconciled",
        });
      }
      break;
    }
  }

  return rows;
}
