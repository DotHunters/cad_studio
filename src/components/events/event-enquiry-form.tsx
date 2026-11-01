"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useTurnstile } from "@/components/site/turnstile";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  EVENT_BUDGETS,
  EVENT_ENQUIRY_SERVICES,
  EVENT_TYPES,
  type EventEnquiryData,
  type EventEnquiryInput,
  eventEnquirySchema,
} from "@/lib/validators/event-enquiry";
import { submitEventEnquiry } from "@/server/actions/event-enquiry";

const ERROR_KEYS = [
  "required",
  "invalidEmail",
  "invalidPhone",
  "invalidDate",
  "pastDate",
  "invalidGuests",
  "chooseService",
  "messageTooShort",
  "tooLong",
  "spam",
] as const;

function isErrorKey(key: string): key is (typeof ERROR_KEYS)[number] {
  return (ERROR_KEYS as readonly string[]).includes(key);
}

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none aria-invalid:border-destructive";

const defaultValues: EventEnquiryInput = {
  name: "",
  email: "",
  phone: "",
  eventType: "" as EventEnquiryInput["eventType"],
  eventDate: "",
  guestCount: "",
  city: "",
  services: [],
  budget: "",
  message: "",
  website: "",
};

export function EventEnquiryForm() {
  const t = useTranslations("Events.form");
  const tCommon = useTranslations("Common");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const turnstile = useTurnstile("event_enquiry");

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<EventEnquiryInput, unknown, EventEnquiryData>({
    resolver: zodResolver(eventEnquirySchema),
    defaultValues,
    shouldFocusError: true,
  });

  const onSubmit = () =>
    startTransition(async () => {
      const result = await submitEventEnquiry(getValues(), turnstile.token);
      turnstile.reset();
      if (result.ok) {
        setSent(true);
        reset(defaultValues);
        return;
      }
      if (result.error === "validation") {
        const fields = Object.entries(result.fieldErrors) as Array<
          [keyof EventEnquiryInput, string]
        >;
        for (const [field, message] of fields) setError(field, { message });
        if (fields[0]) setFocus(fields[0][0]);
        return;
      }
      toast.error(
        result.error === "captcha"
          ? t("captchaError")
          : result.error === "rateLimited"
            ? tCommon("tooManyRequests")
            : t("serverError", { email: siteConfig.contact.email }),
      );
    });

  if (sent) {
    return (
      <div role="status" className="bg-card rounded-xl border p-8 text-center">
        <CheckCircle2 className="text-gold-text mx-auto size-10" aria-hidden />
        <h3 className="mt-4 text-3xl">{t("successTitle")}</h3>
        <p className="text-muted-foreground mt-2">{t("successBody")}</p>
        <Button variant="outline" size="cta" className="mt-6" onClick={() => setSent(false)}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  const errorFor = (field: keyof EventEnquiryInput) => {
    const key = errors[field]?.message;
    if (!key) return null;
    return (
      <p id={`event-${field}-error`} className="text-destructive mt-1.5 text-sm">
        {isErrorKey(key) ? t(`errors.${key}`) : key}
      </p>
    );
  };
  const a11y = (field: keyof EventEnquiryInput) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `event-${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="event-name" className="text-sm font-medium">
            {t("name")}
          </label>
          <input
            id="event-name"
            autoComplete="name"
            className={fieldClass}
            {...a11y("name")}
            {...register("name")}
          />
          {errorFor("name")}
        </div>
        <div>
          <label htmlFor="event-email" className="text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="event-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            {...a11y("email")}
            {...register("email")}
          />
          {errorFor("email")}
        </div>
        <div>
          <label htmlFor="event-phone" className="text-sm font-medium">
            {t("phone")}
          </label>
          <input
            id="event-phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            {...a11y("phone")}
            {...register("phone")}
          />
          {errorFor("phone")}
        </div>
        <div>
          <label htmlFor="event-eventType" className="text-sm font-medium">
            {t("eventType")}
          </label>
          <select
            id="event-eventType"
            className={cn(fieldClass, "appearance-auto")}
            {...a11y("eventType")}
            {...register("eventType")}
          >
            <option value="" disabled>
              {t("selectType")}
            </option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`eventTypes.${type}`)}
              </option>
            ))}
          </select>
          {errorFor("eventType")}
        </div>
        <div>
          <label htmlFor="event-eventDate" className="text-sm font-medium">
            {t("eventDate")}
          </label>
          <input
            id="event-eventDate"
            type="date"
            className={fieldClass}
            {...a11y("eventDate")}
            {...register("eventDate")}
          />
          {errorFor("eventDate")}
        </div>
        <div>
          <label htmlFor="event-guestCount" className="text-sm font-medium">
            {t("guestCount")}
          </label>
          <input
            id="event-guestCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            className={fieldClass}
            {...a11y("guestCount")}
            {...register("guestCount")}
          />
          {errorFor("guestCount")}
        </div>
        <div>
          <label htmlFor="event-city" className="text-sm font-medium">
            {t("city")}
          </label>
          <input
            id="event-city"
            autoComplete="address-level2"
            className={fieldClass}
            {...a11y("city")}
            {...register("city")}
          />
          {errorFor("city")}
        </div>
        <div>
          <label htmlFor="event-budget" className="text-sm font-medium">
            {t("budget")}
          </label>
          <select
            id="event-budget"
            className={cn(fieldClass, "appearance-auto")}
            {...a11y("budget")}
            {...register("budget")}
          >
            <option value="">{t("budgetNone")}</option>
            {EVENT_BUDGETS.map((budget) => (
              <option key={budget} value={budget}>
                {t(`budgets.${budget}`)}
              </option>
            ))}
          </select>
          {errorFor("budget")}
        </div>
      </div>

      <fieldset aria-describedby={errors.services ? "event-services-error" : undefined}>
        <legend className="text-sm font-medium">{t("services")}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {EVENT_ENQUIRY_SERVICES.map((service) => (
            <label
              key={service}
              className="has-[:checked]:border-gold flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3"
            >
              <input
                type="checkbox"
                value={service}
                className="accent-gold size-4"
                aria-invalid={errors.services ? true : undefined}
                aria-describedby={errors.services ? "event-services-error" : undefined}
                {...register("services")}
              />
              {t(`serviceOptions.${service}`)}
            </label>
          ))}
        </div>
        {errorFor("services")}
      </fieldset>

      <div>
        <label htmlFor="event-message" className="text-sm font-medium">
          {t("message")}
        </label>
        <textarea
          id="event-message"
          rows={6}
          className={fieldClass}
          {...a11y("message")}
          {...register("message")}
        />
        {errorFor("message")}
      </div>

      {/* Honeypot: off-screen and skipped by assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="event-website">{t("honeypot")}</label>
        <input id="event-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      {turnstile.element}

      <p className="text-muted-foreground text-sm">
        {t.rich("privacyNotice", {
          privacy: (chunks) => (
            <Link href="/privacy" className="text-gold-text underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Button type="submit" size="cta" disabled={pending} className="w-full sm:w-auto">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
