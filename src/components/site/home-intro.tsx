import Image from "next/image";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { photos } from "@/lib/photos";
import { cn } from "@/lib/utils";

import { Accent } from "./section-heading";

/** Split intro: statement on the left, owner note and signature on the right (AGENTS.md §6.1). */
export function HomeIntro() {
  const t = useTranslations("Home");

  return (
    <section
      aria-labelledby="intro-title"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-[0.25em] uppercase">
            {t("introEyebrow")}
          </p>
          <span aria-hidden className="bg-gold-gradient mt-3 block h-px w-12" />
          <h2 id="intro-title" className="mt-6 text-4xl leading-tight sm:text-5xl lg:text-6xl">
            {t.rich("introStatement", { accent: (chunks) => <Accent>{chunks}</Accent> })}
          </h2>
        </div>

        <div className="border-border border-y py-8">
          <div className="flex items-start gap-5">
            {/* Decorative: the owner's name follows right below. */}
            <Image
              src={photos.owner[0].src}
              alt=""
              width={80}
              height={80}
              sizes="80px"
              placeholder="blur"
              blurDataURL={photos.owner[0].blurDataUrl}
              className="size-20 shrink-0 rounded-full object-cover object-top"
            />
            <p className="text-muted-foreground leading-relaxed">{t("introBody")}</p>
          </div>
          <div className="mt-6">
            <p className="font-heading text-2xl italic">{siteConfig.owner.name}</p>
            <p className="text-muted-foreground mt-1 text-xs tracking-[0.2em] uppercase">
              {t("introRole")} · {siteConfig.location.region}
            </p>
          </div>
          <Link
            href="/about"
            className={cn(buttonVariants({ variant: "outline", size: "cta" }), "mt-8")}
          >
            {t("introCta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
