"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { resendQuote } from "@/server/actions/admin/quotes";

type Props = { reference: string; expired: boolean; validDays: number };

/** Re-send a quote email, optionally restarting its validity. */
export function ResendQuotePanel({ reference, expired, validDays }: Props) {
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setMessage(null);
    startTransition(async () => {
      const result = await resendQuote(reference, input);
      setMessage(
        result.ok
          ? { text: "Quote sent to the client again.", failed: false }
          : { text: result.error, failed: true },
      );
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      data-hydrated={hydrated}
      aria-labelledby="resend-title"
      className="bg-card space-y-3 rounded-xl border p-5"
    >
      <h2 id="resend-title" className="text-lg font-medium">
        Re-send quote
      </h2>
      <p className="text-muted-foreground text-sm">
        Emails the client the same quote and price, in their language.
      </p>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="extend"
          defaultChecked={expired}
          className="accent-gold mt-0.5 size-4"
        />
        Make it valid for another {validDays} days from today
      </label>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Sending…" : "Re-send quote"}
      </Button>
      {message &&
        (message.failed ? (
          <p role="alert" className="text-destructive text-sm">
            {message.text}
          </p>
        ) : (
          <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">
            {message.text}
          </p>
        ))}
    </form>
  );
}
