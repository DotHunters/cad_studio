import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { CategoryTiles } from "@/components/site/category-tiles";
import { FeaturedPortfolio } from "@/components/site/featured-portfolio";
import { FinalCta } from "@/components/site/final-cta";
import { HomeHero } from "@/components/site/home-hero";
import { HomeIntro } from "@/components/site/home-intro";
import { ReviewsCarousel } from "@/components/site/reviews-carousel";
import { WhyUs } from "@/components/site/why-us";

// Featured work and reviews come from the DB; queries are cached and tagged (AGENTS.md §10).
export const revalidate = 3600;

// The locale layout has already validated `locale`.
type Props = { params: Promise<{ locale: Locale }> };

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <>
      <HomeHero />
      <HomeIntro />
      <CategoryTiles />
      <WhyUs />
      <FeaturedPortfolio />
      <ReviewsCarousel />
      <FinalCta />
    </>
  );
}
