"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestBookingChange } from "@/server/actions/change-request";

type Props = { reference: string; token: string; today: string };

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none";

const ERROR_KEYS = ["required", "invalidDate", "tooLong"] as const;
const isErrorKey = (key: string): key is (typeof ERROR_KEYS)[number] =>
  (ERROR_KEYS as readonly string[]).includes(key);

/** Reschedule / cancel request on the signed booking page (AGENTS.md §6.6). */
export function ChangeRequestForm({ reference, token, today }: Props) {
  const t = useTranslations("ChangeRequest");
  const tCommon = useTranslations("Common");
  const [type, setType] = useState<"RESCHEDULE" | "CANCEL">("RESCHEDULE");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<
    "idle" | "sent" | "closed" | "forbidden" | "rateLimited" | "error"
  >("idle");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const errorFor = (field: string) => {
    const key = fieldErrors[field];
    return key ? (isErrorKey(key) ? t(`errors.${key}`) : key) : null;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    try {
      const result = await requestBookingChange({ reference, token, type, preferredDate, message });
      if (result.ok) setState("sent");
      else if (result.error === "validation") setFieldErrors(result.fieldErrors);
      else setState(result.error === "server" ? "error" : result.error);
    } finally {
      setPending(false);
    }
  };

  if (state === "sent") {
    return (
      <div role="status" className="bg-card rounded-xl border p-6">
        <CheckCircle2 className="text-gold-text size-6" aria-hidden />
        <p className="mt-2 font-medium">{t("successTitle")}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t("successBody")}</p>
      </div>
    );
  }
  if (state === "closed" || state === "forbidden") {
    return (
      <p role="alert" className="text-muted-foreground rounded-xl border p-6 text-sm">
        {t(state)}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="bg-card space-y-5 rounded-xl border p-6">
      <fieldset>
        <legend className="text-sm font-medium">{t("type")}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["RESCHEDULE", "CANCEL"] as const).map((option) => (
            <label
              key={option}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                type === option && "border-gold bg-gold-light/10",
              )}
            >
              <input
                type="radio"
                name="change-type"
                value={option}
                checked={type === option}
                onChange={() => setType(option)}
                className="accent-gold"
              />
              {option === "RESCHEDULE" ? t("reschedule") : t("cancel")}
            </label>
          ))}
        </div>
      </fieldset>

      {type === "RESCHEDULE" && (
        <div>
          <label htmlFor="preferredDate" className="text-sm font-medium">
            {t("preferredDate")}
          </label>
          <input
            id="preferredDate"
            type="date"
            min={today}
            value={preferredDate}
            onChange={(event) => setPreferredDate(event.target.value)}
            aria-invalid={errorFor("preferredDate") ? true : undefined}
            aria-describedby={errorFor("preferredDate") ? "preferredDate-error" : undefined}
            className={fieldClass}
          />
          {errorFor("preferredDate") && (
            <p id="preferredDate-error" className="text-destructive mt-1.5 text-sm">
              {errorFor("preferredDate")}
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="change-message" className="text-sm font-medium">
          {t("message")}
        </label>
        <textarea
          id="change-message"
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={errorFor("message") ? true : undefined}
          className={fieldClass}
        />
        {errorFor("message") && (
          <p className="text-destructive mt-1.5 text-sm">{errorFor("message")}</p>
        )}
      </div>

      {(state === "error" || state === "rateLimited") && (
        <p role="alert" className="text-destructive text-sm">
          {state === "rateLimited" ? tCommon("tooManyRequests") : t("serverError")}
        </p>
      )}

      <Button type="submit" variant="outline" size="cta" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
