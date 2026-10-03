import { ArrowUpRight, Check, ChevronRight, Minus } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import ReactMarkdown from "react-markdown";

import { JsonLd } from "@/components/site/json-ld";
import { Accent } from "@/components/site/section-heading";
import { StoredImage } from "@/components/site/stored-image";
import { PackageTierCard } from "@/components/packages/package-tier-card";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { slugFromCategory } from "@/lib/categories";
import { parseFaqs, publishableText } from "@/lib/content";
import { isPricingConfirmed } from "@/lib/flags";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { startingPriceCents } from "@/lib/pricing/options";
import { serviceJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getBookingTerms, getPackageBySlug } from "@/server/queries/packages";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) return {};
  return pageMetadata({
    locale,
    path: `/packages/${slug}`,
    title: localize(pkg.name, pkg.nameFr, locale),
    description: localize(pkg.summary, pkg.summaryFr, locale),
  });
}

export default async function PackageDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const [pkg, terms, t] = await Promise.all([
    getPackageBySlug(slug),
    getBookingTerms(),
    getTranslations(),
  ]);
  if (!pkg) notFound();

  const name = localize(pkg.name, pkg.nameFr, locale);
  const categorySlug = slugFromCategory(pkg.category);
  const categoryName = t(`Categories.${categorySlug}.name`);
  const inclusions = localize(
    pkg.inclusions,
    pkg.inclusionsFr.length ? pkg.inclusionsFr : null,
    locale,
  );
  const exclusions = localize(
    pkg.exclusions,
    pkg.exclusionsFr.length ? pkg.exclusionsFr : null,
    locale,
  );
  const faqs = parseFaqs(pkg.faqs);
  const policy = publishableText(terms.cancellationPolicy?.[locale]);

  const unitLabel = {
    FLAT: "",
    PER_HOUR: t("PackageDetail.perHour"),
    PER_ITEM: t("PackageDetail.perItem"),
  };
  const deliverables = [
    {
      label: t("PackageDetail.coverage"),
      value: t("Packages.hours", { count: pkg.includedHours }),
    },
    { label: t("PackageDetail.photographers"), value: String(pkg.includedShooters) },
    pkg.editedImages !== null && {
      label: t("PackageDetail.editedImages"),
      value: `${pkg.editedImages}+`,
    },
    pkg.turnaroundDays !== null && {
      label: t("PackageDetail.turnaround"),
      value: t("PackageDetail.turnaroundDays", { count: pkg.turnaroundDays }),
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <article className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <JsonLd
        data={serviceJsonLd({
          baseUrl: siteConfig.url,
          locale,
          pricingConfirmed: isPricingConfirmed(),
          pkg: {
            slug: pkg.slug,
            name,
            description: localize(pkg.summary, pkg.summaryFr, locale),
            category: categoryName,
            basePriceCents: startingPriceCents(pkg),
          },
        })}
      />
      <nav aria-label={t("PackageDetail.breadcrumb")} className="text-muted-foreground text-sm">
        <ol className="flex items-center gap-1">
          <li>
            <Link href="/packages" className="hover:text-foreground">
              {t("PackageDetail.packages")}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-4" />
          </li>
          <li>
            <Link
              href={{ pathname: "/packages", query: { category: categorySlug } }}
              className="hover:text-foreground"
            >
              {categoryName}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="text-foreground">
            {name}
          </li>
        </ol>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div>
          <p className="text-gold-text text-xs font-semibold tracking-[0.2em] uppercase">
            {categoryName}
          </p>
          <h1 className="mt-3 text-5xl leading-tight sm:text-6xl">{name}</h1>
          <p className="text-muted-foreground mt-4 text-lg">
            {localize(pkg.summary, pkg.summaryFr, locale)}
          </p>
          <div className="mt-8 max-w-none leading-relaxed [&_p]:mt-4">
            <ReactMarkdown>{localize(pkg.description, pkg.descriptionFr, locale)}</ReactMarkdown>
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            <section aria-labelledby="included-title">
              <h2 id="included-title" className="text-2xl">
                {t("PackageDetail.included")}
              </h2>
              <ul className="mt-4 space-y-2">
                {inclusions.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="text-gold-text mt-1 size-4 shrink-0" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            {exclusions.length > 0 && (
              <section aria-labelledby="excluded-title">
                <h2 id="excluded-title" className="text-2xl">
                  {t("PackageDetail.notIncluded")}
                </h2>
                <ul className="text-muted-foreground mt-4 space-y-2">
                  {exclusions.map((item) => (
                    <li key={item} className="flex gap-2">
                      <Minus className="mt-1 size-4 shrink-0" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {pkg.addOns.length > 0 && (
            <section aria-labelledby="addons-title" className="mt-12">
              <h2 id="addons-title" className="text-2xl">
                {t("PackageDetail.addOns")}
              </h2>
              <ul className="divide-border mt-4 divide-y rounded-xl border">
                {pkg.addOns.map((addOn) => (
                  <li key={addOn.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <span>{localize(addOn.name, addOn.nameFr, locale)}</span>
                    <span className="text-muted-foreground text-sm whitespace-nowrap lining-nums">
                      {formatCAD(addOn.priceCents, locale, { suffix: false })}{" "}
                      {unitLabel[addOn.unit]}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pkg.images.length > 0 && (
            <section aria-labelledby="gallery-title" className="mt-12">
              <h2 id="gallery-title" className="text-2xl">
                {t("PackageDetail.gallery")}
              </h2>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {pkg.images.map((image) => (
                  <li
                    key={image.id}
                    className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                  >
                    <StoredImage
                      image={image}
                      alt={localize(image.alt, image.altFr, locale)}
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="mt-8">
            <Link
              href={{ pathname: "/portfolio", query: { category: categorySlug } }}
              className="text-gold-text inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {t("PackageDetail.seePortfolio", { category: categoryName })}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </p>

          {faqs.length > 0 && (
            <section aria-labelledby="faq-title" className="mt-12">
              <h2 id="faq-title" className="text-2xl">
                {t("PackageDetail.faqs")}
              </h2>
              <div className="divide-border mt-4 divide-y rounded-xl border">
                {faqs.map((faq) => (
                  <details key={faq.q} className="group px-5 py-4">
                    <summary className="cursor-pointer list-none font-medium marker:hidden">
                      {localize(faq.q, faq.qFr, locale)}
                    </summary>
                    <p className="text-muted-foreground mt-3">{localize(faq.a, faq.aFr, locale)}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-card rounded-xl border p-7 shadow-sm">
            <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
              {t("PackageDetail.startingAt")}
            </p>
            <p className="font-heading mt-1 text-5xl lining-nums">
              {formatCAD(startingPriceCents(pkg), locale)}
            </p>
            <p className="text-muted-foreground mt-2 text-xs">{t("PackageDetail.priceNote")}</p>

            {pkg.tiers.length > 0 ? (
              <p className="mt-6 text-sm">
                <a href="#options" className="text-gold-text underline underline-offset-4">
                  {t("Packages.options", {
                    count: pkg.tiers.length,
                    names: pkg.tiers
                      .map((tier) => localize(tier.name, tier.nameFr, locale))
                      .join(" · "),
                  })}
                </a>
              </p>
            ) : (
              <>
                <h2 className="mt-6 text-xl">{t("PackageDetail.deliverables")}</h2>
                <dl className="divide-border mt-3 divide-y text-sm">
                  {deliverables.map((item) => (
                    <div key={item.label} className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">{item.label}</dt>
                      <dd className="text-right">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <Link
                href={{ pathname: "/quote", query: { package: pkg.slug } }}
                className={cn(buttonVariants({ size: "cta" }))}
              >
                {t("Packages.customize")}
              </Link>
              <Link
                href={{ pathname: "/book", query: { package: pkg.slug } }}
                className={cn(buttonVariants({ variant: "outline", size: "cta" }))}
              >
                {t("Packages.book")}
              </Link>
            </div>
          </div>

          {(terms.depositPct !== null || policy) && (
            <section aria-labelledby="terms-title" className="mt-6 rounded-xl border p-7 text-sm">
              <h2 id="terms-title" className="text-xl">
                {t("PackageDetail.terms")}
              </h2>
              {terms.depositPct !== null && (
                <p className="mt-3">{t("PackageDetail.deposit", { percent: terms.depositPct })}</p>
              )}
              {policy && <p className="text-muted-foreground mt-3">{policy}</p>}
            </section>
          )}
        </aside>
      </div>

      {pkg.tiers.length > 0 && (
        <section id="options" aria-labelledby="options-title" className="mt-20 scroll-mt-24">
          <h2 id="options-title" className="text-4xl">
            {t("PackageDetail.optionsTitle")}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl">{t("PackageDetail.optionsIntro")}</p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pkg.tiers.map((tier) => (
              <li key={tier.key}>
                <PackageTierCard
                  tier={tier}
                  packageSlug={pkg.slug}
                  locale={locale}
                  headingId={`tier-${tier.key}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-ink text-paper mt-20 rounded-2xl px-6 py-14 text-center sm:px-12">
        <h2 className="[&_em]:text-gold-light text-4xl">
          {t.rich("PackageDetail.ctaTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
        </h2>
        <p className="text-paper/75 mx-auto mt-4 max-w-xl">{t("PackageDetail.ctaBody")}</p>
        <Link
          href={{ pathname: "/quote", query: { package: pkg.slug } }}
          className={cn(buttonVariants({ size: "cta" }), "mt-8")}
        >
          {t("Packages.customize")}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </section>
    </article>
  );
}
