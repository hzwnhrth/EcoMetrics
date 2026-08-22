// Display formatting — data stays ISO everywhere; the UI shows "25 Aug 2026"
// (QA item 17: one date format on every screen).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  return d ? `${Number(d)} ${month} ${y}` : `${month} ${y}`;
}

export function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return iso;
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${formatDate(dt.toISOString().slice(0, 10))}, ${hh}:${mm}`;
}

// "SP-0009", "SP-0010" -> "SP-0009 and SP-0010"; three+ -> "a, b and c"
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
