import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

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
    <header className="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-40 border-b backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label={t("Common.logoAlt")}>
          <Logo alt={t("Common.logoAlt")} className="h-12" priority />
        </Link>

        <nav aria-label={t("Common.mainNav")} className="hidden md:block">
          <ul className="flex items-center gap-1 lg:gap-3">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="hover:text-gold-text rounded-md px-2 py-1 text-sm transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href={ctaNav.book.href}
            className={cn(buttonVariants({ variant: "outline" }), "hidden h-9 px-3 lg:inline-flex")}
          >
            {t(`Nav.${ctaNav.book.key}`)}
          </Link>
          <Link
            href={ctaNav.quote.href}
            className={cn(buttonVariants(), "hidden h-9 px-3 sm:inline-flex")}
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
    </header>
  );
}
