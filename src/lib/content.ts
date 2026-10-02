/** Parsers for admin-editable JSON content stored in the DB. Pure, so unit tested. */

/** `{ en, fr }` localized text (SiteSetting values). */
export function parseLocalizedText(value: unknown): { en: string; fr: string } | null {
  if (value && typeof value === "object" && "en" in value && "fr" in value) {
    const { en, fr } = value as Record<string, unknown>;
    if (typeof en === "string" && typeof fr === "string") return { en, fr };
  }
  return null;
}

/** Package FAQs are stored as JSON: [{ q, a, qFr?, aFr? }]. Invalid entries are skipped. */
export function parseFaqs(
  value: unknown,
): Array<{ q: string; a: string; qFr?: string; aFr?: string }> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is { q: string; a: string; qFr?: string; aFr?: string } =>
      item !== null &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).q === "string" &&
      typeof (item as Record<string, unknown>).a === "string",
  );
}

/** Hides seeded placeholder copy (text starting with "TODO(") until the owner replaces it in admin. */
export function publishableText(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed || trimmed.startsWith("TODO(")) return null;
  return trimmed;
}
