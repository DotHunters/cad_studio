import type { Locale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

import { CategoryTiles } from "@/components/site/category-tiles";
import { HomeHero } from "@/components/site/home-hero";

// The locale layout has already validated `locale`.
type Props = { params: Promise<{ locale: Locale }> };

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <>
      <HomeHero />
      <CategoryTiles />
    </>
  );
}
