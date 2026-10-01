import { type Locale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

// The locale layout has already validated `locale`.
type Props = { params: Promise<{ locale: Locale }> };

export default function HomePage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Home");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8">
      <h1 className="text-5xl font-semibold">{t("heading")}</h1>
      <p className="text-muted-foreground">{t("tagline")}</p>
    </main>
  );
}
