import * as z from "zod";

import { SERVICE_SLUG_PATTERN } from "@/lib/services";

import { checkbox, optionalInteger, optionalText, text } from "./fields";

/**
 * Admin portfolio project form (AGENTS.md §6.3, §6.10). The client's name is only shown
 * publicly when the admin confirms consent (§13); otherwise "Private client".
 */
export const projectFormSchema = z.object({
  slug: z
    .string("Required.")
    .trim()
    .toLowerCase()
    .min(1, "Required.")
    .max(80, "Keep it under 80 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  title: text(150),
  titleFr: optionalText(150),
  clientName: optionalText(120),
  consentToPublish: checkbox,
  category: z.string("Choose a service.").regex(SERVICE_SLUG_PATTERN, "Choose a service."),
  reach: z.enum(["LOCAL", "GLOBAL"], "Choose local or global."),
  city: optionalText(80),
  country: text(80),
  year: optionalInteger(1990, 2100),
  story: text(20_000),
  storyFr: optionalText(20_000),
  featured: checkbox,
  published: checkbox,
});

export type ProjectFormValues = z.output<typeof projectFormSchema>;

/**
 * publishedAt after saving: keep the original date while published, set it when first
 * published, clear it when unpublished.
 */
export function nextPublishedAt(published: boolean, current: Date | null, now: Date): Date | null {
  if (!published) return null;
  return current ?? now;
}
