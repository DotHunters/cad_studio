"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { ServiceOption } from "@/lib/services";
import { cn } from "@/lib/utils";
import { type ContactInput, contactSchema, otherEnquiryTypes } from "@/lib/validators/contact";
import { submitContact } from "@/server/actions/contact";
import { useTurnstile } from "@/components/site/turnstile";

const ERROR_KEYS = [
  "required",
  "invalidEmail",
  "invalidPhone",
  "messageTooShort",
  "tooLong",
  "spam",
] as const;

function isErrorKey(key: string): key is (typeof ERROR_KEYS)[number] {
  return (ERROR_KEYS as readonly string[]).includes(key);
}

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none aria-invalid:border-destructive";

export function ContactForm({ services }: { services: ServiceOption[] }) {
  const t = useTranslations("Contact");
  const tCommon = useTranslations("Common");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const turnstile = useTurnstile("contact");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", email: "", phone: "", message: "", website: "" },
    shouldFocusError: true,
  });

  const onSubmit = (values: ContactInput) =>
    startTransition(async () => {
      const result = await submitContact(values, turnstile.token);
      turnstile.reset();
      if (result.ok) {
        setSent(true);
        reset();
        return;
      }
      if (result.error === "validation") {
        const fields = Object.entries(result.fieldErrors) as Array<[keyof ContactInput, string]>;
        for (const [field, message] of fields) setError(field, { message });
        if (fields[0]) setFocus(fields[0][0]);
        return;
      }
      toast.error(
        result.error === "captcha"
          ? t("captchaError")
          : result.error === "rateLimited"
            ? tCommon("tooManyRequests")
            : t("serverError"),
      );
    });

  if (sent) {
    return (
      <div role="status" className="bg-card rounded-xl border p-8 text-center">
        <CheckCircle2 className="text-gold-text mx-auto size-10" aria-hidden />
        <h2 className="mt-4 text-3xl">{t("successTitle")}</h2>
        <p className="text-muted-foreground mt-2">{t("successBody")}</p>
        <Button variant="outline" size="cta" className="mt-6" onClick={() => setSent(false)}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  // Maps a field's error key to translated text, wired to the input via aria-describedby.
  const errorFor = (field: keyof ContactInput) => {
    const key = errors[field]?.message;
    if (!key) return null;
    return (
      <p id={`${field}-error`} className="text-destructive mt-1.5 text-sm">
        {isErrorKey(key) ? t(`errors.${key}`) : key}
      </p>
    );
  };
  const a11y = (field: keyof ContactInput) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            {t("name")}
          </label>
          <input
            id="name"
            autoComplete="name"
            className={fieldClass}
            {...a11y("name")}
            {...register("name")}
          />
          {errorFor("name")}
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            {...a11y("email")}
            {...register("email")}
          />
          {errorFor("email")}
        </div>
        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            {t("phone")}
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            {...a11y("phone")}
            {...register("phone")}
          />
          {errorFor("phone")}
        </div>
        <div>
          <label htmlFor="enquiryType" className="text-sm font-medium">
            {t("enquiryType")}
          </label>
          <select
            id="enquiryType"
            defaultValue=""
            className={cn(fieldClass, "appearance-auto")}
            {...a11y("enquiryType")}
            {...register("enquiryType")}
          >
            <option value="" disabled>
              {t("selectType")}
            </option>
            {services.map((service) => (
              <option key={service.slug} value={service.slug}>
                {service.name}
              </option>
            ))}
            {otherEnquiryTypes.map((type) => (
              <option key={type} value={type}>
                {t(`types.${type}`)}
              </option>
            ))}
          </select>
          {errorFor("enquiryType")}
        </div>
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          {t("message")}
        </label>
        <textarea
          id="message"
          rows={6}
          className={fieldClass}
          {...a11y("message")}
          {...register("message")}
        />
        {errorFor("message")}
      </div>

      {/* Honeypot: off-screen and skipped by assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">{t("honeypot")}</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
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
