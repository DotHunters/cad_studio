import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { startingPriceCents } from "@/lib/pricing/options";
import { cn } from "@/lib/utils";
import type { PackageSummary } from "@/server/queries/packages";

const MAX_INCLUSIONS = 4;

export function PackageCard({
  pkg,
  locale,
  serviceName,
}: {
  pkg: PackageSummary;
  locale: Locale;
  serviceName: string;
}) {
  const t = useTranslations();
  const name = localize(pkg.name, pkg.nameFr, locale);
  const inclusions = localize(
    pkg.inclusions,
    pkg.inclusionsFr.length > 0 ? pkg.inclusionsFr : null,
    locale,
  );
  const headingId = `package-${pkg.slug}`;

  return (
    <article
      aria-labelledby={headingId}
      className="bg-card flex h-full flex-col rounded-xl border p-7 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="text-gold-text text-xs font-semibold tracking-[0.2em] uppercase">
        {serviceName}
      </p>
      <h2 id={headingId} className="mt-2 text-3xl">
        <Link href={`/packages/${pkg.slug}`} className="hover:text-gold-text transition-colors">
          {name}
        </Link>
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {localize(pkg.summary, pkg.summaryFr, locale)}
      </p>

      <p className="mt-6">
        <span className="text-muted-foreground block text-xs tracking-[0.15em] uppercase">
          {t("Packages.from")}
        </span>
        <span className="font-heading text-4xl lining-nums">
          {formatCAD(startingPriceCents(pkg), locale)}
        </span>
      </p>

      {pkg.tiers.length > 0 ? (
        // Coverage differs per option; the package page compares them.
        <p className="text-muted-foreground mt-4 text-sm">
          {t("Packages.options", {
            count: pkg.tiers.length,
            names: pkg.tiers.map((tier) => localize(tier.name, tier.nameFr, locale)).join(" · "),
          })}
        </p>
      ) : (
        <ul className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <li>{t("Packages.hours", { count: pkg.includedHours })}</li>
          <li>{t("Packages.photographers", { count: pkg.includedShooters })}</li>
          {pkg.editedImages !== null && (
            <li>{t("Packages.editedImages", { count: pkg.editedImages })}</li>
          )}
        </ul>
      )}

      <div className="border-border mt-6 flex-1 border-t pt-6">
        <p className="sr-only">{t("Packages.includes")}</p>
        <ul className="space-y-2 text-sm">
          {inclusions.slice(0, MAX_INCLUSIONS).map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Link
          href={{ pathname: "/quote", query: { package: pkg.slug } }}
          className={cn(buttonVariants({ size: "cta" }), "flex-1")}
        >
          {t("Packages.customize")}
        </Link>
        <Link
          href={{ pathname: "/book", query: { package: pkg.slug } }}
          className={cn(buttonVariants({ variant: "outline", size: "cta" }), "flex-1")}
        >
          {t("Packages.book")}
        </Link>
      </div>
    </article>
  );
}
