import * as z from "zod";

import { SERVICE_SLUG_PATTERN } from "@/lib/services";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);
const serviceSlug = z.string().regex(SERVICE_SLUG_PATTERN).max(60);
const addOnCode = z.string().regex(/^[A-Z0-9_]+$/).max(40);
const cents = z.number().int().min(0).max(100_000_000);
const lines = z.array(z.string().trim().min(1).max(300)).max(40);
const optionalCount = (max: number) => z.number().int().min(0).max(max).nullable().optional();

const tierSchema = z.object({
  key: slug,
  name: z.string().trim().min(1).max(60),
  nameFr: z.string().trim().max(60).nullable().optional(),
  basePriceCents: cents,
  includedHours: z.number().int().min(1).max(24),
  includedShooters: z.number().int().min(1).max(10),
  editedImages: optionalCount(10_000),
  turnaroundDays: optionalCount(365),
  inclusions: lines,
  inclusionsFr: lines,
});

const packageSchema = z.object({
  slug,
  category: serviceSlug,
  name: z.string().trim().min(1).max(120),
  nameFr: z.string().trim().max(120).nullable().optional(),
  summary: z.string().trim().min(1).max(300),
  summaryFr: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().min(1).max(10_000),
  descriptionFr: z.string().trim().max(10_000).nullable().optional(),
  basePriceCents: cents,
  includedHours: z.number().int().min(1).max(24),
  includedShooters: z.number().int().min(1).max(10),
  editedImages: optionalCount(10_000),
  turnaroundDays: optionalCount(365),
  inclusions: lines,
  inclusionsFr: lines,
  exclusions: lines,
  exclusionsFr: lines,
  sortOrder: z.number().int().min(0).max(10_000),
  /** Options in display order; keys never change (saved quotes refer to them). */
  tiers: z
    .array(tierSchema)
    .max(6)
    .refine((list) => new Set(list.map((tier) => tier.key)).size === list.length, {
      message: "Tier keys must be unique.",
    }),
  /** Add-ons offered with this package — exactly these, by code. */
  addOnCodes: z.array(addOnCode).max(30),
});

const addOnSchema = z.object({
  code: addOnCode,
  name: z.string().trim().min(1).max(120),
  nameFr: z.string().trim().max(120).nullable().optional(),
  priceCents: cents,
  unit: z.enum(["FLAT", "PER_HOUR", "PER_ITEM"]),
  /** Services the add-on is offered for (replaces the current list). */
  categories: z.array(serviceSlug).max(20),
  sortOrder: z.number().int().min(0).max(10_000),
});

/**
 * Body of `POST /api/admin/packages/import` (scripts/push-packages.ts). The listed packages
 * become the full set: matching slugs are updated, new ones created, all others deleted.
 * Listed add-ons are created or updated; other add-ons are only linked by code.
 */
export const packageImportSchema = z
  .object({
    dryRun: z.boolean().default(true),
    packages: z
      .array(packageSchema)
      .min(1)
      .max(50)
      .refine((list) => new Set(list.map((pkg) => pkg.slug)).size === list.length, {
        message: "Package slugs must be unique.",
      }),
    addOns: z
      .array(addOnSchema)
      .max(50)
      .refine((list) => new Set(list.map((addOn) => addOn.code)).size === list.length, {
        message: "Add-on codes must be unique.",
      }),
  })
  .strict();

export type PackageImport = z.output<typeof packageImportSchema>;
