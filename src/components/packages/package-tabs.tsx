"use client";

import { type MouseEvent, type ReactNode, useState } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Tab = { slug: string; label: string; panel: ReactNode };

type Props = { tabs: Tab[]; initial: string; label: string; pathname: string };

/**
 * Category tabs. Every panel is server-rendered, so switching is instant and only updates
 * `?category=` in the URL. The tabs are plain links, so they still work without JavaScript.
 */
export function PackageTabs({ tabs, initial, label, pathname }: Props) {
  const [active, setActive] = useState(initial);

  function select(event: MouseEvent<HTMLAnchorElement>, slug: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    setActive(slug);
    window.history.replaceState(null, "", `?category=${encodeURIComponent(slug)}`);
  }

  return (
    <>
      <nav aria-label={label}>
        <ul className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center">
          {tabs.map(({ slug, label: tabLabel }) => {
            const isActive = slug === active;
            return (
              <li key={slug} className="shrink-0">
                <Link
                  href={{ pathname, query: { category: slug } }}
                  aria-current={isActive ? "page" : undefined}
                  aria-controls={`panel-${slug}`}
                  scroll={false}
                  onClick={(event) => select(event, slug)}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-4 text-xs font-semibold tracking-[0.12em] uppercase transition-colors",
                    isActive
                      ? "bg-gold-button text-ink border-transparent"
                      : "hover:border-gold text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tabLabel}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tabs.map(({ slug, panel }) => (
        <div key={slug} id={`panel-${slug}`} hidden={slug !== active} className="mt-10">
          {panel}
        </div>
      ))}
    </>
  );
}
