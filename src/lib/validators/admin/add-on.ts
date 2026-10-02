import * as z from "zod";

import { categorySlugs } from "@/lib/categories";

import { checkbox, dollarsToCents, integer, optionalText, text } from "./fields";

export const ADD_ON_UNITS = ["FLAT", "PER_HOUR", "PER_ITEM"] as const;

/**
 * Admin add-on form (AGENTS.md §6.10, §8.1). Saved quotes refer to add-ons by `code`, so the
 * code is set once on creation and never edited.
 */
export const addOnFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .max(30, "Keep it under 30 characters.")
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use capital letters, numbers and underscores, e.g. PHOTO_BOOTH.")
    .optional(),
  name: text(120),
  nameFr: optionalText(120),
  price: dollarsToCents,
  unit: z.enum(ADD_ON_UNITS, "Choose how it's charged."),
  categories: z.preprocess(
    (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
    z.array(z.enum(categorySlugs)).min(1, "Choose at least one service."),
  ),
  isActive: checkbox,
  sortOrder: integer(0, 1000),
});

export type AddOnFormValues = z.output<typeof addOnFormSchema>;
