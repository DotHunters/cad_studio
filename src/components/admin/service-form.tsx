"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { slugFromName } from "@/lib/services";
import { saveService } from "@/server/actions/admin/services";

export type ServiceFormDefaults = {
  slug: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
};

type Props = {
  /** null when creating a service. */
  slug: string | null;
  defaults: ServiceFormDefaults;
};

/** Create/edit a service (Admin → Services). */
export function ServiceForm({ slug, defaults }: Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState(false);
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const [suggested, setSuggested] = useState(defaults.slug);
  const [slugTouched, setSlugTouched] = useState(false);

  const a11y = (name: string) => ({
    id: `service-${name}`,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `service-${name}-error` : undefined,
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = Object.fromEntries(new FormData(event.currentTarget));
    setServerError(false);
    startTransition(async () => {
      const result = await saveService(slug, input);
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
        <Field name="name" idPrefix="service-" label="Name (English)" error={errors.name}>
          <input
            {...a11y("name")}
            defaultValue={defaults.name}
            // Suggest the web address from the name while creating, until the admin edits it.
            onChange={(event) => {
              if (!slug && !slugTouched) setSuggested(slugFromName(event.target.value));
            }}
            className={adminFieldClass}
          />
        </Field>
        <Field
          name="nameFr"
          idPrefix="service-"
          label="Name (French)"
          hint="Optional — English is shown when empty."
          error={errors.nameFr}
        >
          <input {...a11y("nameFr")} defaultValue={defaults.nameFr} className={adminFieldClass} />
        </Field>
        <Field
          name="description"
          idPrefix="service-"
          label="Description (English)"
          hint="One line under the name on the home page."
          error={errors.description}
        >
          <textarea
            {...a11y("description")}
            rows={2}
            defaultValue={defaults.description}
            className={adminFieldClass}
          />
        </Field>
        <Field
          name="descriptionFr"
          idPrefix="service-"
          label="Description (French)"
          hint="Optional — English is shown when empty."
          error={errors.descriptionFr}
        >
          <textarea
            {...a11y("descriptionFr")}
            rows={2}
            defaultValue={defaults.descriptionFr}
            className={adminFieldClass}
          />
        </Field>
        <Field
          name="slug"
          idPrefix="service-"
          label="Web address"
          error={errors.slug}
          hint={
            slug
              ? "Can't change — links and saved quotes use it."
              : "Used in links, e.g. /packages?category=graduations"
          }
        >
          {slug ? (
            <input id="service-slug" value={slug} readOnly className={adminFieldClass} />
          ) : (
            <input
              {...a11y("slug")}
              value={suggested}
              onChange={(event) => {
                setSlugTouched(true);
                setSuggested(event.target.value);
              }}
              className={adminFieldClass}
            />
          )}
        </Field>
      </div>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          Something went wrong while saving. Please try again.
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        {pending ? "Saving…" : "Save service"}
      </Button>
    </form>
  );
}
