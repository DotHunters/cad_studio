import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { QuoteForm } from "@/components/quote/quote-form";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { type CategorySlug, categoryFromSlug } from "@/lib/categories";
import { studioDateKey } from "@/lib/dates";
import { pageMetadata } from "@/lib/seo/metadata";
import { getPricingContext } from "@/server/queries/pricing";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ package?: string | string[]; category?: string | string[] }>;
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

/** Quote generator (AGENTS.md §6.5). `?package=` prefills from a package card. */
export default async function QuotePage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const packageSlug = typeof query.package === "string" ? query.package : undefined;
  const categoryParam = typeof query.category === "string" ? query.category : undefined;

  const [t, context] = await Promise.all([getTranslations("Quote"), getPricingContext()]);

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
            categoryParam && categoryFromSlug(categoryParam)
              ? (categoryParam as CategorySlug)
              : undefined
          }
        />
      </div>
    </div>
  );
}
