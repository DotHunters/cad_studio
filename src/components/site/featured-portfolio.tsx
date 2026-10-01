import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { slugFromCategory } from "@/lib/categories";
import { storedImageSrc } from "@/lib/images";
import { localize } from "@/lib/localize";
import { cn } from "@/lib/utils";
import { getFeaturedProjects } from "@/server/queries/home";

import { Accent, SectionHeading } from "./section-heading";

export async function FeaturedPortfolio() {
  const [t, locale, projects] = await Promise.all([
    getTranslations(),
    getLocale(),
    getFeaturedProjects(3),
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
        {projects.map((project) => {
          const title = localize(project.title, project.titleFr, locale);
          return (
            <li key={project.id}>
              <Link href={`/portfolio/${project.slug}`} className="group block">
                <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
                  {project.cover && (
                    <Image
                      src={storedImageSrc(project.cover)}
                      alt={localize(project.cover.alt, project.cover.altFr, locale)}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-paper/90 text-ink rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-[0.15em] uppercase">
                      {project.reach === "GLOBAL" ? t("Home.reachGlobal") : t("Home.reachLocal")}
                    </span>
                    {project.isSample && (
                      <span className="bg-gold-button text-ink rounded-full px-3 py-1 text-[0.65rem] font-semibold tracking-[0.15em] uppercase">
                        {t("Home.sampleBadge")}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="group-hover:text-gold-text mt-4 text-2xl transition-colors">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {project.clientName ?? t("Home.privateClient")} ·{" "}
                  {t(`Categories.${slugFromCategory(project.category)}.name`)} ·{" "}
                  {[project.city, project.country].filter(Boolean).join(", ")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
