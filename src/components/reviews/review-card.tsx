import { BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { StarRating } from "@/components/site/star-rating";
import type { Locale } from "@/config/site";
import { formatInStudioTz } from "@/lib/dates";
import { customerDisplayName } from "@/lib/review-display";
import { cn } from "@/lib/utils";

export type ReviewCardData = {
  id: string;
  type: "CUSTOMER" | "RECOMMENDATION";
  authorName: string;
  authorTitle: string | null;
  company: string | null;
  rating: number | null;
  category: string | null;
  body: string;
  verified: boolean;
  isSample: boolean;
  createdAt: Date;
};

/** One review or recommendation (AGENTS.md §6.7), shared by /reviews and the home carousel. */
export function ReviewCard({
  review,
  locale,
  serviceName,
  className,
}: {
  review: ReviewCardData;
  locale: Locale;
  /** Localized service name for `review.category`, computed by the page. */
  serviceName: string | null;
  className?: string;
}) {
  const t = useTranslations();
  const isCustomer = review.type === "CUSTOMER";
  // Customers: first name + last initial. Recommendations: full name, title and company.
  const name = isCustomer ? customerDisplayName(review.authorName) : review.authorName;
  const meta = [serviceName, formatInStudioTz(review.createdAt, "MMMM yyyy", locale)]
    .filter(Boolean)
    .join(" · ");

  return (
    <figure
      className={cn(
        "bg-card text-card-foreground flex h-full flex-col rounded-xl border p-6 shadow-sm",
        className,
      )}
    >
      {review.rating !== null && (
        <StarRating
          rating={review.rating}
          label={t("Home.starsLabel", { rating: review.rating })}
        />
      )}
      <blockquote className="mt-4 flex-1 leading-relaxed">“{review.body}”</blockquote>
      <figcaption className="border-border mt-6 border-t pt-4">
        <p className="font-heading flex items-center gap-2 text-lg">
          {name}
          {review.verified && (
            <span className="text-gold-text inline-flex items-center gap-1 font-sans text-xs">
              <BadgeCheck className="size-4" aria-hidden />
              {t("Reviews.verified")}
            </span>
          )}
        </p>
        {!isCustomer && (review.authorTitle || review.company) && (
          <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
            {[review.authorTitle, review.company].filter(Boolean).join(" · ")}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-xs">{meta}</p>
        {review.isSample && (
          <span className="bg-gold-button text-ink mt-2 inline-block rounded-full px-2.5 py-0.5 text-[0.6rem] font-semibold tracking-[0.15em] uppercase">
            {t("Home.sampleBadge")}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
