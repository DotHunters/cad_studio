"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { saveImage } from "@/server/actions/admin/images";

export type ImageFormDefaults = {
  alt: string;
  altFr: string;
  category: string;
  tags: string;
  inGallery: boolean;
  sortOrder: string;
  projectId: string;
  isCover: boolean;
  consentToPublish: boolean;
};

type Option = { value: string; label: string };

type Props = {
  id: string;
  defaults: ImageFormDefaults;
  categories: Option[];
  projects: Option[];
};

/** Describe, file and approve one image (AGENTS.md §6.4, §9). */
export function ImageForm({ id, defaults, categories, projects }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const control = (name: keyof ImageFormDefaults) => ({
    id: `image-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `image-${name}-error` : undefined,
    className: adminFieldClass,
  });
  const field = (name: keyof ImageFormDefaults, label: string, hint?: string) => ({
    name,
    label,
    hint,
    idPrefix: "image-",
    error: errors[name],
  });
  const checkbox = (name: keyof ImageFormDefaults, label: string) => (
    <div>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          id={`image-${name}`}
          name={name}
          defaultChecked={defaults[name] as boolean}
          aria-invalid={errors[name] ? true : undefined}
          aria-describedby={errors[name] ? `image-${name}-error` : undefined}
          className="accent-gold mt-0.5 size-4"
        />
        <span>{label}</span>
      </label>
      {errors[name] && (
        <p id={`image-${name}-error`} className="text-destructive mt-1 text-xs">
          {errors[name]}
        </p>
      )}
    </div>
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setServerError(false);
    startTransition(async () => {
      const result = await saveImage(id, input);
      if ("fieldErrors" in result) setErrors(result.fieldErrors);
      else setServerError(true);
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-6">
      {Object.keys(errors).length > 0 && (
        <p role="alert" className="text-destructive text-sm">
          Please fix the highlighted fields.
        </p>
      )}

      <Field
        {...field(
          "alt",
          "Alt text (English)",
          "Describe what's in the photo for people who can't see it.",
        )}
      >
        <input {...control("alt")} defaultValue={defaults.alt} />
      </Field>
      <Field {...field("altFr", "Alt text (French)", "Optional — English is used when empty.")}>
        <input {...control("altFr")} defaultValue={defaults.altFr} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field {...field("category", "Category", "Used by the gallery filters.")}>
          <select {...control("category")} defaultValue={defaults.category}>
            <option value="">None</option>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field {...field("tags", "Tags", "Comma-separated, e.g. outdoor, golden hour")}>
          <input {...control("tags")} defaultValue={defaults.tags} />
        </Field>
        <Field {...field("projectId", "Project")}>
          <select {...control("projectId")} defaultValue={defaults.projectId}>
            <option value="">No project</option>
            {projects.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field {...field("sortOrder", "Order", "Lower numbers show first.")}>
          <input {...control("sortOrder")} inputMode="numeric" defaultValue={defaults.sortOrder} />
        </Field>
      </div>

      <div className="space-y-3">
        {checkbox("consentToPublish", "Client consent to publish obtained")}
        {checkbox("inGallery", "Show in the gallery")}
        {checkbox("isCover", "Use as the project's cover image")}
      </div>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          Something went wrong while saving. Please try again.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save image"}
      </Button>
    </form>
  );
}
