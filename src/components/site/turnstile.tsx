"use client";

import Script from "next/script";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      action?: string;
      language?: string;
      appearance?: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/**
 * Cloudflare Turnstile for a public form (AGENTS.md §11). Renders nothing until
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (the server skips verification without its secret
 * too). Usually invisible; it only asks for a click when Cloudflare is unsure. Pass `token`
 * to the server action, and call `reset()` after each submit — tokens are single-use.
 */
export function useTurnstile(action: string) {
  const locale = useLocale();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!SITE_KEY || !ready || !container.current || !window.turnstile) return;
    const turnstile = window.turnstile;
    widgetId.current = turnstile.render(container.current, {
      sitekey: SITE_KEY,
      action,
      language: locale === "fr" ? "fr" : "en",
      appearance: "interaction-only",
      callback: setToken,
      "expired-callback": () => setToken(undefined),
      "error-callback": () => setToken(undefined),
    });
    return () => {
      if (widgetId.current) turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [ready, action, locale]);

  const reset = useCallback(() => {
    setToken(undefined);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  const element = SITE_KEY ? (
    <>
      <Script src={SCRIPT} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={container} className="min-h-0 empty:hidden" />
    </>
  ) : null;

  return { element, token, reset };
}
