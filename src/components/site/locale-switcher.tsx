"use client";

import { useLocale } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = { label: string; ariaLabel: string; className?: string };

/** Links to the current page in the other locale. */
export function LocaleSwitcher({ label, ariaLabel, className }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const target = locale === "en" ? "fr" : "en";

  return (
    <Link
      href={pathname}
      locale={target}
      hrefLang={target === "fr" ? "fr-CA" : "en-CA"}
      lang={target === "fr" ? "fr-CA" : "en-CA"}
      aria-label={ariaLabel}
      className={cn(
        "rounded-md px-2 py-1 text-sm font-medium underline-offset-4 hover:underline",
        className,
      )}
    >
      {label}
    </Link>
  );
}
