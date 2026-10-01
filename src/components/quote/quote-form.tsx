"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import type { Locale } from "@/config/site";
import { type CategorySlug, categoryFromSlug, categorySlugs } from "@/lib/categories";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { calculateQuote, type QuoteResult } from "@/lib/pricing/calculate-quote";
import { resolvePackage } from "@/lib/pricing/rules";
import { cn } from "@/lib/utils";
import { provinceCodes, quoteDetailsSchema } from "@/lib/validators/quote";
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
};

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
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
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

  const { register, control, setValue } = useForm<QuoteFormValues>({
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
    },
  });
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
    const parsed = quoteDetailsSchema.safeParse({
      ...values,
      packageSlug: values.packageSlug || undefined,
      addOns: Object.entries(values.addOnQty ?? {}).map(([code, qty]) => ({ code, qty: qty || 0 })),
    });
    if (!parsed.success || !pkg || parsed.data.eventDate < today)
      return { result: null, guestHint: null };
    try {
      const quote = calculateQuote(
        {
          category: pkg.category,
          pkg,
          eventDate: parsed.data.eventDate,
          durationHours: parsed.data.durationHours,
          photographers: parsed.data.photographers,
          guestCount: parsed.data.guestCount,
          province: parsed.data.province,
          distanceKm: parsed.data.distanceKm ?? null,
          isInternational: parsed.data.isInternational,
          addOns: parsed.data.addOns,
        },
        context,
      );
      return { result: quote, guestHint: quote.flags.suggestedPhotographers };
    } catch {
      return { result: null, guestHint: null };
    }
  }, [values, pkg, context, today]);

  const sectionTitle = "font-heading text-2xl";

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      <form
        className="space-y-10"
        data-hydrated={hydrated}
        onSubmit={(event) => event.preventDefault()}
        noValidate
      >
        <fieldset className="space-y-6">
          <legend className={sectionTitle}>{t("Quote.sectionEvent")}</legend>
          <div className="grid gap-6 sm:grid-cols-2">
            <Field id="category" label={t("Quote.category")}>
              <select
                id="category"
                className={fieldClass}
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
            <Field id="eventDate" label={t("Quote.eventDate")}>
              <input
                id="eventDate"
                type="date"
                min={today}
                className={fieldClass}
                {...register("eventDate")}
              />
            </Field>
            <Field id="startTime" label={t("Quote.startTime")}>
              <input
                id="startTime"
                type="time"
                step={900}
                className={fieldClass}
                {...register("startTime")}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-6">
          <legend className={sectionTitle}>{t("Quote.sectionCoverage")}</legend>
          <div className="grid gap-6 sm:grid-cols-3">
            <Field id="durationHours" label={t("Quote.durationHours")}>
              <input
                id="durationHours"
                type="number"
                inputMode="decimal"
                min={0.5}
                max={24}
                step={0.5}
                className={fieldClass}
                {...register("durationHours")}
              />
            </Field>
            <Field id="photographers" label={t("Quote.photographers")}>
              <input
                id="photographers"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                className={fieldClass}
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
