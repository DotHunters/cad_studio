import { getTranslations } from "next-intl/server";

import { EVENT_SHOWCASE } from "@/components/events/event-services";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { Accent, SectionHeading } from "./section-heading";

/** Home band pointing to "Events by CAD" (/events). */
export async function EventsTeaser() {
  const t = await getTranslations("Events");

  return (
    <section aria-labelledby="events-teaser-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="bg-card grid items-center gap-10 rounded-2xl border p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            id="events-teaser-title"
            eyebrow={t("eyebrow")}
            title={t.rich("teaserTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
            intro={t("teaserBody")}
          />
          <Link href="/events" className={cn(buttonVariants({ size: "cta" }), "mt-8")}>
            {t("teaserCta")}
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {EVENT_SHOWCASE.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-3 rounded-lg border px-4 py-4">
              <Icon className="text-gold-text size-5 shrink-0" aria-hidden />
              <span className="text-sm font-medium">{t(`services.${key}.title`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
