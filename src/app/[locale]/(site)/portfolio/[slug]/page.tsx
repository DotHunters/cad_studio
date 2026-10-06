import { ArrowLeft, ArrowUpRight, ChevronDown } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

import { LightboxGrid } from "@/components/gallery/lightbox-grid";
import { JsonLd } from "@/components/site/json-ld";
import { Accent } from "@/components/site/section-heading";
import { StoredImage } from "@/components/site/stored-image";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { storedImageSrc } from "@/lib/images";
import { pickCover } from "@/lib/images";
import { localize } from "@/lib/localize";
import { projectPlace } from "@/lib/portfolio-filters";
import { excerpt } from "@/lib/seo/excerpt";
import { imageGalleryJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getProjectBySlug } from "@/server/queries/portfolio";
import { getServiceNames } from "@/server/queries/services";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const category = (await getServiceNames(locale))(project.category);
  return pageMetadata({
    locale,
    path: `/portfolio/${slug}`,
    title: localize(project.title, project.titleFr, locale),
    // "Corporate Events · Toronto, Canada · 2025. <start of the story>", ≤ 160 characters.
    description: excerpt(
      `${[category, projectPlace(project), project.year].filter(Boolean).join(" · ")}. ${localize(project.story, project.storyFr, locale)}`,
    ),
  });
}

/** Case study (AGENTS.md §6.3): story, image set, optional client recommendation, CTA. */
export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [project, t, serviceName] = await Promise.all([
    getProjectBySlug(slug),
    getTranslations(),
    getServiceNames(locale),
  ]);
  if (!project) notFound();

  const title = localize(project.title, project.titleFr, locale);
  const categorySlug = project.category;
  const categoryName = serviceName(project.category);
  // The chosen cover leads; the remaining images follow in order.
  const lead = pickCover(project.images, project.coverId);
  const rest = project.images.filter((image) => image !== lead);
  const facts = [
    { label: t("Project.client"), value: project.clientName ?? t("Home.privateClient") },
    { label: t("Project.category"), value: categoryName },
    { label: t("Project.location"), value: projectPlace(project) },
    { label: t("Project.year"), value: project.year ? String(project.year) : "" },
    {
      label: t("Project.reach"),
      value: project.reach === "GLOBAL" ? t("Home.reachGlobal") : t("Home.reachLocal"),
    },
  ];
  const quote = project.recommendation;

  return (
    <article>
      <JsonLd
        data={imageGalleryJsonLd({
          baseUrl: siteConfig.url,
          locale,
          path: `/portfolio/${project.slug}`,
          name: title,
          description: [categoryName, projectPlace(project), project.year]
            .filter(Boolean)
            .join(" · "),
          images: project.images.map((image) => ({
            url: storedImageSrc(image),
            caption: localize(image.alt, image.altFr, locale),
            width: image.width,
            height: image.height,
          })),
        })}
      />

      {/* Full-screen cover; -mt-16 slides it under the transparent sticky header (h-16). */}
      <header
        className={cn(
          "bg-ink text-paper relative isolate -mt-16 flex flex-col justify-end overflow-hidden",
          lead ? "min-h-[100svh]" : "min-h-[60svh]",
        )}
      >
        {lead && (
          <StoredImage
            image={lead}
            alt={localize(lead.alt, lead.altFr, locale)}
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-[50%_30%]"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-black/10 to-black/80" />

        <div className="mx-auto w-full max-w-7xl px-4 pt-28 pb-24 sm:px-6 sm:pb-28">
          <Link
            href="/portfolio"
            className="text-paper/80 hover:text-paper inline-flex items-center gap-1 text-sm"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t("Project.back")}
          </Link>
          <p className="text-gold-light mt-6 text-xs font-semibold tracking-[0.2em] uppercase">
            {categoryName}
            {project.isSample && (
              <span className="bg-gold-button text-ink ml-3 rounded-full px-2.5 py-0.5 text-[0.6rem]">
                {t("Home.sampleBadge")}
              </span>
            )}
          </p>
          <h1 className="mt-3 max-w-4xl text-5xl leading-[1.05] sm:text-7xl">{title}</h1>
          {(projectPlace(project) || project.year) && (
            <p className="text-paper/80 mt-4 text-sm tracking-[0.15em] uppercase">
              {[projectPlace(project), project.year].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {lead && (
          <a
            href="#project-story"
            className="text-paper/70 hover:text-paper absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-[0.65rem] tracking-[0.3em] uppercase"
          >
            {t("Home.scroll")}
            <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden />
          </a>
        )}
      </header>

      <div
        id="project-story"
        className="mx-auto max-w-7xl scroll-mt-16 px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_320px]">
          <div className="text-lg leading-relaxed [&_h2]:mt-10 [&_h2]:text-3xl [&_p]:mt-4">
            <ReactMarkdown skipHtml>
              {localize(project.story, project.storyFr, locale)}
            </ReactMarkdown>

            {quote && (
              <figure className="border-gold mt-12 border-l-2 pl-6">
                <blockquote className="font-heading text-2xl leading-snug italic">
                  “{quote.body}”
                </blockquote>
                <figcaption className="text-muted-foreground mt-4 text-sm">
                  {quote.authorName}
                  {quote.authorTitle && `, ${quote.authorTitle}`}
                  {quote.company && ` · ${quote.company}`}
                </figcaption>
              </figure>
            )}
          </div>

          <aside>
            <dl className="divide-border divide-y rounded-xl border text-sm">
              {facts
                .filter((fact) => fact.value)
                .map((fact) => (
                  <div key={fact.label} className="flex justify-between gap-4 px-5 py-3">
                    <dt className="text-muted-foreground">{fact.label}</dt>
                    <dd className="text-right">{fact.value}</dd>
                  </div>
                ))}
            </dl>
          </aside>
        </div>

        {rest.length > 0 && (
          <section aria-labelledby="project-gallery" className="mt-16">
            <h2 id="project-gallery" className="text-3xl">
              {t("Project.gallery")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("Project.imageCount", { count: project.images.length })}
            </p>
            <LightboxGrid
              images={rest.map((image) => ({
                ...image,
                alt: localize(image.alt, image.altFr, locale),
              }))}
              className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              itemClassName="bg-muted relative aspect-[4/5] overflow-hidden rounded-lg"
              imageClassName="object-cover"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              fill
            />
          </section>
        )}

        <section className="bg-ink text-paper mt-20 rounded-2xl px-6 py-14 text-center sm:px-12">
          <h2 className="[&_em]:text-gold-light text-4xl">
            {t.rich("Project.ctaTitle", {
              accent: (chunks: ReactNode) => <Accent>{chunks}</Accent>,
            })}
          </h2>
          <p className="text-paper/75 mx-auto mt-4 max-w-xl">{t("Project.ctaBody")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/quote" className={cn(buttonVariants({ size: "cta" }))}>
              {t("Nav.getQuote")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={{ pathname: "/packages", query: { category: categorySlug } }}
              className={cn(
                buttonVariants({ variant: "outline", size: "cta" }),
                "border-paper/50 text-paper hover:bg-paper hover:text-ink bg-transparent dark:bg-transparent",
              )}
            >
              {t("Project.viewPackages", { category: categoryName })}
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
