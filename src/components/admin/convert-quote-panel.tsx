"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { convertQuoteToBooking } from "@/server/actions/admin/quotes";

/** Book an open quote on the client's behalf (AGENTS.md §6.10). */
export function ConvertQuotePanel({ reference }: { reference: string }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setErrors({});
    setFailure(null);
    startTransition(async () => {
      const result = await convertQuoteToBooking(reference, input);
      if (result.ok) router.push(`/admin/bookings/${result.reference}`);
      else if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setFailure(result.error);
    });
  };
  const control = (name: string) => ({
    id: `convert-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `convert-${name}-error` : undefined,
    className: adminFieldClass,
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-hydrated={hydrated}
      aria-labelledby="convert-title"
      className="bg-card space-y-4 rounded-xl border p-5"
    >
      <h2 id="convert-title" className="text-lg font-medium">
        Book this quote
      </h2>
      <p className="text-muted-foreground text-sm">
        For when the client confirms by phone or email. Books the quoted date, time and price (if
        the date is still available) and sends the usual booking emails.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="venue" idPrefix="convert-" label="Venue" hint="Optional" error={errors.venue}>
          <input {...control("venue")} />
        </Field>
        <Field
          name="paymentMethod"
          idPrefix="convert-"
          label="Deposit paid by"
          error={errors.paymentMethod}
        >
          <select {...control("paymentMethod")} defaultValue="">
            <option value="">Choose…</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CASH">Cash</option>
          </select>
        </Field>
      </div>
      <Field name="notes" idPrefix="convert-" label="Notes" hint="Optional" error={errors.notes}>
        <textarea {...control("notes")} rows={3} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="confirmed"
            aria-invalid={errors.confirmed ? true : undefined}
            aria-describedby={errors.confirmed ? "convert-confirmed-error" : undefined}
            className="accent-gold mt-0.5 size-4"
          />
          The client asked to book and accepted the terms and privacy policy
        </label>
        {errors.confirmed && (
          <p id="convert-confirmed-error" className="text-destructive mt-1 text-xs">
            {errors.confirmed}
          </p>
        )}
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Booking…" : "Create booking"}
      </Button>
      {failure && (
        <p role="alert" className="text-destructive text-sm">
          {failure}
        </p>
      )}
    </form>
  );
}
