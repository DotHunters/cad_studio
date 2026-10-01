import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { BookingWizard, type BookingFormValues } from "@/components/booking/booking-wizard";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { MAX_MONTHS_AHEAD } from "@/lib/booking/availability";
import { type CategorySlug, slugFromCategory } from "@/lib/categories";
import { studioDateKey } from "@/lib/dates";
import { pageMetadata } from "@/lib/seo/metadata";
import { getPricingContext } from "@/server/queries/pricing";
import { getBookableQuote } from "@/server/queries/quotes";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const single = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Book" });
  return pageMetadata({
    locale,
    path: "/book",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Booking flow (AGENTS.md §6.6). `?package=` preselects a package; a signed `?quote=&t=`
 * from a quote page prefills everything and keeps the quoted price.
 */
export default async function BookPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const quoteReference = single(query.quote);

  const [t, context, quote] = await Promise.all([
    getTranslations("Book"),
    getPricingContext(),
    getBookableQuote(quoteReference, single(query.t)),
  ]);

  const chosen = context.packages.find((pkg) => pkg.slug === single(query.package));
  const initial: Partial<BookingFormValues> = chosen
    ? {
        category: slugFromCategory(chosen.category) as CategorySlug,
        packageSlug: chosen.slug,
        photographers: String(chosen.includedShooters),
      }
    : {};

  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        as="h1"
        eyebrow={t("eyebrow")}
        title={t.rich("title", { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> })}
        intro={t("intro")}
      />
      {quoteReference && !quote && (
        <p role="status" className="text-muted-foreground mt-6 text-sm">
          {t("quoteUnavailable")}
        </p>
      )}
      <div className="mt-12">
        <BookingWizard
          context={context}
          locale={locale}
          today={studioDateKey(new Date())}
          monthsAhead={MAX_MONTHS_AHEAD}
          initial={initial}
          quote={quote}
        />
      </div>
    </div>
  );
}
