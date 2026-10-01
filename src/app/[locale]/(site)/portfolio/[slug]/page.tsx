import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

import { LightboxGrid } from "@/components/gallery/lightbox-grid";
import { Accent } from "@/components/site/section-heading";
import { StoredImage } from "@/components/site/stored-image";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { slugFromCategory } from "@/lib/categories";
import { localize } from "@/lib/localize";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getProjectBySlug } from "@/server/queries/portfolio";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const t = await getTranslations({ locale, namespace: "Categories" });
  const category = t(`${slugFromCategory(project.category)}.name`);
  return pageMetadata({
    locale,
    path: `/portfolio/${slug}`,
    title: localize(project.title, project.titleFr, locale),
    description: `${category} · ${[project.city, project.country].filter(Boolean).join(", ")} · ${project.year}`,
  });
}

/** Case study (AGENTS.md §6.3): story, image set, optional client recommendation, CTA. */
export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [project, t] = await Promise.all([getProjectBySlug(slug), getTranslations()]);
  if (!project) notFound();

  const title = localize(project.title, project.titleFr, locale);
  const categorySlug = slugFromCategory(project.category);
  const categoryName = t(`Categories.${categorySlug}.name`);
  const [lead, ...rest] = project.images;
  const facts = [
    { label: t("Project.client"), value: project.clientName ?? t("Home.privateClient") },
    { label: t("Project.category"), value: categoryName },
    {
      label: t("Project.location"),
      value: [project.city, project.country].filter(Boolean).join(", "),
    },
    { label: t("Project.year"), value: String(project.year) },
    {
      label: t("Project.reach"),
      value: project.reach === "GLOBAL" ? t("Home.reachGlobal") : t("Home.reachLocal"),
    },
  ];
  const quote = project.recommendation;

  return (
    <article className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        href="/portfolio"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("Project.back")}
      </Link>

      <header className="mt-8 max-w-3xl">
        <p className="text-gold-text text-xs font-semibold tracking-[0.2em] uppercase">
          {categoryName}
          {project.isSample && (
            <span className="bg-gold-button text-ink ml-3 rounded-full px-2.5 py-0.5 text-[0.6rem]">
              {t("Home.sampleBadge")}
            </span>
          )}
        </p>
        <h1 className="mt-3 text-5xl leading-tight sm:text-6xl">{title}</h1>
      </header>

      {lead && (
        <div className="bg-muted relative mt-10 aspect-[3/2] overflow-hidden rounded-2xl">
          <StoredImage
            image={lead}
            alt={localize(lead.alt, lead.altFr, locale)}
            fill
            priority
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div className="text-lg leading-relaxed [&_h2]:mt-10 [&_h2]:text-3xl [&_p]:mt-4">
          <ReactMarkdown skipHtml>{localize(project.story, project.storyFr, locale)}</ReactMarkdown>

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
            {facts.map((fact) => (
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
          {t.rich("Project.ctaTitle", { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> })}
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
    </article>
  );
}
