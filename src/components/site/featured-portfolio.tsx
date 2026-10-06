import { ArrowUpRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ProjectCard } from "@/components/portfolio/project-card";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getFeaturedProjects } from "@/server/queries/home";
import { getServiceNames } from "@/server/queries/services";

import { Accent, SectionHeading } from "./section-heading";

export async function FeaturedPortfolio() {
  const locale = (await getLocale()) as Locale;
  const [t, projects, serviceName] = await Promise.all([
    getTranslations(),
    getFeaturedProjects(3),
    getServiceNames(locale),
  ]);
  if (projects.length === 0) return null;

  return (
    <section
      aria-labelledby="portfolio-title"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28"
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

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {projects.map((project) => (
          <li key={project.id}>
            <ProjectCard
              project={project}
              locale={locale}
              serviceName={serviceName(project.category)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
