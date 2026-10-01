import { CalendarCheck, Compass, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Accent, SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { placeholderImage } from "@/lib/images";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: { "en-CA": "/en/about", "fr-CA": "/fr/about", "x-default": "/en/about" },
    },
  };
}

/**
 * About page (AGENTS.md §6.8). Only owner-provided facts: I. Rukshan, founder & lead
 * photographer, 10+ years, event management background, based in Scarborough, Toronto.
 */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tNav] = await Promise.all([getTranslations("About"), getTranslations("Nav")]);
  const accent = { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> };

  const facts = [
    { label: t("factYears"), value: t("factYearsValue") },
    { label: t("factEvents"), value: t("factEventsValue") },
    { label: t("factBase"), value: t("factBaseValue") },
  ];
  const approach = [
    { icon: CalendarCheck, title: t("approachPlanTitle"), body: t("approachPlanBody") },
    { icon: Compass, title: t("approachFlowTitle"), body: t("approachFlowBody") },
    { icon: Users, title: t("approachCalmTitle"), body: t("approachCalmBody") },
  ];

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
        <SectionHeading
          as="h1"
          align="center"
          eyebrow={t("eyebrow")}
          title={t.rich("title", accent)}
          intro={t("intro")}
        />
      </section>

      <section aria-labelledby="owner-title" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-2xl">
            {/* TODO(owner): portrait of I. Rukshan. */}
            <Image
              src={placeholderImage(960, 1200, { background: "2a2118" })}
              alt={t("portraitAlt")}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.25em] uppercase">
              {t("ownerEyebrow")}
            </p>
            <span aria-hidden className="bg-gold-gradient mt-3 block h-px w-12" />
            <h2 id="owner-title" className="mt-4 text-5xl">
              {siteConfig.owner.name}
            </h2>
            <p className="text-gold-text mt-2 text-sm tracking-[0.15em] uppercase">
              {t("ownerRole")}
            </p>
            <p className="text-muted-foreground mt-6 text-lg leading-relaxed">{t("ownerBody")}</p>
            <dl className="border-border mt-8 grid gap-6 border-t pt-8 sm:grid-cols-3">
              {facts.map((fact) => (
                <div key={fact.label} className="flex flex-col">
                  <dt className="text-muted-foreground order-2 mt-1 text-xs tracking-[0.15em] uppercase">
                    {fact.label}
                  </dt>
                  <dd className="font-heading order-1 text-2xl lining-nums">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="approach-title" className="bg-ink text-paper">
        <div aria-hidden className="bg-gold-gradient h-px" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <SectionHeading
            id="approach-title"
            inverted
            align="center"
            eyebrow={t("approachEyebrow")}
            title={t.rich("approachTitle", accent)}
            intro={t("approachIntro")}
          />
          <ul className="mt-14 grid gap-5 md:grid-cols-3">
            {approach.map(({ icon: Icon, title, body }) => (
              <li key={title} className="border-paper/10 rounded-xl border bg-white/[0.03] p-7">
                <span className="border-gold/40 text-gold-light inline-flex size-11 items-center justify-center rounded-lg border">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-2xl">{title}</h3>
                <p className="text-paper/70 mt-3 text-sm leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* TODO(owner): studio story, team members and equipment highlights (AGENTS.md §6.8) —
          add sections here once the owner provides the details. */}

      <section
        aria-labelledby="areas-title"
        className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28"
      >
        <SectionHeading
          id="areas-title"
          align="center"
          eyebrow={t("areasEyebrow")}
          title={t.rich("areasTitle", accent)}
          intro={t("areasBody")}
          className="max-w-3xl"
        />
        <div className="mt-12 flex flex-col items-center gap-3">
          <p className="font-heading text-3xl">{t.rich("ctaTitle", accent)}</p>
          <p className="text-muted-foreground">{t("ctaBody")}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className={cn(buttonVariants({ size: "cta" }))}>
              {t("ctaContact")}
            </Link>
            <Link
              href="/packages"
              className={cn(buttonVariants({ variant: "outline", size: "cta" }))}
            >
              {tNav("packages")}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
