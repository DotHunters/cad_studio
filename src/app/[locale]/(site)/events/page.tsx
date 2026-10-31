import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { EventEnquiryForm } from "@/components/events/event-enquiry-form";
import { EVENT_SHOWCASE } from "@/components/events/event-services";
import { JsonLd } from "@/components/site/json-ld";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { StoredImage } from "@/components/site/stored-image";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { eventServicesJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

const STEPS = ["consult", "plan", "setup", "day", "wrap"] as const;

// TODO(owner): event photos — placeholders render as brand-toned blanks until supplied.
const HERO_IMAGE = { publicId: "placeholder/events-hero", width: 1600, height: 1067 };
const ENQUIRE_IMAGE = { publicId: "placeholder/events-enquire", width: 1200, height: 1500 };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Events" });
  return pageMetadata({
    locale,
    path: "/events",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** "Events by CAD": event management, décor, catering, lights & sound. Showcase + enquiry. */
export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Events");
  const accent = (chunks: ReactNode) => <Accent>{chunks}</Accent>;

  return (
    <>
      <JsonLd
        data={eventServicesJsonLd({
          baseUrl: siteConfig.url,
          locale,
          name: t("eyebrow"),
          description: t("metaDescription"),
          services: EVENT_SHOWCASE.map(({ key }) => t(`services.${key}.title`)),
        })}
      />

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <SectionHeading
            as="h1"
            eyebrow={t("eyebrow")}
            title={t.rich("title", { accent })}
            intro={t("intro")}
          />
          <a href="#enquire" className={cn(buttonVariants({ size: "cta" }), "mt-8")}>
            {t("cta")}
          </a>
        </div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
          <StoredImage
            image={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </div>
      </section>

      {/* TODO(owner): confirm service copy (catering in-house or partners; décor/AV owned or hired). */}
      <section
        aria-labelledby="event-services-title"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6"
      >
        <SectionHeading
          id="event-services-title"
          eyebrow={t("servicesEyebrow")}
          title={t.rich("servicesTitle", { accent })}
          intro={t("servicesIntro")}
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EVENT_SHOWCASE.map(({ key, icon: Icon }) => (
            <li key={key} className="bg-card rounded-xl border p-7">
              <span className="border-gold/40 text-gold-text inline-flex size-11 items-center justify-center rounded-lg border">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-2xl">{t(`services.${key}.title`)}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t(`services.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="event-team-title" className="bg-ink text-paper">
        <div aria-hidden className="bg-gold-gradient h-px" />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <SectionHeading
            id="event-team-title"
            inverted
            align="center"
            eyebrow={t("teamEyebrow")}
            title={t.rich("teamTitle", { accent })}
            intro={t("teamBody")}
          />
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
            <Link
              href="/packages"
              className="text-gold-light inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {t("teamPackages")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/portfolio"
              className="text-gold-light inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {t("teamPortfolio")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* TODO(owner): confirm the process steps. */}
      <section
        aria-labelledby="event-process-title"
        className="mx-auto max-w-7xl px-4 py-20 sm:px-6"
      >
        <SectionHeading
          id="event-process-title"
          align="center"
          eyebrow={t("processEyebrow")}
          title={t.rich("processTitle", { accent })}
        />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step} className="border-t pt-5">
              <span className="font-heading text-gold-text text-3xl lining-nums">{index + 1}</span>
              <h3 className="mt-2 text-xl">{t(`steps.${step}.title`)}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="enquire"
        aria-labelledby="event-enquire-title"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6"
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <SectionHeading
              id="event-enquire-title"
              eyebrow={t("enquireEyebrow")}
              title={t.rich("enquireTitle", { accent })}
              intro={t("enquireIntro")}
            />
            <div className="relative mt-10 hidden aspect-[4/5] overflow-hidden rounded-2xl lg:block">
              <StoredImage image={ENQUIRE_IMAGE} alt="" fill sizes="40vw" />
            </div>
          </div>
          <div className="bg-card relative rounded-2xl border p-6 shadow-sm sm:p-10">
            <EventEnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
