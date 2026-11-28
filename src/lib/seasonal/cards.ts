/**
 * Turns the live seasonal packages into the cards shown on the home page and /seasonal. A
 * package with options (e.g. Mini, Classic, Premium) gives one card per option, so every
 * bookable price is visible. Pure.
 */
import type { Locale } from "@/config/site";
import { localize } from "@/lib/localize";

type CardTier = {
  key: string;
  name: string;
  nameFr: string | null;
  basePriceCents: number;
  inclusions: string[];
  inclusionsFr: string[];
};

type CardPackage = {
  slug: string;
  name: string;
  nameFr: string | null;
  summary: string;
  summaryFr: string | null;
  basePriceCents: number;
  regularPriceCents: number | null;
  editedImages: number | null;
  inclusions: string[];
  inclusionsFr: string[];
  offerEndsAt: Date | string | null;
  tiers: readonly CardTier[];
};

export type SeasonalCard = {
  /** Unique on the page; used for element ids. */
  id: string;
  packageSlug: string;
  /** Set for an option card, so booking preselects that option. */
  tierKey: string | null;
  name: string;
  summary: string | null;
  priceCents: number;
  regularPriceCents: number | null;
  editedImages: number | null;
  inclusions: string[];
  offerEndsAt: Date | string | null;
};

const localizeList = (english: string[], french: string[], locale: Locale) =>
  localize(english, french.length > 0 ? french : null, locale);

export function seasonalCards(
  packages: readonly CardPackage[],
  locale: Locale,
  { withInclusions = false }: { withInclusions?: boolean } = {},
): SeasonalCard[] {
  return packages.flatMap((pkg): SeasonalCard[] => {
    const packageName = localize(pkg.name, pkg.nameFr, locale);
    const summary = localize(pkg.summary, pkg.summaryFr, locale);
    const shared = { packageSlug: pkg.slug, offerEndsAt: pkg.offerEndsAt };

    if (pkg.tiers.length === 0) {
      return [
        {
          ...shared,
          id: pkg.slug,
          tierKey: null,
          name: packageName,
          summary,
          priceCents: pkg.basePriceCents,
          regularPriceCents: pkg.regularPriceCents,
          editedImages: pkg.editedImages,
          inclusions: withInclusions ? localizeList(pkg.inclusions, pkg.inclusionsFr, locale) : [],
        },
      ];
    }

    // The package's regular price and image count describe no single option, so options omit
    // them. Their inclusions take the place of the summary, which would repeat on every card.
    return pkg.tiers.map((tier) => {
      const tierName = localize(tier.name, tier.nameFr, locale);
      const inclusions = localizeList(tier.inclusions, tier.inclusionsFr, locale);
      return {
        ...shared,
        id: `${pkg.slug}--${tier.key}`,
        tierKey: tier.key,
        name: packages.length > 1 ? `${packageName} — ${tierName}` : tierName,
        summary: inclusions.length > 0 ? null : summary,
        priceCents: tier.basePriceCents,
        regularPriceCents: null,
        editedImages: null,
        inclusions,
      };
    });
  });
}
