import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { ServiceOption } from "@/lib/services";
import { cn } from "@/lib/utils";

type Props = { services: ServiceOption[]; active: string | null; pathname: string };

/** Category tabs as plain links (`?category=…`) so filtering works without JavaScript. */
export function CategoryFilter({ services, active, pathname }: Props) {
  const t = useTranslations();
  const options: Array<{ slug: string | null; label: string }> = [
    { slug: null, label: t("Packages.all") },
    ...services.map((service) => ({ slug: service.slug, label: service.name })),
  ];

  return (
    <nav aria-label={t("Packages.filterLabel")}>
      <ul className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center">
        {options.map(({ slug, label }) => {
          const isActive = slug === active;
          return (
            <li key={slug ?? "all"} className="shrink-0">
              <Link
                href={slug ? { pathname, query: { category: slug } } : pathname}
                aria-current={isActive ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-xs font-semibold tracking-[0.12em] uppercase transition-colors",
                  isActive
                    ? "bg-gold-button text-ink border-transparent"
                    : "hover:border-gold text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
