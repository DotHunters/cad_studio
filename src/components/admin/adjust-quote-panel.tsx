"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { adjustQuote } from "@/server/actions/admin/quotes";

type Props = { reference: string; current: { label: string; amount: string } | null };

/** Discount or extra charge on a quote; tax and deposit are recalculated on save. */
export function AdjustQuotePanel({ reference, current }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const run = (input: Record<string, unknown>, success: string) => {
    setMessage(null);
    setErrors({});
    startTransition(async () => {
      const result = await adjustQuote(reference, input);
      if (result.ok) setMessage({ text: success, failed: false });
      else if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setMessage({ text: result.error, failed: true });
    });
  };
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(
      Object.fromEntries(new FormData(event.currentTarget)),
      "Price updated. Re-send the quote to let the client know.",
    );
  };
  const control = (name: string) => ({
    id: `adjust-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `adjust-${name}-error` : undefined,
    className: adminFieldClass,
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-hydrated={hydrated}
      aria-labelledby="adjust-title"
      className="bg-card space-y-4 rounded-xl border p-5"
    >
      <h2 id="adjust-title" className="text-lg font-medium">
        Adjust price
      </h2>
      <p className="text-muted-foreground text-sm">
        Adds one line the client will see on their quote. Tax and deposit are recalculated.
        {current && ` Current adjustment: ${current.label} (${current.amount}).`}
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="direction" idPrefix="adjust-" label="Type" error={errors.direction}>
          <select {...control("direction")} defaultValue="discount">
            <option value="discount">Discount</option>
            <option value="extra">Extra charge</option>
          </select>
        </Field>
        <Field
          name="label"
          idPrefix="adjust-"
          label="Shown as"
          hint="e.g. Returning client"
          error={errors.label}
        >
          <input {...control("label")} defaultValue={current?.label ?? ""} />
        </Field>
        <Field
          name="amount"
          idPrefix="adjust-"
          label="Amount (CAD, before tax)"
          error={errors.amount}
        >
          <input {...control("amount")} inputMode="decimal" />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {current ? "Replace adjustment" : "Apply adjustment"}
        </Button>
        {current && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => run({ intent: "remove" }, "Adjustment removed.")}
          >
            Remove adjustment
          </Button>
        )}
      </div>
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
