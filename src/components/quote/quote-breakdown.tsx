"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import type { Locale } from "@/config/site";
import { formatCAD } from "@/lib/money";
import type { LineItem, QuoteResult } from "@/lib/pricing/calculate-quote";

type Props = {
  result: QuoteResult | null;
  locale: Locale;
  packageName: string;
  addOnNames: Record<string, string>;
  depositPct: number;
};

/** Itemized live estimate (AGENTS.md §6.5). Announces total changes politely to screen readers. */
export function QuoteBreakdown({ result, locale, packageName, addOnNames, depositPct }: Props) {
  const t = useTranslations("Quote");
  const money = (cents: number) => formatCAD(cents, locale, { suffix: false });

  const label = (item: LineItem): string => {
    switch (item.kind) {
      case "base":
        return t("lines.base", { name: packageName });
      case "extraHours":
        return t("lines.extraHours", { hours: item.hours });
      case "extraShooters":
        return t("lines.extraShooters", { count: item.shooters, hours: item.hours });
      case "addOn": {
        const name = addOnNames[item.code] ?? item.code;
        return item.quantity > 1
          ? t("lines.addOnQty", { name, qty: item.quantity })
          : t("lines.addOn", { name });
      }
      case "travel":
        return t("lines.travel", { km: item.km });
      case "surcharge":
      case "discount":
        return t(`lines.${item.code}`);
    }
  };

  return (
    <section aria-labelledby="estimate-title" className="bg-card rounded-xl border p-6 shadow-sm">
      <h2 id="estimate-title" className="text-2xl">
        {t("summaryTitle")}
      </h2>

      {!result ? (
        <p className="text-muted-foreground mt-4 text-sm">{t("incomplete")}</p>
      ) : (
        <>
          <dl className="divide-border mt-4 divide-y text-sm">
            {result.lineItems.map((item, index) => (
              <div key={`${item.kind}-${index}`} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{label(item)}</dt>
                <dd className="whitespace-nowrap lining-nums">{money(item.amountCents)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4 py-2 font-medium">
              <dt>{t("subtotal")}</dt>
              <dd className="lining-nums">{money(result.subtotalCents)}</dd>
            </div>
            {result.taxLines.map((line) => (
              <div key={line.code} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">
                  {line.code} ({line.rate})
                </dt>
                <dd className="lining-nums">{money(line.amountCents)}</dd>
              </div>
            ))}
          </dl>

          <div className="border-border mt-2 border-t pt-4" aria-live="polite" aria-atomic="true">
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {t("total")}
            </p>
            <p className="font-heading text-4xl lining-nums" data-testid="quote-total">
              {formatCAD(result.totalCents, locale)}
            </p>
            <p className="text-muted-foreground mt-1 text-sm lining-nums">
              {t("deposit", { percent: depositPct })}: {money(result.depositCents)}
            </p>
          </div>

          {result.flags.customTravelQuote && (
            <p className="border-gold/50 bg-gold-light/20 mt-4 flex gap-2 rounded-lg border p-3 text-sm">
              <Info className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
              {t("customTravel")}
            </p>
          )}
        </>
      )}

      <p className="text-muted-foreground mt-4 text-xs">{t("disclaimer")}</p>
    </section>
  );
}
