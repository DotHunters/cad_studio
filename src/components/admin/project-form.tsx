"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { saveProject } from "@/server/actions/admin/projects";

export type ProjectFormDefaults = {
  slug: string;
  title: string;
  titleFr: string;
  clientName: string;
  consentToPublish: boolean;
  category: string;
  reach: string;
  city: string;
  country: string;
  year: string;
  story: string;
  storyFr: string;
  featured: boolean;
  published: boolean;
};

type Props = {
  id: string | null;
  defaults: ProjectFormDefaults;
  categories: Array<{ value: string; label: string }>;
};

/** Create/edit a portfolio case study (AGENTS.md §6.3). */
export function ProjectForm({ id, defaults, categories }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const control = (name: keyof ProjectFormDefaults) => ({
    id: `project-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `project-${name}-error` : undefined,
    className: adminFieldClass,
  });
  const field = (name: keyof ProjectFormDefaults, label: string, hint?: string) => ({
    name,
    label,
    hint,
    idPrefix: "project-",
    error: errors[name],
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setServerError(false);
    startTransition(async () => {
      const result = await saveProject(id, input);
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setServerError(true);
    });
  };

  const checkbox = (name: keyof ProjectFormDefaults, label: string) => (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaults[name] as boolean}
        className="accent-gold mt-0.5 size-4"
      />
      <span>{label}</span>
    </label>
  );

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-8">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-destructive text-sm">
          Please fix the highlighted fields.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field {...field("slug", "Slug", "Used in the address: /portfolio/slug")}>
          <input {...control("slug")} defaultValue={defaults.slug} />
        </Field>
        <Field {...field("category", "Category")}>
          <select {...control("category")} defaultValue={defaults.category}>
            <option value="">Choose…</option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>
        <Field {...field("reach", "Local or global")}>
          <select {...control("reach")} defaultValue={defaults.reach}>
            <option value="">Choose…</option>
            <option value="LOCAL">Local</option>
            <option value="GLOBAL">Global</option>
          </select>
        </Field>
        <Field {...field("year", "Year", "Optional")}>
          <input {...control("year")} inputMode="numeric" defaultValue={defaults.year} />
        </Field>
        <Field {...field("city", "City", "Optional")}>
          <input {...control("city")} defaultValue={defaults.city} />
        </Field>
        <Field {...field("country", "Country")}>
          <input {...control("country")} defaultValue={defaults.country} />
        </Field>
        <Field {...field("clientName", "Client name", "Leave empty for “Private client”.")}>
          <input {...control("clientName")} defaultValue={defaults.clientName} />
        </Field>
        <div className="flex items-end pb-2">
          {checkbox("consentToPublish", "Client agreed to be named publicly")}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field {...field("title", "Title (English)")}>
          <input {...control("title")} defaultValue={defaults.title} />
        </Field>
        <Field {...field("titleFr", "Title (French)", "Optional — English is shown when empty.")}>
          <input {...control("titleFr")} defaultValue={defaults.titleFr} />
        </Field>
        <Field
          {...field(
            "story",
            "Story (English)",
            "The brief, the challenge and the approach. Markdown.",
          )}
        >
          <textarea {...control("story")} rows={10} defaultValue={defaults.story} />
        </Field>
        <Field {...field("storyFr", "Story (French)", "Optional — English is shown when empty.")}>
          <textarea {...control("storyFr")} rows={10} defaultValue={defaults.storyFr} />
        </Field>
      </div>

      <div className="space-y-3">
        {checkbox("published", "Published (shown on the website)")}
        {checkbox("featured", "Featured on the home page")}
      </div>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          Something went wrong while saving. Please try again.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save project"}
      </Button>
    </form>
  );
}
