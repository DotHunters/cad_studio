"use server";

import type { Prisma } from "@/generated/prisma/client";
import { OFF_SEASON_MONTHS_KEY, pricingRulesFormSchema } from "@/lib/admin/pricing-rules";
import {
  fractionToPercent,
  percentToFraction,
  taxRateErrors,
  taxRatesFormSchema,
} from "@/lib/admin/tax-rates";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { audit } from "@/server/audit";
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
  const actor = await requireRole("ADMIN");
  const parsed = pricingRulesFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const entries = Object.entries(parsed.data).map(([key, value]) => ({
    key,
    value: (key === OFF_SEASON_MONTHS_KEY
      ? [...new Set(value as number[])].sort((a, b) => a - b)
      : value) as Prisma.InputJsonValue,
  }));
  const previous = new Map(
    (await db.pricingRule.findMany({ select: { key: true, value: true } })).map((rule) => [
      rule.key,
      rule.value,
    ]),
  );
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
  const changes = entries
    .filter(({ key, value }) => JSON.stringify(previous.get(key)) !== JSON.stringify(value))
    .map(
      ({ key, value }) =>
        `${key} ${JSON.stringify(previous.get(key) ?? null)} → ${JSON.stringify(value)}`,
    );
  if (changes.length) {
    await audit(actor, {
      action: "pricing.rules",
      entityType: "PricingRule",
      summary: `Pricing rules: ${changes.join("; ")}`,
    });
  }
  revalidatePricing();
  return { ok: true };
}

/**
 * Updates the seeded provinces' tax rates (AGENTS.md §8.2). ADMIN only. Provinces aren't
 * added or removed here — an unknown province is ignored.
 */
export async function saveTaxRates(input: unknown): Promise<SettingsResult> {
  const actor = await requireRole("ADMIN");
  const fieldErrors = taxRateErrors(input);
  if (fieldErrors) return { ok: false, fieldErrors };
  const rows = taxRatesFormSchema.parse(input);

  const previous = new Map(
    (await db.taxRate.findMany()).map((rate) => [
      rate.province,
      [rate.gst, rate.pst, rate.hst].map((part) => fractionToPercent(part.toString())).join("/") +
        ` ${rate.label}`,
    ]),
  );
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
  const taxChanges = rows.flatMap((row) => {
    const now = `${[row.gst, row.pst, row.hst].map((part) => fractionToPercent(percentToFraction(part))).join("/")} ${row.label}`;
    const was = previous.get(row.province);
    return was !== undefined && was !== now ? [`${row.province} ${was} → ${now}`] : [];
  });
  if (taxChanges.length) {
    await audit(actor, {
      action: "pricing.tax",
      entityType: "TaxRate",
      summary: `Tax (GST/PST/HST %): ${taxChanges.join("; ")}`,
    });
  }
  revalidatePricing();
  return { ok: true };
}
