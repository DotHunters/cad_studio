import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { QuoteForm } from "@/components/quote/quote-form";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { findOption } from "@/lib/pricing/options";
import { studioDateKey } from "@/lib/dates";
import { pageMetadata } from "@/lib/seo/metadata";
import { getPricingContext } from "@/server/queries/pricing";
import { getActiveServiceOptions } from "@/server/queries/services";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{
    package?: string | string[];
    tier?: string | string[];
    category?: string | string[];
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Quote" });
  return pageMetadata({
    locale,
    path: "/quote",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Quote generator (AGENTS.md §6.5). `?package=` (and `&tier=`) prefills from a package card. */
export default async function QuotePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : undefined;
  const categoryParam = typeof query.category === "string" ? query.category : undefined;

  const [t, context, services] = await Promise.all([
    getTranslations("Quote"),
    getPricingContext(),
    getActiveServiceOptions(locale),
  ]);
  // `?package=wedding&tier=gold` → the "wedding:gold" option (lib/pricing/options.ts).
  const packageSlug = findOption(context.packages, single(query.package), single(query.tier))?.slug;

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        as="h1"
        eyebrow={t("eyebrow")}
        title={t.rich("title", { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> })}
        intro={t("intro")}
      />
      <div className="mt-12">
        <QuoteForm
          context={context}
          locale={locale}
          today={studioDateKey(new Date())}
          initialPackage={packageSlug}
          initialCategory={
            categoryParam && services.some((s) => s.slug === categoryParam)
              ? categoryParam
              : undefined
          }
          services={services}
        />
      </div>
    </div>
  );
}
