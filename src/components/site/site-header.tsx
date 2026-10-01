import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { HeaderShell } from "./header-shell";
import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { ctaNav, mainNav } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  const t = useTranslations();
  const items = mainNav.map((item) => ({ href: item.href, label: t(`Nav.${item.key}`) }));
  const ctas = [ctaNav.quote, ctaNav.book].map((item) => ({
    href: item.href,
    label: t(`Nav.${item.key}`),
  }));

  return (
    <HeaderShell>
      <div className="group-data-[transparent=true]:text-paper relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label={t("Common.logoAlt")}>
          <Logo alt={t("Common.logoAlt")} className="h-12" priority />
        </Link>

        <nav aria-label={t("Common.mainNav")} className="hidden md:block">
          <ul className="flex items-center gap-1 lg:gap-4">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:text-gold-text group-data-[transparent=true]:hover:text-gold-light rounded-md px-2 py-1 text-xs font-medium tracking-[0.15em] uppercase transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={ctaNav.quote.href}
            className={cn(buttonVariants({ size: "cta" }), "hidden h-9 px-4 lg:inline-flex")}
          >
            {t(`Nav.${ctaNav.quote.key}`)}
          </Link>
          <LocaleSwitcher
            label={t("Common.switchToLocale")}
            ariaLabel={t("Common.switchLanguageLabel")}
          />
          <ThemeToggle label={t("Common.toggleTheme")} />
          <MobileNav
            items={items}
            ctas={ctas}
            navLabel={t("Common.mainNav")}
            openLabel={t("Common.openMenu")}
            closeLabel={t("Common.closeMenu")}
          />
        </div>
      </div>
    </HeaderShell>
  );
}
