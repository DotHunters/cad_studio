import { ArrowUpRight, ChevronDown } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { getHeroSlides } from "@/server/queries/hero-slides";

import { HeroSlideshow } from "./hero-slideshow";
import { ctaNav } from "./nav-items";

export async function HomeHero() {
  const locale = (await getLocale()) as Locale;
  // Chosen in Admin → Hero slides; the launch photos until the owner picks some.
  const [t, slides] = await Promise.all([getTranslations(), getHeroSlides(locale)]);
  const total = slides.length;

  return (
    // -mt-16 slides the hero under the transparent sticky header (h-16).
    <section className="bg-ink relative isolate -mt-16 flex min-h-[100svh] items-center justify-center overflow-hidden">
      <HeroSlideshow
        slides={slides}
        pauseLabel={t("Home.pauseSlideshow")}
        playLabel={t("Home.playSlideshow")}
        slideLabels={slides.map((_, index) => t("Home.showSlide", { index: index + 1, total }))}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />

      <div className="text-paper mx-auto w-full max-w-4xl px-4 pt-28 pb-36 text-center sm:px-6">
        <h1 className="[&_em]:text-gold-light text-5xl leading-[1.05] sm:text-7xl">
          {t.rich("Home.heroTitle", {
            accent: (chunks) => <em className="font-heading italic">{chunks}</em>,
          })}
        </h1>
        <p className="text-paper/80 mx-auto mt-6 max-w-2xl text-base sm:text-lg">
          {t("Home.heroSubtitle")}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={ctaNav.quote.href} className={cn(buttonVariants({ size: "cta" }))}>
            {t(`Nav.${ctaNav.quote.key}`)}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
          <Link
            href={ctaNav.book.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "cta" }),
              "border-paper/50 text-paper hover:bg-paper hover:text-ink bg-transparent dark:bg-transparent",
            )}
          >
            {t(`Nav.${ctaNav.book.key}`)}
          </Link>
        </div>
      </div>

      <a
        href="#categories-title"
        className="text-paper/70 hover:text-paper absolute inset-x-0 bottom-6 mx-auto flex w-fit flex-col items-center gap-1 text-[0.65rem] tracking-[0.3em] uppercase"
      >
        {t("Home.scroll")}
        <ChevronDown className="size-4 motion-safe:animate-bounce" aria-hidden />
      </a>
    </section>
  );
}
