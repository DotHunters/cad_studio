"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { saveAddOn } from "@/server/actions/admin/add-ons";

export type AddOnFormDefaults = {
  code: string;
  name: string;
  nameFr: string;
  price: string;
  unit: string;
  categories: string[];
  isActive: boolean;
  sortOrder: string;
};

type Props = {
  id: string | null;
  defaults: AddOnFormDefaults;
  categories: Array<{ value: string; label: string }>;
};

const UNITS = [
  { value: "FLAT", label: "Flat — once per event" },
  { value: "PER_HOUR", label: "Per hour — × event duration" },
  { value: "PER_ITEM", label: "Per item — × quantity chosen" },
];

/** Create/edit an add-on (AGENTS.md §6.10). */
export function AddOnForm({ id, defaults, categories }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const a11y = (name: string) => ({
    id: `addon-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `addon-${name}-error` : undefined,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    // Object.fromEntries would keep only one ticked category.
    const input = { ...Object.fromEntries(form), categories: form.getAll("categories") };
    setServerError(false);
    startTransition(async () => {
      const result = await saveAddOn(id, input);
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setServerError(true);
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="max-w-3xl space-y-8">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-destructive text-sm">
          Please fix the highlighted fields.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="code"
          idPrefix="addon-"
          label="Code"
          error={errors.code}
          hint={id ? "Codes can't change — saved quotes refer to them." : "e.g. PHOTO_BOOTH"}
        >
          {id ? (
            <input id="addon-code" value={defaults.code} readOnly className={adminFieldClass} />
          ) : (
            <input {...a11y("code")} defaultValue={defaults.code} className={adminFieldClass} />
          )}
        </Field>
        <Field name="sortOrder" idPrefix="addon-" label="Sort order" error={errors.sortOrder}>
          <input
            {...a11y("sortOrder")}
            type="number"
            min={0}
            defaultValue={defaults.sortOrder}
            className={adminFieldClass}
          />
        </Field>
        <Field name="name" idPrefix="addon-" label="Name (English)" error={errors.name}>
          <input {...a11y("name")} defaultValue={defaults.name} className={adminFieldClass} />
        </Field>
        <Field
          name="nameFr"
          idPrefix="addon-"
          label="Name (French)"
          hint="Optional — English is shown when empty."
          error={errors.nameFr}
        >
          <input {...a11y("nameFr")} defaultValue={defaults.nameFr} className={adminFieldClass} />
        </Field>
        <Field
          name="price"
          idPrefix="addon-"
          label="Price (CAD)"
          hint="Before tax, e.g. 450"
          error={errors.price}
        >
          <input
            {...a11y("price")}
            inputMode="decimal"
            defaultValue={defaults.price}
            className={adminFieldClass}
          />
        </Field>
        <Field name="unit" idPrefix="addon-" label="Charged" error={errors.unit}>
          <select {...a11y("unit")} defaultValue={defaults.unit} className={adminFieldClass}>
            <option value="">Choose…</option>
            {UNITS.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset aria-describedby={errors.categories ? "addon-categories-error" : undefined}>
        <legend className="text-sm font-medium">Offered for</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {categories.map((category) => (
            <label key={category.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="categories"
                value={category.value}
                defaultChecked={defaults.categories.includes(category.value)}
                className="accent-gold size-4"
              />
              {category.label}
            </label>
          ))}
        </div>
        {errors.categories && (
          <p id="addon-categories-error" className="text-destructive mt-1 text-xs">
            {errors.categories}
          </p>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaults.isActive}
          className="accent-gold size-4"
        />
        Active (offered in quotes)
      </label>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          Something went wrong while saving. Please try again.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save add-on"}
      </Button>
    </form>
  );
}
