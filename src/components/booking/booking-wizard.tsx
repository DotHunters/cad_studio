"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { QuoteBreakdown } from "@/components/quote/quote-breakdown";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link, useRouter } from "@/i18n/navigation";
import { matchesQuote, type PriceFingerprint } from "@/lib/booking/quote-match";
import { type CategorySlug, categoryFromSlug, categorySlugs } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { calculateQuote, type QuoteResult } from "@/lib/pricing/calculate-quote";
import { toEngineInput } from "@/lib/pricing/engine-input";
import { resolvePackage } from "@/lib/pricing/rules";
import { cn } from "@/lib/utils";
import { bookingRequestSchema } from "@/lib/validators/booking";
import { provinceCodes } from "@/lib/validators/quote";
import { createBooking } from "@/server/actions/booking";
import type { PricingContext } from "@/server/queries/pricing";

import { AvailabilityCalendar } from "./availability-calendar";
import { useTurnstile } from "@/components/site/turnstile";

export type BookingFormValues = {
  category: CategorySlug | "";
  packageSlug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  photographers: string;
  guestCount: string;
  venue: string;
  city: string;
  province: string;
  distanceKm: string;
  isInternational: boolean;
  notes: string;
  addOns: Array<{ code: string; qty: number }>;
  name: string;
  email: string;
  phone: string;
  paymentMethod: "BANK_TRANSFER" | "CASH" | "";
  consentTerms: boolean;
  consentPrivacy: boolean;
  marketingOptIn: boolean;
  website: string;
};

/** A valid, unexpired quote the client is booking from (verified on the server). */
export type QuotePrefill = {
  reference: string;
  token: string;
  values: Partial<BookingFormValues>;
  fingerprint: PriceFingerprint;
  totalCents: number;
  depositCents: number;
};

type Props = {
  context: PricingContext;
  locale: Locale;
  today: string;
  monthsAhead: number;
  initial: Partial<BookingFormValues>;
  quote: QuotePrefill | null;
};

const STEPS = ["service", "date", "details", "contact", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Step, ReadonlyArray<keyof BookingFormValues>> = {
  service: ["category", "packageSlug"],
  date: ["eventDate", "startTime", "endTime"],
  details: ["photographers", "guestCount", "venue", "city", "province", "distanceKm", "notes"],
  contact: ["name", "email", "phone", "paymentMethod", "consentTerms", "consentPrivacy"],
  review: [],
};

const ERROR_KEYS = [
  "required",
  "invalidDate",
  "invalidTime",
  "endBeforeStart",
  "invalidNumber",
  "invalidEmail",
  "invalidPhone",
  "consentRequired",
  "tooLong",
  "spam",
  "unavailable",
] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];
const isErrorKey = (key: string): key is ErrorKey =>
  (ERROR_KEYS as readonly string[]).includes(key);

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none";

/** Half-hour options for start/end selects. */
const TIMES = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  return `${hours}:${index % 2 ? "30" : "00"}`;
});

export function BookingWizard({ context, locale, today, monthsAhead, initial, quote }: Props) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("service");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const turnstile = useTurnstile("booking");
  useEffect(() => setHydrated(true), []);

  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState: { errors },
  } = useForm<BookingFormValues>({
    defaultValues: {
      category: "",
      packageSlug: "",
      eventDate: "",
      startTime: "14:00",
      endTime: "18:00",
      photographers: "1",
      guestCount: "",
      venue: "",
      city: "",
      province: "ON",
      distanceKm: "",
      isInternational: false,
      notes: "",
      addOns: [],
      name: "",
      email: "",
      phone: "",
      paymentMethod: "",
      consentTerms: false,
      consentPrivacy: false,
      marketingOptIn: false,
      website: "",
      ...initial,
      ...quote?.values,
    },
  });
  const values = useWatch({ control }) as BookingFormValues;

  const category = values.category ? categoryFromSlug(values.category) : null;
  const pkg = category
    ? resolvePackage(context.packages, category, values.packageSlug || undefined)
    : null;
  const name = (item: { name: string; nameFr: string | null }) =>
    localize(item.name, item.nameFr, locale);

  const payload = () => ({
    ...values,
    packageSlug: values.packageSlug || undefined,
    quoteReference: quote?.reference,
    quoteToken: quote?.token,
  });

  // Price shown on review: the quoted price if nothing price-relevant changed, else fresh.
  const pricing = useMemo((): { quoted: boolean; result: QuoteResult | null } => {
    const parsed = bookingRequestSchema.safeParse(payload());
    if (!parsed.success || !pkg) return { quoted: false, result: null };
    const fingerprint: PriceFingerprint = {
      category: pkg.category,
      packageSlug: pkg.slug,
      eventDate: parsed.data.eventDate,
      startTime: parsed.data.startTime,
      durationHours: parsed.data.durationHours,
      photographers: parsed.data.photographers,
      province: parsed.data.province,
      distanceKm: parsed.data.distanceKm ?? null,
      isInternational: parsed.data.isInternational,
      addOns: parsed.data.addOns,
    };
    try {
      const result = calculateQuote(toEngineInput(parsed.data, pkg), context);
      if (quote && matchesQuote(fingerprint, quote.fingerprint)) {
        return {
          quoted: true,
          result: { ...result, totalCents: quote.totalCents, depositCents: quote.depositCents },
        };
      }
      return { quoted: false, result };
    } catch {
      return { quoted: false, result: null };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, pkg, context, quote]);

  const errorText = (field: string) => {
    const key = (errors as Record<string, { message?: string } | undefined>)[field]?.message;
    if (!key) return null;
    return isErrorKey(key) ? t(`Book.errors.${key}`) : key;
  };
  const a11y = (field: string) => ({
    "aria-invalid": errorText(field) ? true : undefined,
    "aria-describedby": errorText(field) ? `${field}-error` : undefined,
  });
  const error = (field: string) =>
    errorText(field) && (
      <p id={`${field}-error`} className="text-destructive mt-1.5 text-sm">
        {errorText(field)}
      </p>
    );

  /** Validates only the current step's fields; shows errors and focuses the first. */
  const validateStep = (current: Step): boolean => {
    clearErrors();
    const result = bookingRequestSchema.safeParse(payload());
    const fields = STEP_FIELDS[current];
    const problems = result.success
      ? []
      : result.error.issues.filter((issue) =>
          fields.includes(issue.path[0] as keyof BookingFormValues),
        );
    if (current === "date" && !values.eventDate) {
      problems.unshift({
        path: ["eventDate"],
        message: "invalidDate",
      } as (typeof problems)[number]);
    }
    if (problems.length === 0) return true;
    for (const issue of problems) {
      setError(issue.path[0] as keyof BookingFormValues, { message: issue.message });
    }
    const first = problems[0].path[0] as keyof BookingFormValues;
    if (first !== "eventDate") setFocus(first);
    toast.error(t("Book.fixErrors"));
    return false;
  };

  const index = STEPS.indexOf(step);
  const go = (next: Step) => {
    setStep(next);
    // Move focus to the step heading for screen reader and keyboard users.
    requestAnimationFrame(() => document.getElementById("booking-step-heading")?.focus());
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (step !== "review") {
      if (validateStep(step)) go(STEPS[index + 1]);
      return;
    }
    const parsed = bookingRequestSchema.safeParse(payload());
    if (!parsed.success) {
      // Data changed since its step was validated: send the client back to fix it.
      const field = parsed.error.issues[0].path[0] as keyof BookingFormValues;
      go(STEPS.find((name) => STEP_FIELDS[name].includes(field)) ?? "service");
      setError(field, { message: parsed.error.issues[0].message });
      return;
    }
    setPending(true);
    try {
      const outcome = await createBooking(parsed.data, turnstile.token);
      turnstile.reset();
      if (outcome.ok) {
        router.push({ pathname: `/book/${outcome.reference}`, query: { t: outcome.token } });
        return;
      }
      if (outcome.error === "unavailable") {
        // Someone else took the slot meanwhile: choose another date.
        go("date");
        setError("eventDate", { message: "unavailable" });
        toast.error(t("Book.errors.unavailable"));
        return;
      }
      if (outcome.error === "validation") {
        const [field, message] = Object.entries(outcome.fieldErrors)[0] ?? ["category", "required"];
        const key = field as keyof BookingFormValues;
        go(STEPS.find((name) => STEP_FIELDS[name].includes(key)) ?? "service");
        setError(key, { message });
        toast.error(t("Book.fixErrors"));
        return;
      }
      toast.error(
        outcome.error === "captcha"
          ? t("Quote.captchaError")
          : outcome.error === "rateLimited"
            ? t("Common.tooManyRequests")
            : t("Quote.serverError"),
      );
    } finally {
      setPending(false);
    }
  };

  const sectionTitle = "font-heading text-3xl focus:outline-none";
  const dateLabel = values.eventDate
    ? formatInStudioTz(`${values.eventDate}T12:00:00Z`, "PPPP", locale)
    : null;

  const consentLink = (href: "/terms" | "/privacy") =>
    function ConsentLink(chunks: ReactNode) {
      return (
        <Link href={href} className="text-gold-text underline underline-offset-4" target="_blank">
          {chunks}
        </Link>
      );
    };

  return (
    <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="space-y-10">
      {quote && (
        <p className="border-gold/50 bg-gold-light/20 rounded-lg border p-4 text-sm">
          {t("Book.fromQuote", { reference: quote.reference })}
        </p>
      )}

      <nav aria-label={t("Book.stepsLabel")}>
        <ol className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {STEPS.map((name, position) => (
            <li
              key={name}
              aria-current={name === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-2",
                name === step ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs",
                  position < index && "bg-gold-button text-ink border-transparent",
                  name === step && "border-gold",
                )}
              >
                {position < index ? <Check className="size-3" aria-hidden /> : position + 1}
              </span>
              {t(`Book.steps.${name}`)}
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="booking-step-heading" className="space-y-6">
        <p className="text-muted-foreground text-xs tracking-[0.2em] uppercase">
          {t("Book.stepOf", { current: index + 1, total: STEPS.length })}
        </p>
        <h2 id="booking-step-heading" tabIndex={-1} className={sectionTitle}>
          {step === "review" ? t("Book.reviewTitle") : t(`Book.steps.${step}`)}
        </h2>

        {step === "service" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="category" className="text-sm font-medium">
                {t("Book.category")}
              </label>
              <select
                id="category"
                className={fieldClass}
                {...a11y("category")}
                {...register("category", { onChange: () => setValue("packageSlug", "") })}
              >
                <option value="" disabled>
                  {t("Contact.selectType")}
                </option>
                {categorySlugs.map((slug) => (
                  <option key={slug} value={slug}>
                    {t(`Categories.${slug}.name`)}
                  </option>
                ))}
              </select>
              {error("category")}
            </div>
            <div>
              <label htmlFor="packageSlug" className="text-sm font-medium">
                {t("Book.package")}
              </label>
              <select
                id="packageSlug"
                className={fieldClass}
                disabled={!category}
                {...register("packageSlug")}
              >
                {context.packages
                  .filter((option) => option.category === category)
                  .map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {t("Quote.packageOption", {
                        name: name(option),
                        price: formatCAD(option.basePriceCents, locale, { suffix: false }),
                      })}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {step === "date" && (
          <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
            <div>
              <p id="calendar-label" className="text-sm font-medium">
                {t("Book.calendarLabel")}
              </p>
              <div className="mt-2">
                <AvailabilityCalendar
                  value={values.eventDate || null}
                  onChange={(date) => {
                    setValue("eventDate", date);
                    clearErrors("eventDate");
                  }}
                  locale={locale}
                  today={today}
                  monthsAhead={monthsAhead}
                  describedBy={errorText("eventDate") ? "eventDate-error" : "calendar-label"}
                />
              </div>
              {error("eventDate")}
            </div>
            <div className="space-y-6">
              <p className="text-sm" aria-live="polite">
                {dateLabel ? t("Book.selectedDate", { date: dateLabel }) : t("Book.noDate")}
              </p>
              <div className="grid gap-6 sm:grid-cols-2">
                {(["startTime", "endTime"] as const).map((field) => (
                  <div key={field}>
                    <label htmlFor={field} className="text-sm font-medium">
                      {t(`Book.${field}`)}
                    </label>
                    <select id={field} className={fieldClass} {...a11y(field)} {...register(field)}>
                      {TIMES.map((time) => (
                        <option key={time} value={time}>
                          {formatInStudioTz(`2026-01-01T${time}:00`, "p", locale, "UTC")}
                        </option>
                      ))}
                    </select>
                    {error(field)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <label htmlFor="photographers" className="text-sm font-medium">
                  {t("Book.photographers")}
                </label>
                <input
                  id="photographers"
                  type="number"
                  min={1}
                  max={10}
                  className={fieldClass}
                  {...a11y("photographers")}
                  {...register("photographers")}
                />
                {error("photographers")}
              </div>
              <div>
                <label htmlFor="guestCount" className="text-sm font-medium">
                  {t("Book.guestCount")}
                </label>
                <input
                  id="guestCount"
                  type="number"
                  min={0}
                  className={fieldClass}
                  {...a11y("guestCount")}
                  {...register("guestCount")}
                />
                {error("guestCount")}
              </div>
              <div>
                <label htmlFor="venue" className="text-sm font-medium">
                  {t("Book.venue")}
                </label>
                <input
                  id="venue"
                  className={fieldClass}
                  {...a11y("venue")}
                  {...register("venue")}
                />
                {error("venue")}
              </div>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="accent-gold mt-1 size-4"
                {...register("isInternational")}
              />
              <span>{t("Quote.international")}</span>
            </label>
            {!values.isInternational && (
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label htmlFor="province" className="text-sm font-medium">
                    {t("Quote.province")}
                  </label>
                  <select id="province" className={fieldClass} {...register("province")}>
                    {provinceCodes
                      .filter((code) => code !== "INTL")
                      .map((code) => (
                        <option key={code} value={code}>
                          {t(`Provinces.${code}`)}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="city" className="text-sm font-medium">
                    {t("Quote.city")}
                  </label>
                  <input id="city" className={fieldClass} {...register("city")} />
                </div>
                <div>
                  <label htmlFor="distanceKm" className="text-sm font-medium">
                    {t("Quote.distanceKm")}
                  </label>
                  <input
                    id="distanceKm"
                    type="number"
                    min={0}
                    className={fieldClass}
                    {...a11y("distanceKm")}
                    {...register("distanceKm")}
                  />
                  {error("distanceKm")}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                {t("Book.notes")}
              </label>
              <textarea
                id="notes"
                rows={4}
                className={fieldClass}
                {...a11y("notes")}
                {...register("notes")}
              />
              {error("notes")}
            </div>
          </div>
        )}

        {step === "contact" && (
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-3">
              {(["name", "email", "phone"] as const).map((field) => (
                <div key={field}>
                  <label htmlFor={field} className="text-sm font-medium">
                    {t(`Book.${field}`)}
                  </label>
                  <input
                    id={field}
                    type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                    autoComplete={field === "name" ? "name" : field === "email" ? "email" : "tel"}
                    className={fieldClass}
                    {...a11y(field)}
                    {...register(field)}
                  />
                  {error(field)}
                </div>
              ))}
            </div>

            <fieldset {...a11y("paymentMethod")}>
              <legend className="text-sm font-medium">{t("Book.paymentMethod")}</legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["BANK_TRANSFER", "payBank", "payBankHint"],
                    ["CASH", "payCash", "payCashHint"],
                  ] as const
                ).map(([method, label, hint]) => (
                  <label
                    key={method}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border p-4",
                      values.paymentMethod === method && "border-gold bg-gold-light/10",
                    )}
                  >
                    <input
                      type="radio"
                      value={method}
                      className="accent-gold mt-1"
                      {...register("paymentMethod")}
                    />
                    <span>
                      <span className="block font-medium">{t(`Book.${label}`)}</span>
                      <span className="text-muted-foreground block text-sm">
                        {t(`Book.${hint}`)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {error("paymentMethod")}
            </fieldset>

            <div className="space-y-3 text-sm">
              {(["consentTerms", "consentPrivacy"] as const).map((field) => (
                <div key={field}>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="accent-gold mt-1 size-4"
                      {...a11y(field)}
                      {...register(field)}
                    />
                    <span>
                      {t.rich(`Book.${field}`, {
                        terms: consentLink("/terms"),
                        privacy: consentLink("/privacy"),
                      })}
                    </span>
                  </label>
                  {error(field)}
                </div>
              ))}
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="accent-gold mt-1 size-4"
                  {...register("marketingOptIn")}
                />
                <span>{t("Book.marketing")}</span>
              </label>
            </div>
            <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
              <label htmlFor="booking-website">{t("Contact.honeypot")}</label>
              <input
                id="booking-website"
                tabIndex={-1}
                autoComplete="off"
                {...register("website")}
              />
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            <dl className="divide-border divide-y rounded-xl border text-sm">
              {[
                [t("Book.steps.service"), pkg ? name(pkg) : "—"],
                [
                  t("Book.reviewWhen"),
                  `${dateLabel ?? "—"} · ${values.startTime}–${values.endTime}`,
                ],
                [
                  t("Book.reviewWhere"),
                  values.isInternational
                    ? t("Provinces.INTL")
                    : [values.venue, values.city, t(`Provinces.${values.province as "ON"}`)]
                        .filter(Boolean)
                        .join(", "),
                ],
                [t("Book.photographers"), values.photographers],
                [t("Book.reviewWho"), `${values.name} · ${values.email}`],
                [
                  t("Book.reviewPayment"),
                  values.paymentMethod === "CASH" ? t("Book.payCash") : t("Book.payBank"),
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-5 py-3">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-4">
              {pricing.quoted && quote ? (
                <div className="bg-card rounded-xl border p-6 shadow-sm">
                  <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">
                    {t("Book.quotedPrice", { reference: quote.reference })}
                  </p>
                  <p className="font-heading mt-1 text-4xl lining-nums" data-testid="booking-total">
                    {formatCAD(quote.totalCents, locale)}
                  </p>
                </div>
              ) : (
                <QuoteBreakdown
                  result={pricing.result}
                  locale={locale}
                  packageName={pkg ? name(pkg) : ""}
                  addOnNames={Object.fromEntries(
                    context.addOns.map((addOn) => [addOn.code, name(addOn)]),
                  )}
                  depositPct={context.rules.DEPOSIT_PCT}
                />
              )}
              {pricing.result && (
                <p className="text-sm" data-testid="booking-deposit">
                  {t("Book.depositNote", {
                    percent: context.rules.DEPOSIT_PCT,
                    amount: formatCAD(pricing.result.depositCents, locale),
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        {index > 0 ? (
          <Button type="button" variant="outline" size="cta" onClick={() => go(STEPS[index - 1])}>
            {t("Book.back")}
          </Button>
        ) : (
          <span />
        )}
        {turnstile.element}
        <Button type="submit" size="cta" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {step === "review" ? (pending ? t("Book.sending") : t("Book.submit")) : t("Book.next")}
        </Button>
      </div>
    </form>
  );
}
