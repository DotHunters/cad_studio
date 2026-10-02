"use client";

import { CheckCircle2, Loader2, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { categorySlugs } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { submitReview } from "@/server/actions/review";

type Props = {
  /** Signed booking link from a completed booking (6.3) — marks the review as verified. */
  booking?: { reference: string; exp: string; token: string; category: string };
};

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none";

const ERROR_KEYS = [
  "required",
  "ratingRequired",
  "bodyTooShort",
  "tooLong",
  "consentRequired",
  "spam",
] as const;
const isErrorKey = (key: string): key is (typeof ERROR_KEYS)[number] =>
  (ERROR_KEYS as readonly string[]).includes(key);

/** Public review form (AGENTS.md §6.7). Submissions are always moderated before publishing. */
export function ReviewForm({ booking }: Props) {
  const t = useTranslations();
  const [asCompany, setAsCompany] = useState(false);
  const [rating, setRating] = useState(0);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<false | "server" | "rateLimited">(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Lets e2e tests wait until the submit handler is attached.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const errorText = (field: string) => {
    const key = errors[field];
    return key ? (isErrorKey(key) ? t(`ReviewForm.errors.${key}`) : key) : null;
  };
  const a11y = (field: string) => ({
    "aria-invalid": errorText(field) ? true : undefined,
    "aria-describedby": errorText(field) ? `review-${field}-error` : undefined,
  });
  const error = (field: string): ReactNode =>
    errorText(field) && (
      <p id={`review-${field}-error`} className="text-destructive mt-1.5 text-sm">
        {errorText(field)}
      </p>
    );

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setServerError(false);
    setErrors({});
    try {
      const result = await submitReview({
        type: asCompany ? "RECOMMENDATION" : "CUSTOMER",
        authorName: String(form.get("authorName") ?? ""),
        authorTitle: String(form.get("authorTitle") ?? ""),
        company: String(form.get("company") ?? ""),
        rating: asCompany ? "" : rating ? String(rating) : "",
        category: String(form.get("category") ?? ""),
        body: String(form.get("body") ?? ""),
        consentToPublish: form.get("consentToPublish") === "on",
        bookingReference: booking?.reference,
        bookingToken: booking?.token,
        bookingExp: booking?.exp,
        website: String(form.get("website") ?? ""),
      });
      if (result.ok) setSent(true);
      else if (result.error === "validation") setErrors(result.fieldErrors);
      else setServerError(result.error === "rateLimited" ? "rateLimited" : "server");
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div role="status" className="bg-card rounded-xl border p-8 text-center">
        <CheckCircle2 className="text-gold-text mx-auto size-10" aria-hidden />
        <p className="font-heading mt-4 text-2xl">{t("ReviewForm.successTitle")}</p>
        <p className="text-muted-foreground mt-2">{t("ReviewForm.successBody")}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      data-hydrated={hydrated}
      className="bg-card space-y-6 rounded-xl border p-6 sm:p-8"
    >
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="accent-gold mt-1 size-4"
          checked={asCompany}
          onChange={(event) => setAsCompany(event.target.checked)}
        />
        <span>{t("ReviewForm.asCompany")}</span>
      </label>

      {!asCompany && (
        <fieldset {...a11y("rating")}>
          <legend className="text-sm font-medium">{t("ReviewForm.rating")}</legend>
          <div className="mt-2 flex gap-1" role="radiogroup">
            {[1, 2, 3, 4, 5].map((value) => (
              <label key={value} className="cursor-pointer p-1">
                <input
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="peer sr-only"
                />
                <span className="sr-only">{t("ReviewForm.star", { count: value })}</span>
                <Star
                  aria-hidden
                  className={cn(
                    "peer-focus-visible:ring-ring size-8 rounded peer-focus-visible:ring-2",
                    value <= rating ? "fill-gold text-gold" : "text-muted-foreground/50",
                  )}
                />
              </label>
            ))}
          </div>
          {error("rating")}
        </fieldset>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="authorName" className="text-sm font-medium">
            {t("ReviewForm.name")}
          </label>
          <input
            id="authorName"
            name="authorName"
            autoComplete="name"
            className={fieldClass}
            {...a11y("authorName")}
          />
          {!asCompany && (
            <p className="text-muted-foreground mt-1.5 text-xs">{t("ReviewForm.nameHint")}</p>
          )}
          {error("authorName")}
        </div>
        {asCompany ? (
          <>
            <div>
              <label htmlFor="authorTitle" className="text-sm font-medium">
                {t("ReviewForm.title")}
              </label>
              <input id="authorTitle" name="authorTitle" className={fieldClass} />
            </div>
            <div>
              <label htmlFor="company" className="text-sm font-medium">
                {t("ReviewForm.company")}
              </label>
              <input
                id="company"
                name="company"
                autoComplete="organization"
                className={fieldClass}
                {...a11y("company")}
              />
              {error("company")}
            </div>
          </>
        ) : null}
        <div>
          <label htmlFor="review-category" className="text-sm font-medium">
            {t("ReviewForm.category")}
          </label>
          <select
            id="review-category"
            name="category"
            defaultValue={booking?.category ?? ""}
            className={fieldClass}
          >
            <option value="">—</option>
            {categorySlugs.map((slug) => (
              <option key={slug} value={slug}>
                {t(`Categories.${slug}.name`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="review-body" className="text-sm font-medium">
          {t("ReviewForm.body")}
        </label>
        <textarea id="review-body" name="body" rows={5} className={fieldClass} {...a11y("body")} />
        {error("body")}
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="consentToPublish"
            className="accent-gold mt-1 size-4"
            {...a11y("consentToPublish")}
          />
          <span>{t("ReviewForm.consent")}</span>
        </label>
        {error("consentToPublish")}
      </div>

      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="review-website">{t("Contact.honeypot")}</label>
        <input id="review-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {serverError && (
        <p role="alert" className="text-destructive text-sm">
          {serverError === "rateLimited"
            ? t("Common.tooManyRequests")
            : t("ReviewForm.serverError")}
        </p>
      )}

      <Button type="submit" size="cta" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? t("ReviewForm.sending") : t("ReviewForm.submit")}
      </Button>
    </form>
  );
}
