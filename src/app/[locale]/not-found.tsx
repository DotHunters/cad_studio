import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Link className="text-gold-text underline underline-offset-4" href="/">
        {t("backHome")}
      </Link>
    </main>
  );
}
