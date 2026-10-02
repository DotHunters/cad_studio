/**
 * Readable "what changed" lines for the admin audit log (AGENTS.md §6.10). Pure.
 */
export type FieldSpec = { label: string; format?: (value: unknown) => string };

const show = (value: unknown, format?: (value: unknown) => string) => {
  if (format) return format(value);
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
};

const same = (a: unknown, b: unknown) =>
  typeof a === "object" || typeof b === "object"
    ? JSON.stringify(a) === JSON.stringify(b)
    : a === b;

/** "price $2,800.00 → $3,000.00" for each field that changed (in `fields` order). */
export function describeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: Record<string, FieldSpec>,
): string[] {
  return Object.entries(fields)
    .filter(([key]) => !same(before[key], after[key]))
    .map(
      ([key, spec]) =>
        `${spec.label} ${show(before[key], spec.format)} → ${show(after[key], spec.format)}`,
    );
}

/** One summary line: "Wedding: price $2,800.00 → $3,000.00; active yes → no". */
export function auditSummary(subject: string, changes: string[], fallback = "no changes"): string {
  return `${subject}: ${changes.length ? changes.join("; ") : fallback}`;
}
