import type { Locale } from "@/config/site";
import { formatInStudioTz } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { startingPriceCents } from "@/lib/pricing/options";
import type { PackageSummary } from "@/server/queries/packages";

import { SeasonalOfferCard } from "./seasonal-offer-card";

/** Live seasonal packages as cards; one column on phones, as many as fit on wide screens. */
export function SeasonalOfferGrid({
  packages,
  locale,
  withInclusions = false,
  headingLevel = "h3",
}: {
  packages: readonly PackageSummary[];
  locale: Locale;
  withInclusions?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  return (
    <ul className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-5">
      {packages.map((pkg) => {
        const tiered = pkg.tiers.length > 0;
        return (
          <li key={pkg.id}>
            <SeasonalOfferCard
              headingId={`seasonal-offer-${pkg.slug}`}
              packageSlug={pkg.slug}
              name={localize(pkg.name, pkg.nameFr, locale)}
              summary={localize(pkg.summary, pkg.summaryFr, locale)}
              priceCents={startingPriceCents(pkg)}
              startingAt={tiered}
              regularPriceCents={tiered ? null : pkg.regularPriceCents}
              editedImages={tiered ? null : pkg.editedImages}
              inclusions={
                withInclusions
                  ? localize(
                      pkg.inclusions,
                      pkg.inclusionsFr.length ? pkg.inclusionsFr : null,
                      locale,
                    )
                  : []
              }
              endsOn={pkg.offerEndsAt ? formatInStudioTz(pkg.offerEndsAt, "PPP", locale) : null}
              locale={locale}
              headingLevel={headingLevel}
            />
          </li>
        );
      })}
    </ul>
  );
}
