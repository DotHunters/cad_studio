import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CategoryFilter } from "@/components/packages/category-filter";
import { PackageCard } from "@/components/packages/package-card";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { categoryFromSlug, type CategorySlug } from "@/lib/categories";
import { getActivePackages } from "@/server/queries/packages";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ category?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Packages" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/packages`,
      languages: { "en-CA": "/en/packages", "fr-CA": "/fr/packages", "x-default": "/en/packages" },
    },
  };
}

export default async function PackagesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { category: rawCategory } = await searchParams;

  // Unknown or repeated ?category values fall back to "All".
  const slug = typeof rawCategory === "string" ? rawCategory : null;
  const category = slug ? categoryFromSlug(slug) : null;
  const activeSlug = category ? (slug as CategorySlug) : null;

  const [t, packages] = await Promise.all([getTranslations(), getActivePackages()]);
  const visible = category ? packages.filter((pkg) => pkg.category === category) : packages;

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
        <CategoryFilter active={activeSlug} pathname="/packages" />
      </div>

      {visible.length > 0 ? (
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((pkg) => (
            <li key={pkg.id}>
              <PackageCard pkg={pkg} locale={locale} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">{t("Packages.empty")}</p>
          <Link href="/packages" className="text-gold-text mt-3 inline-block underline">
            {t("Packages.emptyCta")}
          </Link>
        </div>
      )}

      <p className="text-muted-foreground mt-10 text-center text-xs">{t("Packages.taxNote")}</p>
    </div>
  );
}
