"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  videoId: string;
  playLabel: string;
  videoTitle: string;
  posterAlt: string;
};

/** "auto": started muted on scroll-in (browsers only autoplay muted video); "click": started by the visitor, with sound. */
type Mode = "poster" | "auto" | "click";

/**
 * YouTube showreel that autoplays muted, looping, once the section scrolls into view; the
 * visitor can unmute with the player controls. Until then only the poster loads, so the home
 * page pulls no YouTube scripts or cookies up front (youtube-nocookie once playing). With
 * `prefers-reduced-motion` it never autoplays and waits for the play button.
 */
export function ShowreelPlayer({ videoId, playLabel, videoTitle, posterAlt }: Props) {
  const [mode, setMode] = useState<Mode>("poster");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setMode((current) => (current === "poster" ? "auto" : current));
        observer.disconnect();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const params = new URLSearchParams({
    autoplay: "1",
    rel: "0",
    playsinline: "1",
    ...(mode === "auto" && { mute: "1", loop: "1", playlist: videoId }),
  });

  return (
    <div ref={ref} className="bg-ink relative aspect-video overflow-hidden rounded-sm">
      {mode !== "poster" ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
          title={videoTitle}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setMode("click")}
          aria-label={playLabel}
          className="group focus-visible:ring-ring absolute inset-0 size-full cursor-pointer focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt={posterAlt}
            fill
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="object-cover opacity-80 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
          />
          <span className="bg-gold-button text-ink absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none sm:size-20">
            <Play className="size-7 translate-x-0.5 fill-current sm:size-8" aria-hidden />
          </span>
        </button>
      )}
    </div>
  );
}
