import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectCard } from "@/components/portfolio/project-card";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { categorySlugs } from "@/lib/categories";
import {
  filterHref,
  filterProjects,
  parsePortfolioFilters,
  type PortfolioFilters,
} from "@/lib/portfolio-filters";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getPublishedProjects } from "@/server/queries/portfolio";

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

function FilterGroup({
  label,
  options,
}: {
  label: string;
  options: Array<{
    key: string;
    label: string;
    active: boolean;
    href: ReturnType<typeof filterHref>;
  }>;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="text-muted-foreground w-24 shrink-0 text-xs tracking-[0.2em] uppercase">
        {label}
      </span>
      <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        {options.map((option) => (
          <li key={option.key} className="shrink-0">
            <Link
              href={option.href}
              scroll={false}
              aria-current={option.active ? "true" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-semibold tracking-[0.1em] uppercase transition-colors",
                option.active
                  ? "bg-gold-button text-ink border-transparent"
                  : "text-muted-foreground hover:border-gold hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PortfolioPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters: PortfolioFilters = parsePortfolioFilters(await searchParams);

  const [t, projects] = await Promise.all([getTranslations(), getPublishedProjects()]);
  const visible = filterProjects(projects, filters);
  const years = [...new Set(projects.map((project) => project.year))].sort((a, b) => b - a);
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
            ...categorySlugs.map((slug) => ({
              key: slug,
              label: t(`Categories.${slug}.name`),
              active: filters.category === slug,
              href: filterHref(filters, { category: slug }),
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
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
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
