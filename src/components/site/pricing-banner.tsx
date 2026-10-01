import { useTranslations } from "next-intl";

import { shouldShowPricingBanner } from "@/lib/flags";

export function PricingBanner() {
  const t = useTranslations("PricingBanner");
  if (!shouldShowPricingBanner()) return null;

  return (
    <div role="status" className="bg-gold-light text-ink px-4 py-2 text-center text-sm">
      {t("message")}
    </div>
  );
}
