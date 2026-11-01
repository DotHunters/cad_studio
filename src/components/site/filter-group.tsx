import { Check, ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type FilterOption = {
  key: string;
  label: string;
  active: boolean;
  href: ComponentProps<typeof Link>["href"];
};

/**
 * A labelled filter rendered as links, so filtering works without JavaScript. Phones get a
 * compact dropdown (a long chip row would be cut off); wider screens get a row of chips.
 */
export function FilterGroup({
  label,
  options,
  hideLabel = false,
}: {
  label: string;
  options: FilterOption[];
  /** Keep the label for screen readers only (a single filter row needs no visible label). */
  hideLabel?: boolean;
}) {
  const active = options.find((option) => option.active) ?? options[0];

  return (
    <div>
      {/* Phones. Keyed by the active option so the menu closes after picking one. */}
      <details key={active?.key} className="group/menu relative sm:hidden">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-full border px-4 text-xs font-semibold tracking-[0.1em] uppercase [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-center gap-2">
            <span className="text-muted-foreground font-medium tracking-[0.2em]">{label}</span>
            <span className="truncate">{active?.label}</span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 transition-transform group-open/menu:rotate-180 motion-reduce:transition-none"
            aria-hidden
          />
        </summary>
        <ul
          data-lenis-prevent
          className="bg-popover text-popover-foreground absolute inset-x-0 top-full z-30 mt-2 max-h-[60svh] overflow-y-auto rounded-2xl border p-1.5 shadow-lg"
        >
          {options.map((option) => (
            <li key={option.key}>
              <Link
                href={option.href}
                scroll={false}
                aria-current={option.active ? "true" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-sm",
                  option.active ? "bg-muted font-semibold" : "hover:bg-muted",
                )}
              >
                {option.label}
                {option.active && <Check className="text-gold-text size-4" aria-hidden />}
              </Link>
            </li>
          ))}
        </ul>
      </details>

      {/* Tablet and up. */}
      <div className="hidden gap-2 sm:flex sm:items-center">
        <span
          className={cn(
            "text-muted-foreground w-24 shrink-0 text-xs tracking-[0.2em] uppercase",
            hideLabel && "sr-only",
          )}
        >
          {label}
        </span>
        <ul className="flex flex-wrap gap-2">
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
    </div>
  );
}
