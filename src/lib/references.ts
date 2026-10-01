/** Human-friendly references (AGENTS.md §6.5, §6.6): CAD-Q-YYYY-#### quotes, CAD-B-YYYY-#### bookings. */
export type ReferenceType = "Q" | "B";

export function formatReference(type: ReferenceType, year: number, sequence: number): string {
  return `CAD-${type}-${year}-${String(sequence).padStart(4, "0")}`;
}

/** ReferenceCounter key: one sequence per type per year. */
export function counterKey(type: ReferenceType, year: number): string {
  return `${type}-${year}`;
}

const PATTERN = /^CAD-([QB])-(\d{4})-(\d{4,})$/;

export function parseReference(value: string) {
  const match = PATTERN.exec(value);
  if (!match) return null;
  return { type: match[1] as ReferenceType, year: Number(match[2]), sequence: Number(match[3]) };
}
