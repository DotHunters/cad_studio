import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { formatCAD } from "@/lib/money";
import { cn } from "@/lib/utils";

const MAX_INCLUSIONS = 5;

/**
 * One choosable option on the packages page: a package's tier (e.g. Signature), or a package
 * without tiers. "Select package" opens the booking flow with it preselected.
 */
export function PackageOptionCard({
  title,
  priceCents,
  inclusions,
  packageSlug,
  tierKey,
  locale,
  headingId,
}: {
  title: string;
  priceCents: number;
  inclusions: string[];
  packageSlug: string;
  tierKey?: string;
  locale: Locale;
  headingId: string;
}) {
  const t = useTranslations();
  const query = tierKey ? { package: packageSlug, tier: tierKey } : { package: packageSlug };
  const hidden = inclusions.length - MAX_INCLUSIONS;

  return (
    <article
      aria-labelledby={headingId}
      className="bg-card text-card-foreground hover:border-gold flex h-full flex-col rounded-xl border p-6 shadow-sm transition-colors"
    >
      <h3 id={headingId} className="text-2xl">
        {title}
      </h3>
      <p className="mt-3">
        <span className="font-heading block text-4xl lining-nums">
          {formatCAD(priceCents, locale)}
        </span>
        <span className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
          {t("Packages.startingPrice")}
        </span>
      </p>

      <div className="border-border mt-5 flex-1 border-t pt-5">
        <p className="sr-only">{t("Packages.includes")}</p>
        <ul className="space-y-2 text-sm">
          {inclusions.slice(0, MAX_INCLUSIONS).map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
        {hidden > 0 && (
          <Link
            href={`/packages/${packageSlug}`}
            aria-describedby={headingId}
            className="text-gold-text mt-3 inline-block text-sm underline-offset-4 hover:underline"
          >
            {t("Packages.more", { count: hidden })}
          </Link>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={{ pathname: "/book", query }}
          className={cn(buttonVariants({ size: "cta" }))}
          aria-describedby={headingId}
        >
          {t("Packages.select")}
        </Link>
        <Link
          href={{ pathname: "/quote", query }}
          className="text-muted-foreground hover:text-foreground text-center text-xs tracking-[0.12em] uppercase underline-offset-4 hover:underline"
          aria-describedby={headingId}
        >
          {t("Packages.customize")}
        </Link>
      </div>
    </article>
  );
}
