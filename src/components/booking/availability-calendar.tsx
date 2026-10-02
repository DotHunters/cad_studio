"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { enCA, frCA } from "react-day-picker/locale";
import "react-day-picker/style.css";

import type { Locale } from "@/config/site";

type Status = "available" | "limited" | "full";

type Props = {
  value: string | null;
  onChange: (dateKey: string) => void;
  locale: Locale;
  /** Studio-local today, "YYYY-MM-DD". */
  today: string;
  /** How many months ahead clients may browse. */
  monthsAhead: number;
  describedBy?: string;
};

const keyOf = (date: Date) => format(date, "yyyy-MM-dd");
const monthKey = (date: Date) => format(date, "yyyy-MM");
const fromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Month calendar backed by /api/availability (AGENTS.md §6.6). Full days are disabled and
 * limited days are marked; while a month is loading every day is disabled so nobody can pick
 * an unverified date.
 */
export function AvailabilityCalendar({
  value,
  onChange,
  locale,
  today,
  monthsAhead,
  describedBy,
}: Props) {
  const t = useTranslations("Book");
  const start = fromKey(today);
  const [month, setMonth] = useState<Date>(value ? fromKey(value) : start);
  const [statuses, setStatuses] = useState<Record<string, Record<string, Status>>>({});
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const current = monthKey(month);

  useEffect(() => {
    if (statuses[current]) {
      setState("ready");
      return;
    }
    let cancelled = false;
    setState("loading");
    fetch(`/api/availability?month=${current}`)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: { days: Array<{ date: string; status: Status }> }) => {
        if (cancelled) return;
        setStatuses((previous) => ({
          ...previous,
          [current]: Object.fromEntries(body.days.map((day) => [day.date, day.status])),
        }));
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [current, statuses]);

  const status = (date: Date): Status | undefined => statuses[monthKey(date)]?.[keyOf(date)];

  return (
    <div className="space-y-3">
      <DayPicker
        mode="single"
        locale={locale === "fr" ? frCA : enCA}
        month={month}
        onMonthChange={setMonth}
        startMonth={start}
        endMonth={new Date(start.getFullYear(), start.getMonth() + monthsAhead, 1)}
        selected={value ? fromKey(value) : undefined}
        onSelect={(date) => date && onChange(keyOf(date))}
        disabled={(date) => {
          const known = status(date);
          return known === undefined || known === "full";
        }}
        modifiers={{ limited: (date) => status(date) === "limited" }}
        modifiersClassNames={{ limited: "rdp-limited" }}
        aria-describedby={describedBy}
        className="cad-calendar bg-card rounded-xl border p-4 [&_.rdp-limited_button]:underline [&_.rdp-limited_button]:decoration-dotted [&_.rdp-limited_button]:underline-offset-4"
      />
      <p aria-live="polite" className="text-muted-foreground text-xs">
        {state === "loading" && t("loadingAvailability")}
        {state === "error" && <span className="text-destructive">{t("availabilityError")}</span>}
      </p>
      <ul className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        <li>{t("legendAvailable")}</li>
        <li className="underline decoration-dotted underline-offset-4">{t("legendLimited")}</li>
        <li className="line-through">{t("legendFull")}</li>
      </ul>
    </div>
  );
}
