"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { StatusIntent } from "@/lib/admin/booking-status";
import { changeBookingStatus } from "@/server/actions/admin/booking-status";

type Props = { reference: string; intents: StatusIntent[] };

const COPY: Record<
  StatusIntent,
  { title: string; body: string; notify: string; button: string; done: string }
> = {
  complete: {
    title: "Mark as completed",
    body: "After the event. The client can then leave a verified review.",
    notify: "Email the client a thank-you with their review link",
    button: "Mark as completed",
    done: "Marked as completed.",
  },
  cancel: {
    title: "Cancel booking",
    body: "Frees the date for other clients. Deposits and refunds are handled outside the website.",
    notify: "Email the client that the booking is cancelled",
    button: "Cancel this booking",
    done: "Booking cancelled.",
  },
};

/** Complete or cancel a booking (AGENTS.md §6.10). */
export function BookingStatusPanel({ reference, intents }: Props) {
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const submit = (intent: StatusIntent) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = { ...Object.fromEntries(new FormData(event.currentTarget)), intent };
    setMessage(null);
    startTransition(async () => {
      const result = await changeBookingStatus(reference, input);
      setMessage(
        result.ok
          ? {
              text: `${COPY[intent].done}${result.emailed ? " The client was emailed." : ""}`,
              failed: false,
            }
          : { text: result.error, failed: true },
      );
    });
  };

  return (
    <div className="space-y-4" data-hydrated={hydrated}>
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
      <div className="grid gap-6 lg:grid-cols-2">
        {intents.map((intent) => (
          <form
            key={intent}
            onSubmit={submit(intent)}
            aria-labelledby={`status-${intent}-title`}
            className="bg-card space-y-3 rounded-xl border p-5"
          >
            <h2 id={`status-${intent}-title`} className="text-lg font-medium">
              {COPY[intent].title}
            </h2>
            <p className="text-muted-foreground text-sm">{COPY[intent].body}</p>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="notify"
                defaultChecked
                className="accent-gold mt-0.5 size-4"
              />
              {COPY[intent].notify}
            </label>
            {intent === "cancel" && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" required className="accent-gold mt-0.5 size-4" />
                Yes, cancel {reference}
              </label>
            )}
            <Button
              type="submit"
              disabled={pending}
              variant={intent === "cancel" ? "destructive" : "default"}
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {COPY[intent].button}
            </Button>
          </form>
        ))}
      </div>
    </div>
  );
}
