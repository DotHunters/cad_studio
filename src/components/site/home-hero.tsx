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
  const slides = HERO_BACKGROUNDS.map((background, index) => ({
    src: placeholderImage(1920, 1080, { background }),
    alt: t("Home.heroImageAlt", { index: index + 1, total: HERO_BACKGROUNDS.length }),
  }));

  return (
    <section className="bg-ink relative isolate flex min-h-[78vh] items-end overflow-hidden">
      <HeroSlideshow
        slides={slides}
        pauseLabel={t("Home.pauseSlideshow")}
        playLabel={t("Home.playSlideshow")}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

      <div className="text-paper relative mx-auto w-full max-w-7xl px-4 pt-32 pb-16 sm:px-6 sm:pb-24">
        <p className="text-gold-light text-sm tracking-[0.2em] uppercase">{t("Home.tagline")}</p>
        <h1 className="mt-3 max-w-3xl text-4xl leading-tight sm:text-6xl">{t("Home.heroTitle")}</h1>
        <p className="text-paper/85 mt-5 max-w-2xl text-lg">{t("Home.heroSubtitle")}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={ctaNav.quote.href} className={cn(buttonVariants(), "h-12 px-6 text-base")}>
            {t(`Nav.${ctaNav.quote.key}`)}
          </Link>
          <Link
            href={ctaNav.book.href}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "border-paper/60 text-paper hover:bg-paper hover:text-ink h-12 bg-transparent px-6 text-base dark:bg-transparent",
            )}
          >
            {t(`Nav.${ctaNav.book.key}`)}
          </Link>
        </div>
      </div>
    </section>
  );
}
