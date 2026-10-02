"use client";

import { Loader2 } from "lucide-react";
import { type FormEvent, useEffect, useState, useTransition } from "react";

import { adminFieldClass, Field } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { isPlaceholderText, SITE_SETTING_DEFINITIONS } from "@/lib/admin/site-settings";
import { saveSiteSettings } from "@/server/actions/admin/settings";

type Values = Record<string, { en: string; fr: string }>;

/** Bilingual text settings, English and French side by side. */
export function SiteSettingsForm({ values }: { values: Values }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      SITE_SETTING_DEFINITIONS.map(({ key }) => [
        key,
        { en: String(form.get(`${key}.en`) ?? ""), fr: String(form.get(`${key}.fr`) ?? "") },
      ]),
    );
    setStatus("idle");
    startTransition(async () => {
      const result = await saveSiteSettings(input);
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
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-10">
      {SITE_SETTING_DEFINITIONS.map((definition) => (
        <fieldset key={definition.key}>
          <legend className="font-medium">{definition.label}</legend>
          <p className="text-muted-foreground mt-1 text-sm">{definition.help}</p>
          {(isPlaceholderText(values[definition.key].en) ||
            isPlaceholderText(values[definition.key].fr)) && (
            <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
              Still placeholder text — clients won&apos;t see it until it&apos;s replaced.
            </p>
          )}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {(["en", "fr"] as const).map((language) => {
              const name = `${definition.key}.${language}`;
              return (
                <Field
                  key={name}
                  name={name}
                  idPrefix="setting-"
                  label={`${definition.label} (${language === "en" ? "English" : "French"})`}
                  error={errors[name]}
                >
                  <textarea
                    id={`setting-${name}`}
                    name={name}
                    rows={6}
                    defaultValue={values[definition.key][language]}
                    aria-invalid={errors[name] ? true : undefined}
                    aria-describedby={errors[name] ? `setting-${name}-error` : undefined}
                    className={adminFieldClass}
                  />
                </Field>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <p role="status" className="text-sm">
          {status === "saved" && "Saved."}
        </p>
        {status === "error" && (
          <p role="alert" className="text-destructive text-sm">
            Something went wrong while saving. Please try again.
          </p>
        )}
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-destructive text-sm">
            Please fill in both languages.
          </p>
        )}
      </div>
    </form>
  );
}
