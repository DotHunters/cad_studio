import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/site/theme-provider";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

import { cormorant, inter } from "../fonts";
import "../globals.css";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const requested = (await params).locale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "en-CA": "/en",
        "fr-CA": "/fr",
        "x-default": "/en",
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Common" });

  return (
    <html
      lang={locale === "fr" ? "fr-CA" : "en-CA"}
      className={cn("font-sans", inter.variable, cormorant.variable)}
      // next-themes sets the theme class on <html> before hydration.
      suppressHydrationWarning
    >
      <body className="antialiased">
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t("skipToContent")}
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
