import { useTranslations } from "next-intl";

import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

/** Shown while the packages page loads (AGENTS.md §12). */
export default function Loading() {
  const t = useTranslations("Common");
  return <CardGridSkeleton label={t("loading")} />;
}
