"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;

type Slide = {
  src: string;
  alt: string;
  blurDataUrl?: string;
  /** CSS object-position keeping the subject in frame, e.g. "50% 30%". */
  position?: string;
};

type Props = {
  slides: Slide[];
  pauseLabel: string;
  playLabel: string;
  /** Accessible label per indicator, e.g. "Show image 2 of 4". */
  slideLabels: string[];
};

/**
 * Cross-fading full-bleed hero images. Auto-advances unless the user prefers reduced
 * motion, with a pause control (WCAG 2.2.2) and slide indicators.
 */
export function HeroSlideshow({ slides, pauseLabel, playLabel, slideLabels }: Props) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % slides.length),
      INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [playing, slides.length]);

  return (
    <>
      <div className="absolute inset-0 -z-10">
        {slides.map((slide, index) => (
          <Image
            key={slide.src}
            src={slide.src}
            alt={index === active ? slide.alt : ""}
            aria-hidden={index !== active}
            fill
            priority={index === 0}
            sizes="100vw"
            placeholder={slide.blurDataUrl ? "blur" : "empty"}
            blurDataURL={slide.blurDataUrl}
            style={{ objectPosition: slide.position }}
            className={cn(
              "object-cover transition-opacity duration-300",
              index === active ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-20 flex items-center justify-center gap-3">
          <ul className="flex items-center gap-1">
            {slides.map((slide, index) => (
              <li key={slide.src}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={slideLabels[index]}
                  aria-current={index === active}
                  className="focus-visible:ring-gold-light group/dot flex h-6 items-center px-1 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "block h-0.5 transition-all duration-300",
                      index === active
                        ? "bg-gold-gradient w-8"
                        : "bg-paper/40 group-hover/dot:bg-paper/70 w-4",
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? pauseLabel : playLabel}
            className="text-paper/80 hover:text-paper focus-visible:ring-gold-light rounded-full p-1.5 focus-visible:ring-2 focus-visible:outline-none"
          >
            {playing ? (
              <Pause className="size-3.5" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
          </button>
        </div>
      )}
    </>
  );
}
