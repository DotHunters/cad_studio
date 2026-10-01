import { ArrowUpRight, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { placeholderImage } from "@/lib/images";
import { cn } from "@/lib/utils";

import { HeroSlideshow } from "./hero-slideshow";
import { ctaNav } from "./nav-items";

// TODO(owner): replace with 3–5 of the studio's best images (task 3.x wires Cloudinary).
// Blank placeholders in slightly different shades so the rotation is visible.
const HERO_BACKGROUNDS = ["2a2118", "1c1c1c", "231d16", "181818"];

export function HomeHero() {
  const t = useTranslations();
  const total = HERO_BACKGROUNDS.length;
  const slides = HERO_BACKGROUNDS.map((background, index) => ({
    src: placeholderImage(1920, 1080, { background }),
    alt: t("Home.heroImageAlt", { index: index + 1, total }),
  }));
  const trust = [t("Home.trustYears"), t("Home.trustEvents"), t("Home.trustLocation")];

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
        <ul className="border-paper/25 text-paper/85 mx-auto inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl border bg-black/20 px-4 py-1.5 text-[0.65rem] font-medium tracking-[0.2em] uppercase backdrop-blur-sm sm:rounded-full sm:text-xs">
          {trust.map((item, index) => (
            <li key={item} className="flex items-center gap-3">
              {index > 0 && <span aria-hidden className="bg-paper/30 h-3 w-px" />}
              {index === 0 && (
                <span aria-hidden className="bg-gold-gradient size-1.5 rounded-full" />
              )}
              {item}
            </li>
          ))}
        </ul>

        <h1 className="[&_em]:text-gold-light mt-8 text-5xl leading-[1.05] sm:text-7xl">
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
