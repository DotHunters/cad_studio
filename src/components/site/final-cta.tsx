import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { photos } from "@/lib/photos";
import { cn } from "@/lib/utils";

import { ctaNav } from "./nav-items";
import { SectionBackdrop } from "./section-backdrop";

export function FinalCta() {
  const t = useTranslations();

  return (
    <section
      aria-labelledby="final-cta-title"
      className="bg-ink text-paper relative isolate overflow-hidden"
    >
      <SectionBackdrop photo={photos.background[2]} overlayClassName="bg-ink/80" />
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <span aria-hidden className="bg-gold-gradient mx-auto block h-px w-16" />
        <h2
          id="final-cta-title"
          className="[&_em]:text-gold-light mt-8 text-4xl leading-tight sm:text-6xl"
        >
          {t.rich("Home.finalTitle", {
            accent: (chunks) => <em className="font-heading italic">{chunks}</em>,
          })}
        </h2>
        <p className="text-paper/75 mx-auto mt-6 max-w-2xl text-lg">{t("Home.finalBody")}</p>
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
    </section>
  );
}
