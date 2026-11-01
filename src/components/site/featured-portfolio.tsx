import { ArrowUpRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ProjectCard } from "@/components/portfolio/project-card";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getFeaturedProjects } from "@/server/queries/home";
import { getServiceNames } from "@/server/queries/services";

import { ScrollRow } from "./scroll-row";
import { Accent, SectionHeading } from "./section-heading";

export async function FeaturedPortfolio() {
  const locale = (await getLocale()) as Locale;
  const [t, projects, serviceName] = await Promise.all([
    getTranslations(),
    getFeaturedProjects(6),
    getServiceNames(locale),
  ]);
  if (projects.length === 0) return null;

  return (
    <section
      aria-labelledby="portfolio-title"
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16"
    >
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <SectionHeading
          id="portfolio-title"
          eyebrow={t("Home.portfolioEyebrow")}
          title={t.rich("Home.portfolioTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
          intro={t("Home.portfolioIntro")}
        />
        <Link
          href="/portfolio"
          className={cn(buttonVariants({ variant: "outline", size: "cta" }), "shrink-0")}
        >
          {t("Home.viewAllWork")}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>

      {/* Up to six projects (AGENTS.md §6.1); three show on desktop, the rest scroll in. */}
      <ScrollRow
        label={t("Home.portfolioListLabel")}
        previousLabel={t("Home.portfolioPrevious")}
        nextLabel={t("Home.portfolioNext")}
        className="mt-12"
      >
        {projects.map((project) => (
          <li
            key={project.id}
            className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] md:w-[calc((100%-3rem)/3)]"
          >
            <ProjectCard
              project={project}
              locale={locale}
              serviceName={serviceName(project.category)}
            />
          </li>
        ))}
      </ScrollRow>
    </section>
  );
}
