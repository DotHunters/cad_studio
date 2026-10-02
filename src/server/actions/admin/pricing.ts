"use server";

import type { Prisma } from "@/generated/prisma/client";
import { OFF_SEASON_MONTHS_KEY, pricingRulesFormSchema } from "@/lib/admin/pricing-rules";
import { percentToFraction, taxRateErrors, taxRatesFormSchema } from "@/lib/admin/tax-rates";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

export type SettingsResult =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string> }
  | { ok: false; error: "server" };

/** The quote engine, package pages and booking terms all read rules and tax rates. */
const revalidatePricing = () => revalidateContent("packages", "settings");

/** Saves every pricing/booking rule at once (AGENTS.md §8.1, §8.3). ADMIN only. */
export async function savePricingRules(input: unknown): Promise<SettingsResult> {
  await requireRole("ADMIN");
  const parsed = pricingRulesFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const entries = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: (key === OFF_SEASON_MONTHS_KEY
      ? [...new Set(value as number[])].sort((a, b) => a - b)
      : value) as Prisma.InputJsonValue,
  }));
  try {
    await db.$transaction(
      entries.map(({ key, value }) =>
        db.pricingRule.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );
  } catch (error) {
    console.error("[admin] savePricingRules failed", error);
    return { ok: false, error: "server" };
  }
  revalidatePricing();
  return { ok: true };
}

/**
 * Updates the seeded provinces' tax rates (AGENTS.md §8.2). ADMIN only. Provinces aren't
 * added or removed here — an unknown province is ignored.
 */
export async function saveTaxRates(input: unknown): Promise<SettingsResult> {
  await requireRole("ADMIN");
  const fieldErrors = taxRateErrors(input);
  if (fieldErrors) return { ok: false, fieldErrors };
  const rows = taxRatesFormSchema.parse(input);

  try {
    await db.$transaction(
      rows.map((row) =>
        db.taxRate.updateMany({
          where: { province: row.province },
          data: {
            gst: percentToFraction(row.gst),
            pst: percentToFraction(row.pst),
            hst: percentToFraction(row.hst),
            label: row.label,
          },
        }),
      ),
    );
  } catch (error) {
    console.error("[admin] saveTaxRates failed", error);
    return { ok: false, error: "server" };
  }
  revalidatePricing();
  return { ok: true };
}
