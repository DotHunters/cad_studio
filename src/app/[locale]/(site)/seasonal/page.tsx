import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SeasonalOfferGrid } from "@/components/seasonal/seasonal-offer-grid";
import { SeasonalTitle } from "@/components/seasonal/seasonal-title";
import { JsonLd } from "@/components/site/json-ld";
import { ctaNav } from "@/components/site/nav-items";
import { SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { isPricingConfirmed } from "@/lib/flags";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { startingPriceCents } from "@/lib/pricing/options";
import { serviceJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getSeasonalOffers } from "@/server/queries/seasonal";

// Offers end on a date, so the live check must re-run regularly (queries are cached and tagged).
export const revalidate = 3600;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seasonal" });
  return pageMetadata({
    locale,
    path: "/seasonal",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Flyer-style landing page for the live seasonal offers; 404 when none is live. */
export default async function SeasonalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [offers, t, packagesT, navT] = await Promise.all([
    getSeasonalOffers(),
    getTranslations("Seasonal"),
    getTranslations("Packages"),
    getTranslations("Nav"),
  ]);
  if (!offers) notFound();

  const name = localize(offers.service.name, offers.service.nameFr, locale);
  const intro = localize(offers.service.description, offers.service.descriptionFr, locale);
  const unitLabel = { FLAT: "", PER_HOUR: "/ h", PER_ITEM: "/ item" };
  const phone = siteConfig.contact.phones[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      {offers.packages.map((pkg) => (
        <JsonLd
          key={pkg.id}
          data={serviceJsonLd({
            baseUrl: siteConfig.url,
            locale,
            pricingConfirmed: isPricingConfirmed(),
            pkg: {
              slug: pkg.slug,
              name: localize(pkg.name, pkg.nameFr, locale),
              description: localize(pkg.summary, pkg.summaryFr, locale),
              category: name,
              basePriceCents: startingPriceCents(pkg),
            },
          })}
        />
      ))}

      <SectionHeading
        as="h1"
        align="center"
        eyebrow={t("eyebrow")}
        title={<SeasonalTitle name={name} />}
        intro={intro}
      />

      <div className="mt-12">
        <SeasonalOfferGrid
          packages={offers.packages}
          locale={locale}
          withInclusions
          headingLevel="h2"
        />
      </div>

      {offers.addOns.length > 0 && (
        <section aria-labelledby="seasonal-addons" className="mx-auto mt-16 max-w-2xl">
          <h2 id="seasonal-addons" className="text-center text-3xl">
            {t("addOnsTitle")}
          </h2>
          <p className="text-muted-foreground mt-2 text-center text-sm">{t("addOnsIntro")}</p>
          <ul className="divide-border mt-6 divide-y rounded-xl border">
            {offers.addOns.map((addOn) => (
              <li key={addOn.code} className="flex items-center justify-between gap-4 px-5 py-3">
                <span>{localize(addOn.name, addOn.nameFr, locale)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCAD(addOn.priceCents, locale, { suffix: false })} {unitLabel[addOn.unit]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="seasonal-book"
        className="bg-ink text-paper mt-16 rounded-2xl px-6 py-10 text-center sm:px-12"
      >
        <h2 id="seasonal-book" className="text-3xl">
          {t("ribbonTitle")}
        </h2>
        <p className="text-paper/80 mx-auto mt-3 max-w-xl">{t("ribbonBody")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={ctaNav.book.href} className={cn(buttonVariants({ size: "cta" }))}>
            {navT("bookDate")}
          </Link>
          <Link
            href={ctaNav.quote.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "cta" }),
              "border-paper/50 text-paper hover:bg-paper hover:text-ink bg-transparent dark:bg-transparent",
            )}
          >
            {navT("getQuote")}
          </Link>
        </div>
      </section>

      <p className="text-muted-foreground mt-10 text-center text-sm">
        {t("contactLead")}{" "}
        <a className="hover:text-foreground underline" href={`mailto:${siteConfig.contact.email}`}>
          {siteConfig.contact.email}
        </a>
        {phone && (
          <>
            {" · "}
            <a className="hover:text-foreground underline" href={`tel:${phone.tel}`}>
              {phone.display}
            </a>
          </>
        )}
        {siteConfig.socials.instagram && (
          <>
            {" · "}
            <a
              className="hover:text-foreground underline"
              href={siteConfig.socials.instagram}
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </>
        )}
      </p>
      <p className="text-muted-foreground mt-6 text-center text-xs">{packagesT("taxNote")}</p>
    </div>
  );
}
