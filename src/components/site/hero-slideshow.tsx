"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;

type Slide = { src: string; alt: string };

type Props = {
  slides: Slide[];
  pauseLabel: string;
  playLabel: string;
};

/**
 * Cross-fading full-bleed hero images. Auto-advances unless the user prefers reduced
 * motion, and offers a pause control (WCAG 2.2.2).
 */
export function HeroSlideshow({ slides, pauseLabel, playLabel }: Props) {
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
    <div className="absolute inset-0">
      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={index === active ? slide.alt : ""}
          aria-hidden={index !== active}
          fill
          priority={index === 0}
          sizes="100vw"
          className={cn(
            "object-cover transition-opacity duration-300",
            index === active ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      {slides.length > 1 && (
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? pauseLabel : playLabel}
          className="text-paper focus-visible:ring-gold-light absolute right-4 bottom-4 z-10 rounded-full bg-black/50 p-2 focus-visible:ring-2 focus-visible:outline-none"
        >
          {playing ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
        </button>
      )}
    </div>
  );
}
