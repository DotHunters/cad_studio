import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import type { PackageTier } from "@/generated/prisma/client";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { cn } from "@/lib/utils";

/** One option (e.g. Gold) of a package, with links that preselect it in the quote and booking. */
export function PackageTierCard({
  tier,
  packageSlug,
  locale,
  headingId,
}: {
  tier: PackageTier;
  packageSlug: string;
  locale: Locale;
  headingId: string;
}) {
  const t = useTranslations();
  const inclusions = localize(
    tier.inclusions,
    tier.inclusionsFr.length > 0 ? tier.inclusionsFr : null,
    locale,
  );
  const query = { package: packageSlug, tier: tier.key };

  return (
    <article
      aria-labelledby={headingId}
      className="bg-card text-card-foreground flex h-full flex-col rounded-xl border p-7 shadow-sm"
    >
      <h3 id={headingId} className="text-3xl">
        {localize(tier.name, tier.nameFr, locale)}
      </h3>
      <p className="font-heading mt-3 text-4xl lining-nums">
        {formatCAD(tier.basePriceCents, locale)}
      </p>
      <ul className="text-muted-foreground mt-4 space-y-1 text-sm">
        <li>{t("Packages.hours", { count: tier.includedHours })}</li>
        <li>{t("Packages.photographers", { count: tier.includedShooters })}</li>
        {tier.editedImages !== null && (
          <li>{t("Packages.editedImages", { count: tier.editedImages })}</li>
        )}
        {tier.turnaroundDays !== null && (
          <li>{t("PackageDetail.turnaroundDays", { count: tier.turnaroundDays })}</li>
        )}
      </ul>
      {inclusions.length > 0 && (
        <div className="border-border mt-6 flex-1 border-t pt-6">
          <p className="sr-only">{t("Packages.includes")}</p>
          <ul className="space-y-2 text-sm">
            {inclusions.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-8 flex flex-col gap-2">
        <Link
          href={{ pathname: "/quote", query }}
          className={cn(buttonVariants({ size: "cta" }))}
          aria-describedby={headingId}
        >
          {t("Packages.customize")}
        </Link>
        <Link
          href={{ pathname: "/book", query }}
          className={cn(buttonVariants({ variant: "outline", size: "cta" }))}
          aria-describedby={headingId}
        >
          {t("Packages.book")}
        </Link>
      </div>
    </article>
  );
}
