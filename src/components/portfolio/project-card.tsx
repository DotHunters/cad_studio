import { useTranslations } from "next-intl";

import { StoredImage } from "@/components/site/stored-image";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { projectPlace } from "@/lib/portfolio-filters";
import type { ProjectSummary } from "@/server/queries/portfolio";

type Props = {
  project: Pick<
    ProjectSummary,
    | "slug"
    | "title"
    | "titleFr"
    | "clientName"
    | "category"
    | "reach"
    | "city"
    | "country"
    | "year"
    | "isSample"
    | "cover"
  >;
  locale: Locale;
  /** Localized service name (archived services keep their name on old projects). */
  serviceName: string;
  sizes?: string;
  /** h2 when the card sits right under the page h1 (portfolio page), h3 under a section h2. */
  headingLevel?: "h2" | "h3";
};

/** Case-study card: cover, Local/Global (+ Sample) badges, title, client, category, place. */
export function ProjectCard({
  project,
  locale,
  serviceName,
  sizes = "(min-width: 768px) 33vw, 100vw",
  headingLevel: Heading = "h3",
}: Props) {
  const t = useTranslations();
  const title = localize(project.title, project.titleFr, locale);

  return (
    <Link href={`/portfolio/${project.slug}`} className="group block">
      <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg">
        {project.cover && (
          <StoredImage
            image={project.cover}
            alt={localize(project.cover.alt, project.cover.altFr, locale)}
            fill
            sizes={sizes}
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
      <Heading className="group-hover:text-gold-text mt-4 text-2xl transition-colors">
        {title}
      </Heading>
      <p className="text-muted-foreground mt-1 text-sm">
        {[
          project.clientName ?? t("Home.privateClient"),
          serviceName,
          projectPlace(project),
          project.year,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
    </Link>
  );
}
