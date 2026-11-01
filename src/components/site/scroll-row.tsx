"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A horizontally scrolling, snap-aligned list. Touch users swipe; mouse and keyboard users
 * get previous/next buttons that scroll by one visible page.
 */
export function ScrollRow({
  label,
  previousLabel,
  nextLabel,
  className,
  children,
}: {
  /** Accessible name for the scrollable list. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setCanPrev(list.scrollLeft > 4);
    setCanNext(list.scrollLeft + list.clientWidth < list.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    update();
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollPage = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: direction * list.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  const arrow =
    "border-border hover:border-gold inline-flex size-10 items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className={className}>
      <ul
        ref={listRef}
        tabIndex={0}
        aria-label={label}
        className="focus-visible:ring-ring -mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-6 overflow-x-auto px-4 pb-2 focus-visible:ring-2 focus-visible:outline-none sm:-mx-6 sm:scroll-px-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>
      {(canPrev || canNext) && (
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className={arrow}
            onClick={() => scrollPage(-1)}
            disabled={!canPrev}
            aria-label={previousLabel}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={arrow}
            onClick={() => scrollPage(1)}
            disabled={!canNext}
            aria-label={nextLabel}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
