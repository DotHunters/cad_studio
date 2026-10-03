import { CalendarCheck, Camera, Globe2 } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { photos } from "@/lib/photos";
import { cn } from "@/lib/utils";
import { getClientNames } from "@/server/queries/home";

import { ctaNav } from "./nav-items";
import { SectionBackdrop } from "./section-backdrop";
import { Accent, SectionHeading } from "./section-heading";

/** Dark "why us" band: reasons, owner-confirmed stats, trusted-by names and a booking bar. */
export async function WhyUs() {
  const [t, format] = await Promise.all([getTranslations(), getFormatter()]);
  const clientNames = await getClientNames();

  const reasons = [
    { icon: Camera, title: t("Home.whyExperienceTitle"), body: t("Home.whyExperienceBody") },
    { icon: CalendarCheck, title: t("Home.whyPlanningTitle"), body: t("Home.whyPlanningBody") },
    { icon: Globe2, title: t("Home.whyReachTitle"), body: t("Home.whyReachBody") },
  ];

  // Only owner-confirmed numbers are shown (AGENTS.md §13).
  const { stats } = siteConfig;
  const statItems = [
    { value: stats.yearsExperience, plus: true, label: t("Home.statYears") },
    { value: stats.eventsPhotographed, plus: true, label: t("Home.statEvents") },
    // An exact count, so no "+".
    { value: stats.countries, plus: false, label: t("Home.statCountries") },
  ].filter((stat): stat is { value: number; plus: boolean; label: string } => stat.value !== null);

  return (
    <section
      aria-labelledby="why-title"
      className="bg-ink text-paper relative isolate overflow-hidden"
    >
      <SectionBackdrop photo={photos.background[0]} />
      <div aria-hidden className="bg-gold-gradient h-px" />
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHeading
          id="why-title"
          inverted
          align="center"
          eyebrow={t("Home.whyEyebrow")}
          title={t.rich("Home.whyTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
          intro={t("Home.whyIntro")}
        />

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {reasons.map(({ icon: Icon, title, body }) => (
            <li key={title} className="border-paper/10 rounded-xl border bg-white/[0.03] p-7">
              <span className="border-gold/40 text-gold-light inline-flex size-11 items-center justify-center rounded-lg border">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-2xl">{title}</h3>
              <p className="text-paper/70 mt-3 text-sm leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>

        {/* A lone stat would just repeat the first card; show the strip once two are confirmed. */}
        {statItems.length > 1 && (
          <dl className="mt-14 flex flex-wrap justify-center gap-x-16 gap-y-8 text-center">
            {statItems.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <dt className="text-paper/60 order-2 mt-1 text-xs tracking-[0.2em] uppercase">
                  {stat.label}
                </dt>
                <dd className="font-heading text-gold-light order-1 text-5xl lining-nums">
                  {format.number(stat.value)}
                  {stat.plus && "+"}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {clientNames.length > 0 && (
          <div className="mt-14 text-center">
            <p className="text-paper/50 text-xs tracking-[0.25em] uppercase">
              {t("Home.trustedBy")}
            </p>
            <ul className="text-paper/80 font-heading mt-5 flex flex-wrap justify-center gap-x-10 gap-y-3 text-xl">
              {clientNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-paper/10 mt-16 flex flex-col items-center justify-between gap-5 rounded-xl border bg-white/[0.03] px-7 py-6 sm:flex-row">
          <p className="font-heading [&_em]:text-gold-light text-2xl italic">
            {t.rich("Home.readyTitle", { accent: (chunks) => <em>{chunks}</em> })}
          </p>
          <Link href={ctaNav.book.href} className={cn(buttonVariants({ size: "cta" }))}>
            {t(`Nav.${ctaNav.book.key}`)}
          </Link>
        </div>
      </div>
    </section>
  );
}
