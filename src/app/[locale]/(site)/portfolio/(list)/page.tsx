import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectCard } from "@/components/portfolio/project-card";
import { FilterGroup } from "@/components/site/filter-group";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import {
  filterHref,
  filterProjects,
  parsePortfolioFilters,
  type PortfolioFilters,
  projectYears,
} from "@/lib/portfolio-filters";
import { pageMetadata } from "@/lib/seo/metadata";
import { getPublishedProjects } from "@/server/queries/portfolio";
import { getActiveServiceOptions, getServiceNames } from "@/server/queries/services";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Portfolio" });
  return pageMetadata({
    locale,
    path: "/portfolio",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

export default async function PortfolioPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const parsed = parsePortfolioFilters(await searchParams);

  const [t, projects, services, serviceName] = await Promise.all([
    getTranslations(),
    getPublishedProjects(),
    getActiveServiceOptions(locale),
    getServiceNames(locale),
  ]);
  // An archived or unknown ?category falls back to "All".
  const filters: PortfolioFilters = {
    ...parsed,
    category: services.some((s) => s.slug === parsed.category) ? parsed.category : null,
  };
  const visible = filterProjects(projects, filters);
  const years = projectYears(projects);
  const hasFilters = Boolean(filters.category || filters.reach || filters.year);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        as="h1"
        align="center"
        eyebrow={t("Portfolio.eyebrow")}
        title={t.rich("Portfolio.title", {
          accent: (chunks: ReactNode) => <Accent>{chunks}</Accent>,
        })}
        intro={t("Portfolio.intro")}
      />

      <nav aria-label={t("Portfolio.filtersLabel")} className="mt-12 space-y-3 border-y py-5">
        <FilterGroup
          label={t("Portfolio.category")}
          options={[
            {
              key: "all",
              label: t("Portfolio.all"),
              active: !filters.category,
              href: filterHref(filters, { category: null }),
            },
            ...services.map((service) => ({
              key: service.slug,
              label: service.name,
              active: filters.category === service.slug,
              href: filterHref(filters, { category: service.slug }),
            })),
          ]}
        />
        <FilterGroup
          label={t("Portfolio.reach")}
          options={[
            {
              key: "all",
              label: t("Portfolio.all"),
              active: !filters.reach,
              href: filterHref(filters, { reach: null }),
            },
            {
              key: "local",
              label: t("Portfolio.local"),
              active: filters.reach === "local",
              href: filterHref(filters, { reach: "local" }),
            },
            {
              key: "global",
              label: t("Portfolio.global"),
              active: filters.reach === "global",
              href: filterHref(filters, { reach: "global" }),
            },
          ]}
        />
        {years.length > 1 && (
          <FilterGroup
            label={t("Portfolio.year")}
            options={[
              {
                key: "all",
                label: t("Portfolio.all"),
                active: !filters.year,
                href: filterHref(filters, { year: null }),
              },
              ...years.map((year) => ({
                key: String(year),
                label: String(year),
                active: filters.year === year,
                href: filterHref(filters, { year }),
              })),
            ]}
          />
        )}
      </nav>

      <p role="status" className="text-muted-foreground mt-6 text-sm">
        {t("Portfolio.results", { count: visible.length })}
      </p>

      {visible.length > 0 ? (
        <ul className="mt-6 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <li key={project.id}>
              <ProjectCard
                project={project}
                locale={locale}
                serviceName={serviceName(project.category)}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                headingLevel="h2"
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">{t("Portfolio.empty")}</p>
          {hasFilters && (
            <Link href="/portfolio" className="text-gold-text mt-3 inline-block underline">
              {t("Portfolio.clearFilters")}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
