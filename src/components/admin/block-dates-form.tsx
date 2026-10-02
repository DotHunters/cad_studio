"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { blockDates } from "@/server/actions/admin/availability";

/** Block a day or a range of days. */
export function BlockDatesForm({ today }: { today: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    setErrors({});
    setMessage(null);
    startTransition(async () => {
      const result = await blockDates(input);
      if (!result.ok) {
        setErrors(result.fieldErrors);
        return;
      }
      form.reset();
      setMessage(
        `Blocked ${result.added} ${result.added === 1 ? "day" : "days"}` +
          (result.alreadyBlocked > 0 ? ` (${result.alreadyBlocked} already blocked).` : "."),
      );
    });
  };
  const control = (name: string) => ({
    id: `block-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `block-${name}-error` : undefined,
    className: adminFieldClass,
  });

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="from" idPrefix="block-" label="From" error={errors.from}>
          <input {...control("from")} type="date" min={today} />
        </Field>
        <Field
          name="to"
          idPrefix="block-"
          label="To"
          hint="Optional — for a range"
          error={errors.to}
        >
          <input {...control("to")} type="date" min={today} />
        </Field>
        <Field
          name="reason"
          idPrefix="block-"
          label="Reason"
          hint="Only visible here"
          error={errors.reason}
        >
          <input {...control("reason")} />
        </Field>
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Block dates
        </Button>
        <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">
          {message}
        </p>
      </div>
    </form>
  );
}
