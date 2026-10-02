import type { Metadata } from "next";

import { PricingRulesForm } from "@/components/admin/pricing-rules-form";
import { TaxRatesForm } from "@/components/admin/tax-rates-form";
import { ruleFormDefaults } from "@/lib/admin/pricing-rules";
import { fractionToPercent } from "@/lib/admin/tax-rates";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Pricing and tax" };

// Canadian provinces first in a familiar order, then outside Canada.
const PROVINCE_ORDER = [
  "ON",
  "QC",
  "BC",
  "AB",
  "MB",
  "SK",
  "NS",
  "NB",
  "NL",
  "PE",
  "NT",
  "NU",
  "YT",
  "INTL",
];

export default async function AdminPricingPage() {
  await requireAdminPage("ADMIN");
  const [rules, taxRates] = await Promise.all([
    db.pricingRule.findMany({ select: { key: true, value: true } }),
    db.taxRate.findMany(),
  ]);
  const { values, offSeasonMonths } = ruleFormDefaults(rules);
  const rank = (province: string) => {
    const index = PROVINCE_ORDER.indexOf(province);
    return index === -1 ? PROVINCE_ORDER.length : index;
  };
  const rows = [...taxRates]
    .sort((a, b) => rank(a.province) - rank(b.province))
    .map((rate) => ({
      province: rate.province,
      gst: fractionToPercent(rate.gst.toString()),
      pst: fractionToPercent(rate.pst.toString()),
      hst: fractionToPercent(rate.hst.toString()),
      label: rate.label,
    }));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-heading text-4xl">Pricing and tax</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rules used by the quote calculator and online booking. Package and add-on prices are
          edited on their own pages.
        </p>
      </div>

      <section aria-labelledby="rules-title">
        <h2 id="rules-title" className="font-heading mb-4 text-2xl">
          Pricing and booking rules
        </h2>
        <PricingRulesForm values={values} offSeasonMonths={offSeasonMonths} />
      </section>

      <section aria-labelledby="tax-title">
        <h2 id="tax-title" className="font-heading text-2xl">
          Sales tax
        </h2>
        <p className="text-muted-foreground mt-1 mb-4 text-sm">
          Check rates and whether PST applies to photography with your accountant before launch.
        </p>
        <TaxRatesForm rows={rows} />
      </section>
    </div>
  );
}
