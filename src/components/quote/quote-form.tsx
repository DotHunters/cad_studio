"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { type CategorySlug, categoryFromSlug, categorySlugs } from "@/lib/categories";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { calculateQuote, type QuoteResult } from "@/lib/pricing/calculate-quote";
import { toEngineInput } from "@/lib/pricing/engine-input";
import { resolvePackage } from "@/lib/pricing/rules";
import { cn } from "@/lib/utils";
import { provinceCodes, quoteDetailsSchema, quoteRequestSchema } from "@/lib/validators/quote";
import { createQuote } from "@/server/actions/quote";
import type { PricingContext } from "@/server/queries/pricing";

import { QuoteBreakdown } from "./quote-breakdown";

export type QuoteFormValues = {
  category: CategorySlug | "";
  packageSlug: string;
  eventDate: string;
  startTime: string;
  durationHours: string;
  photographers: string;
  guestCount: string;
  province: string;
  city: string;
  distanceKm: string;
  isInternational: boolean;
  /** Add-on code → quantity as typed ("0" = not selected). */
  addOnQty: Record<string, string>;
  name: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
  /** Honeypot. */
  website: string;
};

const ERROR_KEYS = [
  "required",
  "invalidDate",
  "pastDate",
  "invalidTime",
  "invalidDuration",
  "invalidNumber",
  "invalidEmail",
  "invalidPhone",
  "tooLong",
  "spam",
] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];
const isErrorKey = (key: string): key is ErrorKey =>
  (ERROR_KEYS as readonly string[]).includes(key);

/** Form values → the shape the shared schemas expect. */
function toPayload(values: QuoteFormValues) {
  return {
    ...values,
    packageSlug: values.packageSlug || undefined,
    addOns: Object.entries(values.addOnQty ?? {}).map(([code, qty]) => ({ code, qty: qty || 0 })),
  };
}

type Props = {
  context: PricingContext;
  locale: Locale;
  /** Earliest bookable date in the studio time zone (YYYY-MM-DD). */
  today: string;
  initialPackage?: string;
  initialCategory?: CategorySlug;
};

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground mt-1.5 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-destructive mt-1.5 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

/** Live quote form: every change re-runs the same engine the server uses (AGENTS.md §6.5). */
export function QuoteForm({ context, locale, today, initialPackage, initialCategory }: Props) {
  const t = useTranslations();
  const startingPackage = context.packages.find((pkg) => pkg.slug === initialPackage);
  const startingCategory =
    initialCategory ??
    (startingPackage ? (startingPackage.category.toLowerCase() as CategorySlug) : "");

  const {
    register,
    control,
    setValue,
    setError,
    clearErrors,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    defaultValues: {
      category: startingCategory,
      packageSlug: startingPackage?.slug ?? "",
      eventDate: "",
      startTime: "14:00",
      durationHours: startingPackage ? String(startingPackage.includedHours) : "4",
      photographers: startingPackage ? String(startingPackage.includedShooters) : "1",
      guestCount: "",
      province: "ON",
      city: "",
      distanceKm: "",
      isInternational: false,
      addOnQty: {},
      name: "",
      email: "",
      phone: "",
      marketingOptIn: false,
      website: "",
    },
  });
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<{ reference: string; totalCents: number } | null>(null);
  const values = useWatch({ control }) as QuoteFormValues;
  // Marks the form interactive once hydrated (used by e2e tests to avoid typing too early).
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const category = values.category ? categoryFromSlug(values.category) : null;
  const packagesInCategory = context.packages.filter((pkg) => pkg.category === category);
  const addOnsInCategory = context.addOns.filter(
    (addOn) => category && addOn.categories.includes(category),
  );
  const pkg = category
    ? resolvePackage(context.packages, category, values.packageSlug || undefined)
    : null;
  const name = (item: { name: string; nameFr: string | null }) =>
    localize(item.name, item.nameFr, locale);

  const { result, guestHint } = useMemo((): {
    result: QuoteResult | null;
    guestHint: number | null;
  } => {
    const parsed = quoteDetailsSchema.safeParse(toPayload(values));
    if (!parsed.success || !pkg || parsed.data.eventDate < today) {
      return { result: null, guestHint: null };
    }
    try {
      const quote = calculateQuote(toEngineInput(parsed.data, pkg), context);
      return { result: quote, guestHint: quote.flags.suggestedPhotographers };
    } catch {
      return { result: null, guestHint: null };
    }
  }, [values, pkg, context, today]);

  const sectionTitle = "font-heading text-2xl";

  const errorText = (field: string): string | null => {
    const key = (errors as Record<string, { message?: string } | undefined>)[field]?.message;
    if (!key) return null;
    return isErrorKey(key) ? t(`Quote.errors.${key}`) : key;
  };
  const a11y = (field: string, hintId?: string) => {
    const invalid = Boolean(errorText(field));
    const describedBy = [hintId, invalid ? `${field}-error` : undefined].filter(Boolean).join(" ");
    return { "aria-invalid": invalid || undefined, "aria-describedby": describedBy || undefined };
  };

  const showErrors = (errorsByField: Record<string, string>) => {
    const fields = Object.keys(errorsByField);
    for (const field of fields) {
      setError(field as keyof QuoteFormValues, { message: errorsByField[field] });
    }
    if (fields[0]) setFocus(fields[0] as keyof QuoteFormValues);
    toast.error(t("Quote.fixErrors"));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    clearErrors();
    const payload = toPayload(values);
    const parsed = quoteRequestSchema.safeParse(payload);
    const fieldErrors: Record<string, string> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    } else if (parsed.data.eventDate < today) {
      fieldErrors.eventDate = "pastDate";
    }
    if (!parsed.success || Object.keys(fieldErrors).length > 0) {
      showErrors(fieldErrors);
      return;
    }
    // Send the validated data; the server re-validates and re-prices it anyway.
    const request = parsed.data;

    startTransition(async () => {
      const outcome = await createQuote(request);
      if (outcome.ok) {
        setSaved({ reference: outcome.reference, totalCents: outcome.totalCents });
        return;
      }
      if (outcome.error === "validation") {
        showErrors(outcome.fieldErrors);
        return;
      }
      toast.error(
        outcome.error === "captcha"
          ? t("Quote.captchaError")
          : outcome.error === "unavailable"
            ? t("Quote.unavailable")
            : t("Quote.serverError"),
      );
    });
  };

  if (saved) {
    return (
      <div role="status" className="bg-card mx-auto max-w-2xl rounded-xl border p-8 text-center">
        <CheckCircle2 className="text-gold-text mx-auto size-10" aria-hidden />
        <h2 className="mt-4 text-3xl">{t("Quote.successTitle")}</h2>
        <p className="text-muted-foreground mt-2" data-testid="quote-reference">
          {t("Quote.successBody", {
            reference: saved.reference,
            total: formatCAD(saved.totalCents, locale),
          })}
        </p>
        <Button
          variant="outline"
          size="cta"
          className="mt-6"
          onClick={() => {
            setSaved(null);
            reset();
          }}
        >
          {t("Contact.sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <form className="space-y-10" data-hydrated={hydrated} onSubmit={onSubmit} noValidate>
        <fieldset className="space-y-6">
          <legend className={sectionTitle}>{t("Quote.sectionEvent")}</legend>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="category" label={t("Quote.category")} error={errorText("category")}>
              <select
                id="category"
                className={fieldClass}
                {...a11y("category")}
                {...register("category", {
                  onChange: () => {
                    setValue("packageSlug", "");
                    setValue("addOnQty", {});
                  },
                })}
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
            </Field>
            <Field id="packageSlug" label={t("Quote.package")}>
              <select
                id="packageSlug"
                className={fieldClass}
                disabled={!category}
                {...register("packageSlug")}
              >
                {packagesInCategory.length > 0 && (
                  <option value="">
                    {t("Quote.packageDefault", {
                      name: name(resolvePackage(context.packages, category!, undefined)!),
                      price: formatCAD(
                        resolvePackage(context.packages, category!, undefined)!.basePriceCents,
                        locale,
                        { suffix: false },
                      ),
                    })}
                  </option>
                )}
                {packagesInCategory.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {t("Quote.packageOption", {
                      name: name(option),
                      price: formatCAD(option.basePriceCents, locale, { suffix: false }),
                    })}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="eventDate" label={t("Quote.eventDate")} error={errorText("eventDate")}>
              <input
                id="eventDate"
                type="date"
                min={today}
                className={fieldClass}
                {...a11y("eventDate")}
                {...register("eventDate")}
              />
            </Field>
            <Field id="startTime" label={t("Quote.startTime")} error={errorText("startTime")}>
              <input
                id="startTime"
                type="time"
                step={900}
                className={fieldClass}
                {...a11y("startTime")}
                {...register("startTime")}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-6">
          <legend className={sectionTitle}>{t("Quote.sectionCoverage")}</legend>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field
              id="durationHours"
              label={t("Quote.durationHours")}
              error={errorText("durationHours")}
            >
              <input
                id="durationHours"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={24}
                step={0.5}
                className={fieldClass}
                {...a11y("durationHours")}
                {...register("durationHours")}
              />
            </Field>
            <Field
              id="photographers"
              label={t("Quote.photographers")}
              error={errorText("photographers")}
            >
              <input
                id="photographers"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                className={fieldClass}
                {...a11y("photographers")}
                {...register("photographers")}
              />
            </Field>
            <Field
              id="guestCount"
              label={t("Quote.guestCount")}
              hint={
                guestHint
                  ? t("Quote.guestHint", { guests: values.guestCount, count: guestHint })
                  : undefined
              }
            >
              <input
                id="guestCount"
                type="number"
                inputMode="numeric"
                min={0}
                className={fieldClass}
                aria-describedby={guestHint ? "guestCount-hint" : undefined}
                {...register("guestCount")}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-6">
          <legend className={sectionTitle}>{t("Quote.sectionLocation")}</legend>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-gold mt-1 size-4"
              {...register("isInternational")}
            />
            <span>
              {t("Quote.international")}
              <span className="text-muted-foreground block text-xs">
                {t("Quote.internationalHint")}
              </span>
            </span>
          </label>
          {!values.isInternational && (
            <div className="grid gap-6 sm:grid-cols-3">
              <Field id="province" label={t("Quote.province")}>
                <select id="province" className={fieldClass} {...register("province")}>
                  {provinceCodes
                    .filter((code) => code !== "INTL")
                    .map((code) => (
                      <option key={code} value={code}>
                        {t(`Provinces.${code}`)}
                      </option>
                    ))}
                </select>
              </Field>
              <Field id="city" label={t("Quote.city")}>
                <input
                  id="city"
                  autoComplete="address-level2"
                  className={fieldClass}
                  {...register("city")}
                />
              </Field>
              <Field
                id="distanceKm"
                label={t("Quote.distanceKm")}
                hint={t("Quote.distanceHint", { km: context.rules.FREE_TRAVEL_KM })}
              >
                <input
                  id="distanceKm"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className={fieldClass}
                  aria-describedby="distanceKm-hint"
                  {...register("distanceKm")}
                />
              </Field>
            </div>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className={sectionTitle}>{t("Quote.sectionAddOns")}</legend>
          {addOnsInCategory.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("Quote.noAddOns")}</p>
          ) : (
            <ul className="divide-border divide-y rounded-xl border">
              {addOnsInCategory.map((addOn) => {
                const qty = values.addOnQty?.[addOn.code] ?? "0";
                const selected = Number(qty) > 0;
                const unit =
                  addOn.unit === "PER_HOUR"
                    ? t("Quote.perHour")
                    : addOn.unit === "PER_ITEM"
                      ? t("Quote.perItem")
                      : "";
                return (
                  <li key={addOn.code} className="flex flex-wrap items-center gap-4 px-5 py-3">
                    <label className="flex flex-1 items-center gap-3">
                      <input
                        type="checkbox"
                        className="accent-gold size-4"
                        checked={selected}
                        onChange={(event) =>
                          setValue(`addOnQty.${addOn.code}`, event.target.checked ? "1" : "0")
                        }
                      />
                      <span>{name(addOn)}</span>
                    </label>
                    <span className="text-muted-foreground text-sm lining-nums">
                      {formatCAD(addOn.priceCents, locale, { suffix: false })} {unit}
                    </span>
                    {addOn.unit === "PER_ITEM" && selected && (
                      <label className="flex items-center gap-2 text-sm">
                        <span className="sr-only">
                          {t("Quote.quantity")} — {name(addOn)}
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          className={cn(fieldClass, "mt-0 w-20 px-3 py-2")}
                          {...register(`addOnQty.${addOn.code}`)}
                        />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <fieldset className="space-y-6">
          <legend className={sectionTitle}>{t("Quote.sectionContact")}</legend>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="name" label={t("Quote.name")} error={errorText("name")}>
              <input
                id="name"
                autoComplete="name"
                className={fieldClass}
                {...a11y("name")}
                {...register("name")}
              />
            </Field>
            <Field id="email" label={t("Quote.email")} error={errorText("email")}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={fieldClass}
                {...a11y("email")}
                {...register("email")}
              />
            </Field>
            <Field id="phone" label={t("Quote.phone")} error={errorText("phone")}>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                className={fieldClass}
                {...a11y("phone")}
                {...register("phone")}
              />
            </Field>
          </div>
          {/* CASL: opt-in, never pre-checked. */}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-gold mt-1 size-4"
              {...register("marketingOptIn")}
            />
            <span>{t("Quote.marketing")}</span>
          </label>
          <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
            <label htmlFor="quote-website">{t("Contact.honeypot")}</label>
            <input id="quote-website" tabIndex={-1} autoComplete="off" {...register("website")} />
          </div>
          <p className="text-muted-foreground text-sm">
            {t.rich("Quote.privacyNotice", {
              privacy: (chunks) => (
                <Link href="/privacy" className="text-gold-text underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <Button type="submit" size="cta" disabled={pending} className="w-full sm:w-auto">
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {pending ? t("Quote.sending") : t("Quote.submit")}
          </Button>
        </fieldset>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <QuoteBreakdown
          result={result}
          locale={locale}
          packageName={pkg ? name(pkg) : ""}
          addOnNames={Object.fromEntries(context.addOns.map((addOn) => [addOn.code, name(addOn)]))}
          depositPct={context.rules.DEPOSIT_PCT}
        />
      </aside>
    </div>
  );
}
