import { getLocale, getTranslations } from "next-intl/server";

import { SeasonalOfferGrid } from "@/components/seasonal/seasonal-offer-grid";
import { SeasonalTitle } from "@/components/seasonal/seasonal-title";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { getSeasonalOffers } from "@/server/queries/seasonal";

import { SectionHeading } from "./section-heading";

/**
 * Home section right after the hero: the live seasonal offers with a Book button each.
 * Renders nothing when no seasonal package is live, so it never shows an empty or ended offer.
 */
export async function SeasonalBookingStrip() {
  const offers = await getSeasonalOffers();
  if (!offers) return null;

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Seasonal");
  const name = localize(offers.service.name, offers.service.nameFr, locale);
  const intro = localize(offers.service.description, offers.service.descriptionFr, locale);

  return (
    <section
      aria-labelledby="seasonal-title"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16"
    >
      <SectionHeading
        id="seasonal-title"
        align="center"
        eyebrow={t("eyebrow")}
        title={<SeasonalTitle name={name} />}
        intro={intro}
        className="mb-10"
      />
      <SeasonalOfferGrid packages={offers.packages} locale={locale} />
      <p className="mt-8 text-center">
        <Link
          href="/seasonal"
          className="text-gold-text text-sm underline-offset-4 hover:underline"
        >
          {t("viewAll")}
        </Link>
      </p>
    </section>
  );
}
