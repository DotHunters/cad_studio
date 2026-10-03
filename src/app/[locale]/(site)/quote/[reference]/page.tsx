import { ArrowUpRight, CalendarClock } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { QuoteBreakdown } from "@/components/quote/quote-breakdown";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { parseReference } from "@/lib/references";
import { verifySignedValue } from "@/lib/signing";
import { cn } from "@/lib/utils";
import { savedOptionName } from "@/lib/pricing/options";
import { linkSecret } from "@/server/link-secret";
import { getPricingContext } from "@/server/queries/pricing";
import { getQuoteByReference } from "@/server/queries/quotes";

type Props = {
  params: Promise<{ locale: Locale; reference: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "QuoteResult" });
  // Private page: never indexed.
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * Private quote page (AGENTS.md §6.5). References are sequential, so the link must carry a
 * valid signature; anything else is a 404 that doesn't reveal whether the quote exists.
 */
export default async function QuoteResultPage({ params, searchParams }: Props) {
  const { locale, reference } = await params;
  setRequestLocale(locale);
  const token = (await searchParams).t;
  const signature = typeof token === "string" ? token : undefined;

  if (
    !parseReference(reference) ||
    !verifySignedValue(`quote:${reference}`, signature, linkSecret())
  ) {
    notFound();
  }
  const [quote, context, t] = await Promise.all([
    getQuoteByReference(reference),
    getPricingContext(),
    getTranslations(),
  ]);
  if (!quote) notFound();

  const cancelled = quote.status === "CANCELLED";
  // A cancelled quote reads like an expired one: no booking, a nudge to quote again.
  const expired = cancelled || quote.expiresAt < new Date();
  const firstName = quote.customer.name.split(/\s+/)[0];
  const { breakdown } = quote;
  const packageName = savedOptionName(breakdown, quote.package, locale) ?? "—";
  const location = quote.isInternational
    ? t("Provinces.INTL")
    : [quote.city, t(`Provinces.${quote.province as "ON"}`)].filter(Boolean).join(", ");

  const facts = [
    {
      label: t("QuoteResult.event"),
      value: t(`Categories.${slugFromCategory(quote.category)}.name`),
    },
    { label: t("QuoteResult.package"), value: packageName },
    { label: t("QuoteResult.date"), value: formatInStudioTz(quote.eventDate, "PPPP", locale) },
    { label: t("QuoteResult.time"), value: formatInStudioTz(quote.eventDate, "p", locale) },
    {
      label: t("QuoteResult.coverage"),
      value: t("QuoteResult.hours", { count: Number(quote.durationHours) }),
    },
    { label: t("QuoteResult.photographers"), value: String(quote.photographers) },
    { label: t("QuoteResult.location"), value: location },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        as="h1"
        eyebrow={t("QuoteResult.eyebrow", { reference })}
        title={t.rich("QuoteResult.title", {
          accent: (chunks: ReactNode) => <Accent>{chunks}</Accent>,
        })}
        intro={t("QuoteResult.greeting", { name: firstName })}
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          <dl className="divide-border divide-y rounded-xl border">
            {facts.map((fact) => (
              <div key={fact.label} className="flex justify-between gap-4 px-5 py-3">
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd className="text-right">{fact.value}</dd>
              </div>
            ))}
          </dl>

          <p
            role={expired ? "alert" : undefined}
            className={cn(
              "mt-6 flex gap-2 text-sm",
              expired
                ? "border-gold/50 bg-gold-light/20 rounded-lg border p-3"
                : "text-muted-foreground",
            )}
          >
            <CalendarClock className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
            {cancelled
              ? t("QuoteResult.cancelled")
              : expired
                ? t("QuoteResult.expired", {
                    date: formatInStudioTz(quote.expiresAt, "PPP", locale),
                  })
                : t("QuoteResult.validUntil", {
                    date: formatInStudioTz(quote.expiresAt, "PPP", locale),
                  })}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {!expired && (
              <Link
                href={{ pathname: "/book", query: { quote: reference, t: signature } }}
                className={cn(buttonVariants({ size: "cta" }))}
              >
                {t("QuoteResult.book")}
                <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            )}
            <Link
              href={{
                pathname: "/quote",
                // The option it was priced with ("wedding:gold"); findOption understands it.
                query: quote.package
                  ? { package: breakdown.packageSlug || quote.package.slug }
                  : {},
              }}
              className={cn(
                buttonVariants({ variant: expired ? "default" : "outline", size: "cta" }),
              )}
            >
              {t("QuoteResult.newQuote")}
            </Link>
          </div>
        </div>

        <aside>
          <QuoteBreakdown
            result={{
              lineItems: breakdown.lineItems,
              subtotalCents: quote.subtotalCents,
              taxLines: breakdown.taxLines,
              taxCents: quote.taxCents,
              totalCents: quote.totalCents,
              depositCents: breakdown.depositCents,
              flags: breakdown.flags,
            }}
            locale={locale}
            packageName={packageName}
            addOnNames={Object.fromEntries(
              context.addOns.map((addOn) => [
                addOn.code,
                localize(addOn.name, addOn.nameFr, locale),
              ]),
            )}
            depositPct={context.rules.DEPOSIT_PCT}
          />
        </aside>
      </div>
    </div>
  );
}
