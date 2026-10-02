/**
 * Admin-editable text settings (AGENTS.md §6.6, §7 `SiteSetting`). Stored as `{ en, fr }`.
 * Both languages are required: clients read these in their own language.
 */
import { z } from "zod";

import { parseLocalizedText } from "@/lib/content";

import { text } from "../validators/admin/fields";

export type SiteSettingDefinition = { key: string; label: string; help: string };

export const SITE_SETTING_DEFINITIONS: readonly SiteSettingDefinition[] = [
  {
    key: "CANCELLATION_POLICY",
    label: "Cancellation policy",
    help: "Shown on package pages and in booking emails.",
  },
  {
    key: "PAYMENT_INSTRUCTIONS",
    label: "Payment instructions",
    help: "Bank transfer details and deposit due date, sent with each payment request. Never shown on the website.",
  },
];

const localized = z.object({ en: text(5000), fr: text(5000) });

export const siteSettingsFormSchema = z.object(
  Object.fromEntries(SITE_SETTING_DEFINITIONS.map((definition) => [definition.key, localized])),
) as unknown as z.ZodType<Record<string, { en: string; fr: string }>, unknown>;

/** Stored settings → form values; missing or malformed settings start empty. */
export function siteSettingDefaults(records: ReadonlyArray<{ key: string; value: unknown }>) {
  const byKey = new Map(records.map((record) => [record.key, parseLocalizedText(record.value)]));
  return Object.fromEntries(
    SITE_SETTING_DEFINITIONS.map((definition) => [
      definition.key,
      byKey.get(definition.key) ?? { en: "", fr: "" },
    ]),
  ) as Record<string, { en: string; fr: string }>;
}

/** Field errors keyed "KEY.en" / "KEY.fr". */
export function siteSettingErrors(input: unknown): Record<string, string> | null {
  const result = siteSettingsFormSchema.safeParse(input);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    errors[issue.path.map(String).join(".")] ??= issue.message;
  }
  return errors;
}

/** Placeholder text (TODO…) is never shown to clients; the admin form warns about it. */
export const isPlaceholderText = (value: string) => value.trim().startsWith("TODO(");
