"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Inertia scrolling on desktop wheels/trackpads. Touch keeps native scrolling, and
 * reduced-motion visitors never get Lenis. Scrollable overlays opt out with `data-lenis-prevent`.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const isHistoryNav = useRef(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Anchor jumps stop below the sticky header (h-16), matching scroll-padding-top in globals.css.
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -80 } });
    lenisRef.current = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Back/Forward should land where the visitor left off; anything else is a fresh page.
  useEffect(() => {
    const onPop = () => {
      isHistoryNav.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // New page: start at the top. Back/Forward or #anchor links keep the browser's position.
  // Either way, resync Lenis so a glide from the previous page can't drag on.
  useEffect(() => {
    const fromHistory = isHistoryNav.current;
    isHistoryNav.current = false;
    const id = requestAnimationFrame(() => {
      const toTop = !fromHistory && !window.location.hash;
      if (toTop) window.scrollTo(0, 0);
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(toTop ? 0 : window.scrollY, { immediate: true, force: true });
        lenis.resize();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
