import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type FilterOption = {
  key: string;
  label: string;
  active: boolean;
  href: ComponentProps<typeof Link>["href"];
};

/** A labelled row of filter chips rendered as links, so filtering works without JavaScript. */
export function FilterGroup({ label, options }: { label: string; options: FilterOption[] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="text-muted-foreground w-24 shrink-0 text-xs tracking-[0.2em] uppercase">
        {label}
      </span>
      <ul className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        {options.map((option) => (
          <li key={option.key} className="shrink-0">
            <Link
              href={option.href}
              scroll={false}
              aria-current={option.active ? "true" : undefined}
              className={cn(
                "inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-semibold tracking-[0.1em] uppercase transition-colors",
                option.active
                  ? "bg-gold-button text-ink border-transparent"
                  : "text-muted-foreground hover:border-gold hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
