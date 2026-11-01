import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PackageOptionCard } from "@/components/packages/package-option-card";
import { PackageTabs } from "@/components/packages/package-tabs";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { pageMetadata } from "@/lib/seo/metadata";
import { getActivePackages } from "@/server/queries/packages";
import { getActiveServiceOptions } from "@/server/queries/services";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Packages" });
  return pageMetadata({
    locale,
    path: "/packages",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function PackagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { category: rawCategory } = await searchParams;

  const [t, packages, services] = await Promise.all([
    getTranslations(),
    getActivePackages(),
    getActiveServiceOptions(locale),
  ]);

  // One tab per service that has packages; tiered packages show each option as its own card.
  const tabs = services
    .map((service) => ({ service, items: packages.filter((pkg) => pkg.category === service.slug) }))
    .map(({ service, items }) => {
      const tiered = items.filter((pkg) => pkg.tiers.length > 0);
      const single = items.filter((pkg) => pkg.tiers.length === 0);
      return {
        slug: service.slug,
        label: service.name,
        hasPackages: items.length > 0,
        panel: (
          <div className="space-y-14">
            {items.length === 0 && (
              <p className="text-muted-foreground py-6 text-center">{t("Packages.empty")}</p>
            )}
            {tiered.map((pkg) => (
              <section key={pkg.id} aria-labelledby={`package-${pkg.slug}`}>
                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                  <div>
                    <h2 id={`package-${pkg.slug}`} className="text-3xl">
                      {localize(pkg.name, pkg.nameFr, locale)}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {localize(pkg.summary, pkg.summaryFr, locale)}
                    </p>
                  </div>
                  <Link
                    href={`/packages/${pkg.slug}`}
                    className="text-gold-text text-sm underline-offset-4 hover:underline"
                    aria-describedby={`package-${pkg.slug}`}
                  >
                    {t("Packages.details")}
                  </Link>
                </div>
                <ul className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {pkg.tiers.map((tier) => (
                    <li key={tier.key}>
                      <PackageOptionCard
                        title={localize(tier.name, tier.nameFr, locale)}
                        priceCents={tier.basePriceCents}
                        inclusions={localizeList(tier.inclusions, tier.inclusionsFr, locale)}
                        packageSlug={pkg.slug}
                        tierKey={tier.key}
                        locale={locale}
                        headingId={`option-${pkg.slug}-${tier.key}`}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {single.length > 0 && (
              <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {single.map((pkg) => (
                  <li key={pkg.id}>
                    <PackageOptionCard
                      title={localize(pkg.name, pkg.nameFr, locale)}
                      priceCents={pkg.basePriceCents}
                      inclusions={localizeList(pkg.inclusions, pkg.inclusionsFr, locale)}
                      packageSlug={pkg.slug}
                      locale={locale}
                      headingId={`option-${pkg.slug}`}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ),
      };
    });

  // Unknown or repeated ?category values open the first tab that has packages.
  const initial =
    typeof rawCategory === "string" && tabs.some((tab) => tab.slug === rawCategory)
      ? rawCategory
      : (tabs.find((tab) => tab.hasPackages) ?? tabs[0])?.slug;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        as="h1"
        align="center"
        eyebrow={t("Packages.eyebrow")}
        title={t.rich("Packages.title", { accent: (chunks) => <Accent>{chunks}</Accent> })}
        intro={t("Packages.intro")}
      />

      <div className="mt-10">
        {initial ? (
          <PackageTabs
            tabs={tabs.map(({ slug, label, panel }) => ({ slug, label, panel }))}
            initial={initial}
            label={t("Packages.filterLabel")}
            pathname="/packages"
          />
        ) : (
          <p className="text-muted-foreground mt-16 text-center">{t("Packages.empty")}</p>
        )}
      </div>

      <p className="text-muted-foreground mt-10 text-center text-xs">{t("Packages.taxNote")}</p>
    </div>
  );
}

function localizeList(english: string[], french: string[], locale: Locale): string[] {
  return localize(english, french.length > 0 ? french : null, locale);
}
