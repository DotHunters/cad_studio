import "server-only";

import { SEASONAL_SERVICE_SLUG } from "@/lib/seasonal/offer";
import { getActivePackages } from "@/server/queries/packages";
import { getPricingContext } from "@/server/queries/pricing";
import { getServices } from "@/server/queries/services";

/**
 * The live seasonal offers: the `seasonal` service, its live packages and its add-ons, or
 * `null` when the service is missing/archived or has no live package. `null` is what hides
 * the home strip and 404s /seasonal.
 */
export async function getSeasonalOffers() {
  const [services, packages, context] = await Promise.all([
    getServices(),
    getActivePackages(),
    getPricingContext(),
  ]);
  const service = services.find((row) => row.slug === SEASONAL_SERVICE_SLUG && row.active);
  const live = packages.filter((pkg) => pkg.category === SEASONAL_SERVICE_SLUG);
  if (!service || live.length === 0) return null;
  return {
    service,
    packages: live,
    addOns: context.addOns.filter((addOn) => addOn.categories.includes(SEASONAL_SERVICE_SLUG)),
  };
}

export type SeasonalOffers = NonNullable<Awaited<ReturnType<typeof getSeasonalOffers>>>;
