import { getTranslations } from "next-intl/server";

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
  const [t, { featured, ratings }] = await Promise.all([getTranslations(), getHomeReviews(8)]);
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
          <li
            key={review.id}
            className="bg-card flex w-[85%] shrink-0 snap-start flex-col rounded-xl border p-6 shadow-sm sm:w-[360px]"
          >
            <figure className="flex h-full flex-col">
              {review.rating !== null && (
                <StarRating
                  rating={review.rating}
                  label={t("Home.starsLabel", { rating: review.rating })}
                />
              )}
              <blockquote className="mt-4 flex-1 leading-relaxed">“{review.body}”</blockquote>
              <figcaption className="border-border mt-6 border-t pt-4">
                <p className="font-heading text-lg">{review.authorName}</p>
                {(review.authorTitle || review.company) && (
                  <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                    {[review.authorTitle, review.company].filter(Boolean).join(" · ")}
                  </p>
                )}
                {review.isSample && (
                  <span className="bg-gold-button text-ink mt-2 inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.15em] uppercase">
                    {t("Home.sampleBadge")}
                  </span>
                )}
              </figcaption>
            </figure>
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
