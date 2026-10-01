import { getLocale, getTranslations } from "next-intl/server";

import { ReviewCard } from "@/components/reviews/review-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { averageRating } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { getHomeReviews } from "@/server/queries/home";

import { Accent, SectionHeading } from "./section-heading";
import { StarRating } from "./star-rating";

/**
 * Approved, featured reviews in a horizontally scrolling, snap-aligned row. Native scrolling
 * keeps it keyboard- and touch-friendly without JavaScript.
 */
export async function ReviewsCarousel() {
  const [t, locale, { featured, ratings }] = await Promise.all([
    getTranslations(),
    getLocale(),
    getHomeReviews(8),
  ]);
  if (featured.length === 0) return null;

  const average = averageRating(ratings);
  const count = ratings.filter((rating) => rating !== null).length;

  return (
    <section aria-labelledby="reviews-title" className="bg-secondary/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          id="reviews-title"
          align="center"
          eyebrow={t("Home.reviewsEyebrow")}
          title={t.rich("Home.reviewsTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
        />
        {average !== null && (
          <p className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
            <StarRating rating={average} label={t("Home.starsLabel", { rating: average })} />
            {t("Home.averageRating", { rating: average, count })}
          </p>
        )}
      </div>

      <ul
        tabIndex={0}
        aria-labelledby="reviews-title"
        className="focus-visible:ring-ring mx-auto mt-12 flex max-w-7xl snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 focus-visible:ring-2 focus-visible:outline-none sm:px-6"
      >
        {featured.map((review) => (
          <li key={review.id} className="w-[85%] shrink-0 snap-start sm:w-[360px]">
            <ReviewCard review={review} locale={locale} />
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <Link href="/reviews" className={cn(buttonVariants({ variant: "outline", size: "cta" }))}>
          {t("Home.readAllReviews")}
        </Link>
      </div>
    </section>
  );
}
