"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  videoId: string;
  playLabel: string;
  videoTitle: string;
  posterAlt: string;
};

/** "auto": started muted on scroll-in (browsers only autoplay muted video); "click": started by the visitor, with sound. */
type Mode = "poster" | "auto" | "click";

const YOUTUBE_ORIGINS = ["https://www.youtube-nocookie.com", "https://www.youtube.com"];
/** YouTube's "playing" player state. */
const PLAYING = 1;
/** Reveal the player anyway if YouTube never reports playback (e.g. autoplay blocked). */
const REVEAL_FALLBACK_MS = 10_000;

/** True when a postMessage from the YouTube embed says the video is playing. */
function isPlayingMessage(event: MessageEvent): boolean {
  if (!YOUTUBE_ORIGINS.includes(event.origin) || typeof event.data !== "string") return false;
  try {
    const data = JSON.parse(event.data) as { event?: string; info?: unknown };
    if (data.event === "onStateChange") return data.info === PLAYING;
    if (data.event === "infoDelivery" && data.info && typeof data.info === "object") {
      return (data.info as { playerState?: number }).playerState === PLAYING;
    }
  } catch {
    // Not a YouTube player message.
  }
  return false;
}

/**
 * YouTube showreel that autoplays muted, looping, once the section scrolls into view; the
 * visitor can unmute with the player controls. Until then only the poster loads, so the home
 * page pulls no YouTube scripts or cookies up front (youtube-nocookie once playing). The
 * poster stays over the player until YouTube reports playback, so visitors never see a black
 * loading frame. With `prefers-reduced-motion` it never autoplays and waits for the play button.
 */
export function ShowreelPlayer({ videoId, playLabel, videoTitle, posterAlt }: Props) {
  const [mode, setMode] = useState<Mode>("poster");
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  useEffect(() => {
    if (mode === "poster" || started) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source === iframeRef.current?.contentWindow && isPlayingMessage(event)) {
        setStarted(true);
      }
    };
    window.addEventListener("message", onMessage);
    // YouTube IFrame API handshake: keep saying "listening" until the player is up and
    // starts posting its state (the iframe's load event fires before the player is ready).
    const handshake = window.setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: videoId, channel: "widget" }),
        "*",
      );
    }, 250);
    const fallback = window.setTimeout(() => setStarted(true), REVEAL_FALLBACK_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(handshake);
      window.clearTimeout(fallback);
    };
  }, [mode, started, videoId]);

  const params =
    mode === "poster"
      ? null
      : new URLSearchParams({
          autoplay: "1",
          rel: "0",
          playsinline: "1",
          enablejsapi: "1",
          origin: window.location.origin,
          ...(mode === "auto" && { mute: "1", loop: "1", playlist: videoId }),
        });

  return (
    <div ref={ref} className="bg-ink relative aspect-video overflow-hidden rounded-sm">
      {params && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube-nocookie.com/embed/${videoId}?${params}`}
          title={videoTitle}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      )}

      {/* Poster: the play button before loading, then a cover until playback starts. */}
      {!started && (
        <div
          className={cn("absolute inset-0", mode !== "poster" && "pointer-events-none")}
          aria-hidden={mode !== "poster" || undefined}
        >
          <Image
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt={mode === "poster" ? posterAlt : ""}
            fill
            sizes="(min-width: 1280px) 1216px, 100vw"
            className="object-cover"
          />
          {mode === "poster" && (
            <button
              type="button"
              onClick={() => setMode("click")}
              aria-label={playLabel}
              className="group focus-visible:ring-ring absolute inset-0 size-full cursor-pointer bg-black/20 transition-colors duration-300 hover:bg-transparent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
            >
              <span className="bg-gold-button text-ink absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none sm:size-20">
                <Play className="size-7 translate-x-0.5 fill-current sm:size-8" aria-hidden />
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
