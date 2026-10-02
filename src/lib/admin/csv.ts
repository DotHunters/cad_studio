/**
 * CSV export helpers (AGENTS.md §6.10). RFC 4180 quoting, plus protection against formula
 * injection: a cell starting with = + - @ (or a tab/CR) is prefixed with ' so spreadsheet apps
 * show it as text instead of running it.
 */
export type CsvCell = string | number | boolean | null | undefined;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows → CSV text with CRLF line endings and a UTF-8 BOM (so Excel reads accents). */
export function toCsv(header: readonly string[], rows: ReadonlyArray<readonly CsvCell[]>): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Cents → "1234.50" (plain number for spreadsheets). */
export const centsToDecimal = (cents: number | null) =>
  cents === null ? "" : (cents / 100).toFixed(2);
