"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { OFF_SEASON_MONTHS_KEY, RULE_DEFINITIONS } from "@/lib/admin/pricing-rules";
import { savePricingRules } from "@/server/actions/admin/pricing";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Props = { values: Record<string, string>; offSeasonMonths: number[] };

/** All pricing and booking rules on one form (AGENTS.md §8.1, §8.3). */
export function PricingRulesForm({ values, offSeasonMonths }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      ...Object.fromEntries(form),
      [OFF_SEASON_MONTHS_KEY]: form.getAll(OFF_SEASON_MONTHS_KEY),
    };
    setStatus("idle");
    startTransition(async () => {
      const result = await savePricingRules(input);
      if (result.ok) {
        setErrors({});
        setStatus("saved");
      } else if ("fieldErrors" in result) {
        setErrors(result.fieldErrors);
      } else {
        setStatus("error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-8">
      {(["Quote", "Booking"] as const).map((group) => (
        <fieldset key={group}>
          <legend className="mb-3 font-medium">
            {group === "Quote" ? "Quote calculator" : "Booking"}
          </legend>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RULE_DEFINITIONS.filter((definition) => definition.group === group).map(
              (definition) => {
                const suffix =
                  definition.kind === "percent"
                    ? "%"
                    : definition.kind === "money"
                      ? `CAD${definition.unit ? ` ${definition.unit}` : ""}`
                      : definition.unit;
                return (
                  <Field
                    key={definition.key}
                    name={definition.key}
                    idPrefix="rule-"
                    label={definition.label}
                    hint={definition.help}
                    error={errors[definition.key]}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        id={`rule-${definition.key}`}
                        name={definition.key}
                        inputMode={definition.kind === "money" ? "decimal" : "numeric"}
                        defaultValue={values[definition.key]}
                        aria-invalid={errors[definition.key] ? true : undefined}
                        aria-describedby={
                          errors[definition.key] ? `rule-${definition.key}-error` : undefined
                        }
                        className={adminFieldClass}
                      />
                      {suffix && (
                        <span className="text-muted-foreground mt-1.5 shrink-0 text-sm">
                          {suffix}
                        </span>
                      )}
                    </div>
                  </Field>
                );
              },
            )}
          </div>
          {group === "Quote" && (
            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Off-season months</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {MONTHS.map((month, index) => (
                  <label key={month} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name={OFF_SEASON_MONTHS_KEY}
                      value={index + 1}
                      defaultChecked={offSeasonMonths.includes(index + 1)}
                      className="accent-gold size-4"
                    />
                    {month}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </fieldset>
      ))}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save rules"}
        </Button>
        <p role="status" className="text-sm">
          {status === "saved" && "Saved. New quotes use these rules right away."}
        </p>
        {status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong while saving. Please try again.
          </p>
        )}
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-destructive text-sm">
            Please fix the highlighted fields.
          </p>
        )}
      </div>
    </form>
  );
}
