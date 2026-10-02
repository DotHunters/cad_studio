"use client";

import { ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type KeyboardEvent, type PointerEvent, useCallback, useRef, useState } from "react";

import { StoredImage } from "@/components/site/stored-image";
import type { StoredImage as Stored } from "@/lib/images";
import { cn } from "@/lib/utils";

export type LightboxImage = Stored & { id: string; alt: string; blurDataUrl?: string | null };

type Props = {
  images: LightboxImage[];
  /** Grid layout classes for the <ul> (masonry columns, CSS grid, …). */
  className?: string;
  /** Classes for each thumbnail <li>. */
  itemClassName?: string;
  /** Thumbnail image classes (e.g. "h-auto w-full" or "object-cover" with fill). */
  imageClassName?: string;
  sizes: string;
  /** Fill the item box (aspect ratio set by itemClassName) instead of natural size. */
  fill?: boolean;
  /** Number of leading thumbnails to load eagerly. */
  priorityCount?: number;
};

const SWIPE_THRESHOLD_PX = 50;

/**
 * Thumbnail grid + accessible lightbox (AGENTS.md §6.4). Uses a native modal <dialog>, which
 * makes the rest of the page inert (focus stays inside) and closes on Escape. Adds ←/→ keys,
 * swipe, a position counter and alt text on demand; focus returns to the opening thumbnail.
 */
export function LightboxGrid({
  images,
  className,
  itemClassName,
  imageClassName,
  sizes,
  fill = false,
  priorityCount = 0,
}: Props) {
  const t = useTranslations("Lightbox");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const swipeStartX = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [showDescription, setShowDescription] = useState(false);

  const total = images.length;
  // The dialog chrome always renders, so the close button exists to receive focus on open.
  const shown = index ?? 0;
  const current = images[shown];

  const open = (next: number, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger;
    setIndex(next);
    setShowDescription(false);
    dialogRef.current?.showModal();
  };

  const close = () => dialogRef.current?.close();

  const step = useCallback(
    (delta: number) =>
      setIndex((value) => (value === null ? value : (value + delta + total) % total)),
    [total],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") swipeStartX.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (swipeStartX.current === null) return;
    const dx = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) step(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <ul className={className}>
        {images.map((image, position) => (
          <li key={image.id} className={itemClassName}>
            <button
              type="button"
              onClick={(event) => open(position, event.currentTarget)}
              aria-label={`${t("open", { index: position + 1, total })}: ${image.alt}`}
              aria-haspopup="dialog"
              className={cn(
                "focus-visible:ring-ring group block w-full cursor-zoom-in focus-visible:ring-2 focus-visible:outline-none",
                fill && "relative h-full",
              )}
            >
              <StoredImage
                image={image}
                alt=""
                fill={fill}
                sizes={sizes}
                priority={position < priorityCount}
                className={cn(
                  "transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100",
                  imageClassName,
                )}
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={t("dialog")}
        onKeyDown={onKeyDown}
        onClose={() => {
          setIndex(null);
          triggerRef.current?.focus();
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="text-paper m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 backdrop:bg-black"
      >
        {current && (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p aria-live="polite" className="text-paper/80 text-sm tabular-nums">
                {t("position", { index: shown + 1, total })}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowDescription((value) => !value)}
                  aria-expanded={showDescription}
                  aria-controls="lightbox-description"
                  aria-label={showDescription ? t("hideDescription") : t("showDescription")}
                  className="hover:bg-paper/10 focus-visible:ring-gold-light rounded-full p-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Info className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t("close")}
                  autoFocus
                  className="hover:bg-paper/10 focus-visible:ring-gold-light rounded-full p-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 touch-pan-y">
              <StoredImage
                key={current.id}
                image={current}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label={t("previous")}
                    className="hover:bg-paper/20 focus-visible:ring-gold-light absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-3 focus-visible:ring-2 focus-visible:outline-none sm:left-4"
                  >
                    <ChevronLeft className="size-6" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label={t("next")}
                    className="hover:bg-paper/20 focus-visible:ring-gold-light absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-3 focus-visible:ring-2 focus-visible:outline-none sm:right-4"
                  >
                    <ChevronRight className="size-6" aria-hidden />
                  </button>
                </>
              )}
            </div>

            <p
              id="lightbox-description"
              hidden={!showDescription}
              className="text-paper/90 mx-auto max-w-3xl px-4 py-4 text-center text-sm"
            >
              {current.alt}
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}
