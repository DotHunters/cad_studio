"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import type { TaxRateRow } from "@/lib/admin/tax-rates";
import { saveTaxRates } from "@/server/actions/admin/pricing";

const FIELDS = ["gst", "pst", "hst", "label"] as const;
const HEADINGS: Record<(typeof FIELDS)[number], string> = {
  gst: "GST %",
  pst: "PST/QST %",
  hst: "HST %",
  label: "Label on quotes",
};

/** Sales tax per province (AGENTS.md §8.2), as percentages. */
export function TaxRatesForm({ rows }: { rows: TaxRateRow[] }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = rows.map((row) => ({
      province: row.province,
      ...Object.fromEntries(
        FIELDS.map((field) => [field, String(form.get(`${row.province}.${field}`) ?? "")]),
      ),
    }));
    setStatus("idle");
    startTransition(async () => {
      const result = await saveTaxRates(input);
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
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-4">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">
                Province
              </th>
              {FIELDS.map((field) => (
                <th key={field} scope="col" className="px-3 py-2 font-medium">
                  {HEADINGS[field]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.province}>
                <th scope="row" className="px-3 py-2 font-mono font-medium">
                  {row.province === "INTL" ? "Outside Canada" : row.province}
                </th>
                {FIELDS.map((field) => {
                  const name = `${row.province}.${field}`;
                  return (
                    <td key={field} className="px-3 py-2 align-top">
                      <input
                        name={name}
                        defaultValue={row[field]}
                        inputMode={field === "label" ? "text" : "decimal"}
                        aria-label={`${row.province} ${HEADINGS[field]}`}
                        aria-invalid={errors[name] ? true : undefined}
                        aria-describedby={errors[name] ? `tax-${name}-error` : undefined}
                        className={`${adminFieldClass} mt-0 ${field === "label" ? "min-w-40" : "w-24"}`}
                      />
                      {errors[name] && (
                        <p id={`tax-${name}-error`} className="text-destructive mt-1 text-xs">
                          {errors[name]}
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save tax rates"}
        </Button>
        <p role="status" className="text-sm">
          {status === "saved" && "Saved. New quotes use these rates right away."}
        </p>
        {status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong while saving. Please try again.
          </p>
        )}
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-destructive text-sm">
            Please fix the highlighted rates.
          </p>
        )}
      </div>
    </form>
  );
}
