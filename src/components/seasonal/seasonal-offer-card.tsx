import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { formatCAD } from "@/lib/money";
import { cn } from "@/lib/utils";

const MAX_INCLUSIONS = 5;

export type SeasonalOfferCardProps = {
  headingId: string;
  packageSlug: string;
  /** Set when the card is one option of a package, so booking preselects it. */
  tierKey: string | null;
  name: string;
  /** Null when the inclusions describe the offer instead. */
  summary: string | null;
  priceCents: number;
  /** Struck-through price; null when there is no offer discount to show. */
  regularPriceCents: number | null;
  editedImages: number | null;
  inclusions: string[];
  /** Already formatted, e.g. "December 25, 2026"; null when the offer has no end date. */
  endsOn: string | null;
  locale: Locale;
  /** Heading level for the offer name: h2 when the page has only an h1 above the cards. */
  headingLevel: "h2" | "h3";
};

/** One seasonal offer: price, struck-through regular price, key facts and a Book button. */
export function SeasonalOfferCard({
  headingId,
  packageSlug,
  tierKey,
  name,
  summary,
  priceCents,
  regularPriceCents,
  editedImages,
  inclusions,
  endsOn,
  locale,
  headingLevel: Heading,
}: SeasonalOfferCardProps) {
  const t = useTranslations();
  const facts = [
    editedImages !== null && t("Packages.editedImages", { count: editedImages }),
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <article
      aria-labelledby={headingId}
      className="bg-card text-card-foreground hover:border-gold relative flex h-full flex-col rounded-xl border p-6 shadow-sm transition-colors"
    >
      {regularPriceCents !== null && (
        <span className="bg-gold-button absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-[0.15em] uppercase">
          {t("Seasonal.offerBadge")}
        </span>
      )}
      <Heading id={headingId} className="pr-16 text-2xl">
        {name}
      </Heading>
      {summary && <p className="text-muted-foreground mt-2 text-sm">{summary}</p>}

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
        <span className="font-heading text-4xl lining-nums">{formatCAD(priceCents, locale)}</span>
        {regularPriceCents !== null && (
          <s className="text-muted-foreground text-lg">
            <span className="sr-only">{t("Seasonal.regularPrice")}: </span>
            {formatCAD(regularPriceCents, locale, { suffix: false })}
          </s>
        )}
      </p>

      {facts.length > 0 && (
        <p className="text-muted-foreground mt-2 text-sm">{facts.join(" · ")}</p>
      )}
      {inclusions.length > 0 && (
        <ul className="border-border mt-4 space-y-2 border-t pt-4 text-sm">
          {inclusions.slice(0, MAX_INCLUSIONS).map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )}
      <div className="flex-1" />
      {endsOn && (
        <p className="text-muted-foreground mt-4 text-xs">
          {t("Seasonal.endsOn", { date: endsOn })}
        </p>
      )}

      <Link
        href={{
          pathname: "/book",
          query: tierKey ? { package: packageSlug, tier: tierKey } : { package: packageSlug },
        }}
        aria-describedby={headingId}
        className={cn(buttonVariants({ size: "cta" }), "mt-6")}
      >
        {t("Seasonal.book")}
      </Link>
    </article>
  );
}
