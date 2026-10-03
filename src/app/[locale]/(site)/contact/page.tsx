import { ArrowUpRight, AtSign, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { ContactForm } from "@/components/contact/contact-form";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { SocialLinks } from "@/components/site/social-links";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return pageMetadata({
    locale,
    path: "/contact",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Contact (AGENTS.md §6.9). Service area only — no public street address or map (owner decision). */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tFooter] = await Promise.all([getTranslations("Contact"), getTranslations("Footer")]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div>
          <SectionHeading
            as="h1"
            eyebrow={t("eyebrow")}
            title={t.rich("title", { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> })}
            intro={t("intro")}
          />

          <section aria-labelledby="details-title" className="mt-10 space-y-5">
            <h2 id="details-title" className="sr-only">
              {t("detailsTitle")}
            </h2>
            <p className="flex gap-3">
              <Mail className="text-gold-text mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                <span className="text-muted-foreground block text-xs tracking-[0.15em] uppercase">
                  {t("emailLabel")}
                </span>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="hover:text-gold-text underline"
                >
                  {siteConfig.contact.email}
                </a>
              </span>
            </p>
            <p className="flex gap-3">
              <MapPin className="text-gold-text mt-0.5 size-5 shrink-0" aria-hidden />
              <span>
                <span className="text-muted-foreground block text-xs tracking-[0.15em] uppercase">
                  {t("serviceAreaLabel")}
                </span>
                {tFooter("serviceArea")}
              </span>
            </p>
            <div className="flex gap-3">
              <Phone className="text-gold-text mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <span className="text-muted-foreground block text-xs tracking-[0.15em] uppercase">
                  {t("phoneLabel")}
                </span>
                <ul>
                  {siteConfig.contact.phones.map((phone) => (
                    <li key={phone.tel}>
                      <span className="text-muted-foreground">{regions.of(phone.country)}: </span>
                      <a href={`tel:${phone.tel}`} className="hover:text-gold-text underline">
                        {phone.display}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="flex gap-3">
              <AtSign className="text-gold-text mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <span className="text-muted-foreground block text-xs tracking-[0.15em] uppercase">
                  {t("followLabel")}
                </span>
                <SocialLinks
                  className="flex gap-4"
                  linkClassName="hover:text-gold-text underline"
                />
              </div>
            </div>
            {/* TODO(owner): business hours once provided. */}
          </section>

          <Link
            href="/quote"
            className="text-gold-text mt-10 inline-flex items-center gap-1 underline-offset-4 hover:underline"
          >
            {t("quoteCta")}
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="bg-card relative rounded-2xl border p-6 shadow-sm sm:p-10">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
