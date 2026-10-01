import { useTranslations } from "next-intl";

import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";

import { Logo } from "./logo";
import { legalNav, mainNav } from "./nav-items";

export function SiteFooter() {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-paper mt-auto">
      <div aria-hidden className="bg-gold-gradient h-px" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div className="space-y-3">
          <Logo variant="gold" alt={siteConfig.name} className="h-14" />
          <p className="text-paper/80 text-sm">{t("Footer.tagline")}</p>
          <p className="text-paper/80 text-sm">{t("Footer.serviceArea")}</p>
        </div>

        <nav aria-label={t("Common.footerNav")}>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-gold-light">
                  {t(`Nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-2 text-sm">
          <p>
            <span className="text-paper/70">{t("Footer.email")}: </span>
            {/* TODO(owner): real business email (Q6). */}
            <a
              className="hover:text-gold-light underline"
              href={`mailto:${siteConfig.contact.email}`}
            >
              {siteConfig.contact.email}
            </a>
          </p>
        </div>
      </div>

      <div className="border-paper/15 border-t">
        <div className="text-paper/70 mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>{t("Footer.rights", { year })}</p>
          <ul className="flex gap-4">
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-gold-light">
                  {t(`Nav.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
