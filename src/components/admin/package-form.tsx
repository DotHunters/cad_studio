"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { savePackage } from "@/server/actions/admin/packages";

export type PackageFormDefaults = {
  slug: string;
  category: string;
  name: string;
  nameFr: string;
  summary: string;
  summaryFr: string;
  description: string;
  descriptionFr: string;
  basePrice: string;
  includedHours: string;
  includedShooters: string;
  editedImages: string;
  turnaroundDays: string;
  inclusions: string;
  inclusionsFr: string;
  exclusions: string;
  exclusionsFr: string;
  faqs: Array<{ q: string; a: string; qFr: string; aFr: string }>;
  isActive: boolean;
  sortOrder: string;
};

type Props = {
  id: string | null;
  defaults: PackageFormDefaults;
  categories: Array<{ value: string; label: string }>;
};

/** Create/edit a package with English and French side by side (AGENTS.md §6.10, §7). */
export function PackageForm({ id, defaults, categories }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState(false);
  const [faqs, setFaqs] = useState(defaults.faqs);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const field = (name: keyof PackageFormDefaults) => ({
    id: `pkg-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `pkg-${name}-error` : undefined,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = {
      ...Object.fromEntries(new FormData(event.currentTarget)),
      faqs: JSON.stringify(faqs),
    };
    setServerError(false);
    startTransition(async () => {
      // Redirects to the package list on success.
      const result = await savePackage(id, input);
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setServerError(true);
    });
  };

  const errorCount = Object.keys(errors).length;
  const bilingual = (
    name: "name" | "summary" | "description" | "inclusions" | "exclusions",
    label: string,
    { rows, hint }: { rows?: number; hint?: string } = {},
  ) => (
    <div className="grid gap-4 md:grid-cols-2">
      {(["", "Fr"] as const).map((suffix) => {
        const key = `${name}${suffix}` as keyof PackageFormDefaults;
        const props = {
          ...field(key),
          defaultValue: defaults[key] as string,
          className: adminFieldClass,
        };
        return (
          <Field
            key={key}
            name={key}
            error={errors[key]}
            label={`${label} (${suffix ? "French" : "English"})`}
            hint={suffix ? "Optional — English is shown when empty." : hint}
          >
            {rows ? <textarea rows={rows} {...props} /> : <input {...props} />}
          </Field>
        );
      })}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-10">
      {errorCount > 0 && (
        <p role="alert" className="text-destructive text-sm">
          Please fix{" "}
          {errorCount === 1 ? "the highlighted field" : `${errorCount} highlighted fields`}.
        </p>
      )}

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 text-lg font-medium">Basics</legend>
        <Field
          error={errors.slug}
          name="slug"
          label="Slug"
          hint="Used in the address: /packages/slug"
        >
          <input {...field("slug")} defaultValue={defaults.slug} className={adminFieldClass} />
        </Field>
        <Field error={errors.category} name="category" label="Category">
          <select
            {...field("category")}
            defaultValue={defaults.category}
            className={adminFieldClass}
          >
            <option value="">Choose…</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          error={errors.sortOrder}
          name="sortOrder"
          label="Sort order"
          hint="Lower numbers show first."
        >
          <input
            {...field("sortOrder")}
            type="number"
            min={0}
            defaultValue={defaults.sortOrder}
            className={adminFieldClass}
          />
        </Field>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={defaults.isActive}
              className="accent-gold size-4"
            />
            Active (shown on the site)
          </label>
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <legend className="mb-3 text-lg font-medium">Price and coverage</legend>
        <Field
          error={errors.basePrice}
          name="basePrice"
          label="Starting price (CAD)"
          hint="Before tax, e.g. 1200"
        >
          <input
            {...field("basePrice")}
            inputMode="decimal"
            defaultValue={defaults.basePrice}
            className={adminFieldClass}
          />
        </Field>
        <Field error={errors.includedHours} name="includedHours" label="Hours included">
          <input
            {...field("includedHours")}
            type="number"
            min={1}
            defaultValue={defaults.includedHours}
            className={adminFieldClass}
          />
        </Field>
        <Field
          error={errors.includedShooters}
          name="includedShooters"
          label="Photographers included"
        >
          <input
            {...field("includedShooters")}
            type="number"
            min={1}
            defaultValue={defaults.includedShooters}
            className={adminFieldClass}
          />
        </Field>
        <Field
          error={errors.editedImages}
          name="editedImages"
          label="Edited images"
          hint="Optional"
        >
          <input
            {...field("editedImages")}
            type="number"
            min={0}
            defaultValue={defaults.editedImages}
            className={adminFieldClass}
          />
        </Field>
        <Field
          error={errors.turnaroundDays}
          name="turnaroundDays"
          label="Turnaround (days)"
          hint="Optional"
        >
          <input
            {...field("turnaroundDays")}
            type="number"
            min={0}
            defaultValue={defaults.turnaroundDays}
            className={adminFieldClass}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-medium">Text</legend>
        {bilingual("name", "Name")}
        {bilingual("summary", "Summary", { rows: 2, hint: "One or two sentences for cards." })}
        {bilingual("description", "Description", { rows: 6, hint: "Markdown is supported." })}
        {bilingual("inclusions", "Inclusions", { rows: 5, hint: "One per line." })}
        {bilingual("exclusions", "Exclusions", { rows: 3, hint: "One per line." })}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-3 text-lg font-medium">FAQs</legend>
        {errors.faqs && (
          <p className="text-destructive text-sm" role="alert">
            FAQs: {errors.faqs}
          </p>
        )}
        {faqs.map((faq, index) => (
          <div key={index} className="bg-muted/40 grid gap-3 rounded-lg border p-4 md:grid-cols-2">
            {(["q", "qFr", "a", "aFr"] as const).map((key) => {
              const label = `${key.startsWith("q") ? "Question" : "Answer"} ${index + 1} (${key.endsWith("Fr") ? "French" : "English"})`;
              const update = (value: string) =>
                setFaqs((current) =>
                  current.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
                );
              return (
                <label key={key} className="text-sm font-medium">
                  {label}
                  {key.startsWith("q") ? (
                    <input
                      value={faq[key]}
                      onChange={(event) => update(event.target.value)}
                      className={adminFieldClass}
                    />
                  ) : (
                    <textarea
                      rows={3}
                      value={faq[key]}
                      onChange={(event) => update(event.target.value)}
                      className={adminFieldClass}
                    />
                  )}
                </label>
              );
            })}
            <div className="md:col-span-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFaqs((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 aria-hidden /> Remove FAQ {index + 1}
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setFaqs((current) => [...current, { q: "", a: "", qFr: "", aFr: "" }])}
        >
          <Plus aria-hidden /> Add FAQ
        </Button>
      </fieldset>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          Something went wrong while saving. Please try again.
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save package"}
        </Button>
      </div>
    </form>
  );
}
