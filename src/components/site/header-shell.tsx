"use client";

import { useEffect, useState, type ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Pages whose first section is a full-bleed dark hero the header can sit on. */
const HERO_PATHS = new Set(["/"]);

/**
 * Sticky header that is transparent (light text) over a hero at the top of the page and
 * turns solid once the user scrolls. Children style themselves with
 * `group-data-[transparent=true]:…` variants.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const transparent = HERO_PATHS.has(pathname) && !scrolled;

  return (
    <header
      data-transparent={transparent}
      className={cn(
        "group sticky top-0 z-40 border-b transition-colors duration-300 motion-reduce:transition-none",
        transparent
          ? "border-transparent bg-transparent"
          : "bg-background/90 supports-[backdrop-filter]:bg-background/75 backdrop-blur",
      )}
    >
      {children}
    </header>
  );
}
