import type { Locale } from "@/config/site";
import { formatInStudioTz } from "@/lib/dates";
import { seasonalCards } from "@/lib/seasonal/cards";
import type { PackageSummary } from "@/server/queries/packages";

import { SeasonalOfferCard } from "./seasonal-offer-card";

/**
 * Live seasonal offers as cards (one per package option); one column on phones, as many as fit
 * on wide screens.
 */
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
      {seasonalCards(packages, locale, { withInclusions }).map(({ id, offerEndsAt, ...card }) => (
        <li key={id}>
          <SeasonalOfferCard
            {...card}
            headingId={`seasonal-offer-${id}`}
            endsOn={offerEndsAt ? formatInStudioTz(offerEndsAt, "PPP", locale) : null}
            locale={locale}
            headingLevel={headingLevel}
          />
        </li>
      ))}
    </ul>
  );
}
