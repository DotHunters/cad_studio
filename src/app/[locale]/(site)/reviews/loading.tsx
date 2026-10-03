import { useTranslations } from "next-intl";

import { CardGridSkeleton } from "@/components/skeletons/card-grid-skeleton";

/** Shown while the reviews page loads (AGENTS.md §12). */
export default function Loading() {
  const t = useTranslations("Common");
  return <CardGridSkeleton label={t("loading")} cards={3} />;
}
