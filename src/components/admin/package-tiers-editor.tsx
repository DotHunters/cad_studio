"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { adminFieldClass } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";

export type TierDraft = {
  /** Empty for a new tier; the server assigns one from the name. */
  key: string;
  name: string;
  nameFr: string;
  basePrice: string;
  includedHours: string;
  includedShooters: string;
  editedImages: string;
  turnaroundDays: string;
  inclusions: string;
  inclusionsFr: string;
};

export const EMPTY_TIER: TierDraft = {
  key: "",
  name: "",
  nameFr: "",
  basePrice: "",
  includedHours: "",
  includedShooters: "1",
  editedImages: "",
  turnaroundDays: "",
  inclusions: "",
  inclusionsFr: "",
};

const FIELDS: Array<{
  name: Exclude<keyof TierDraft, "key">;
  label: string;
  hint?: string;
  kind?: "number" | "money" | "lines";
}> = [
  { name: "name", label: "Name (English)", hint: "e.g. Gold" },
  { name: "nameFr", label: "Name (French)", hint: "Optional, e.g. Or" },
  { name: "basePrice", label: "Price (CAD)", hint: "Before tax", kind: "money" },
  { name: "includedHours", label: "Hours included", kind: "number" },
  { name: "includedShooters", label: "Photographers included", kind: "number" },
  { name: "editedImages", label: "Edited images", hint: "Optional", kind: "number" },
  { name: "turnaroundDays", label: "Turnaround (days)", hint: "Optional", kind: "number" },
  { name: "inclusions", label: "Inclusions (English)", hint: "One per line", kind: "lines" },
  { name: "inclusionsFr", label: "Inclusions (French)", hint: "Optional", kind: "lines" },
];

/**
 * Options such as Silver / Gold / Platinum (AGENTS.md §6.2). With options, clients choose one
 * and its price and coverage replace the package's own; without, the package is one option.
 */
export function PackageTiersEditor({
  tiers,
  onChange,
  errors,
}: {
  tiers: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
  errors: Record<string, string>;
}) {
  const update = (index: number, patch: Partial<TierDraft>) =>
    onChange(tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...tiers];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-lg font-medium">Options (Silver, Gold, Platinum…)</legend>
      <p className="text-muted-foreground text-sm">
        Optional. Each option has its own price and coverage, and clients pick one. With options,
        the website shows “from” the cheapest one and the price above is only a default.
      </p>
      {errors.tiers && !Object.keys(errors).some((key) => key.startsWith("tiers.")) && (
        <p className="text-destructive text-sm" role="alert">
          Options: {errors.tiers}
        </p>
      )}
      {tiers.map((tier, index) => {
        const label = tier.name || `Option ${index + 1}`;
        return (
          <div
            key={index}
            role="group"
            aria-label={label}
            className="bg-muted/40 rounded-lg border p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {FIELDS.map((field) => {
                const id = `tier-${index}-${field.name}`;
                const error = errors[`tiers.${index}.${field.name}`];
                const props = {
                  id,
                  value: tier[field.name],
                  "aria-invalid": error ? true : undefined,
                  "aria-describedby": error ? `${id}-error` : undefined,
                  className: adminFieldClass,
                };
                return (
                  <div
                    key={field.name}
                    className={
                      field.kind === "lines" ? "sm:col-span-2 lg:col-span-5 xl:col-span-2" : ""
                    }
                  >
                    <label htmlFor={id} className="text-sm font-medium">
                      {field.label} <span className="sr-only">for option {index + 1}</span>
                    </label>
                    {field.kind === "lines" ? (
                      <textarea
                        rows={3}
                        {...props}
                        onChange={(event) => update(index, { [field.name]: event.target.value })}
                      />
                    ) : (
                      <input
                        {...props}
                        type={field.kind === "number" ? "number" : "text"}
                        inputMode={field.kind === "money" ? "decimal" : undefined}
                        min={field.kind === "number" ? 0 : undefined}
                        onChange={(event) => update(index, { [field.name]: event.target.value })}
                      />
                    )}
                    {field.hint && (
                      <p className="text-muted-foreground mt-1 text-xs">{field.hint}</p>
                    )}
                    {error && (
                      <p id={`${id}-error`} className="text-destructive mt-1 text-xs">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp aria-hidden /> Move {label} up
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === tiers.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown aria-hidden /> Move {label} down
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange(tiers.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden /> Remove {label}
              </Button>
            </div>
          </div>
        );
      })}
      {tiers.length < 6 && (
        <Button type="button" variant="outline" onClick={() => onChange([...tiers, EMPTY_TIER])}>
          <Plus aria-hidden /> Add option
        </Button>
      )}
    </fieldset>
  );
}
