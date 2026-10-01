import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Accent, SectionHeading } from "@/components/site/section-heading";
import { formatInStudioTz } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { parseReference } from "@/lib/references";
import { verifySignedValue } from "@/lib/signing";
import { linkSecret } from "@/server/link-secret";
import { getBookingByReference } from "@/server/queries/quotes";

type Props = {
  params: Promise<{ locale: Locale; reference: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BookingConfirmed" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

const STATUS_KEY = {
  PENDING: "statusPending",
  CONFIRMED: "statusConfirmed",
  CANCELLED: "statusCancelled",
  COMPLETED: "statusCompleted",
} as const;

/** Private booking page (signed link, like quotes): reference, status, deposit, next steps. */
export default async function BookingConfirmedPage({ params, searchParams }: Props) {
  const { locale, reference } = await params;
  setRequestLocale(locale);
  const token = (await searchParams).t;
  const signature = typeof token === "string" ? token : undefined;
  if (
    parseReference(reference)?.type !== "B" ||
    !verifySignedValue(`booking:${reference}`, signature, linkSecret())
  ) {
    notFound();
  }
  const [booking, t] = await Promise.all([
    getBookingByReference(reference),
    getTranslations("BookingConfirmed"),
  ]);
  if (!booking) notFound();

  const when = `${formatInStudioTz(booking.startAt, "PPPP", locale)} · ${formatInStudioTz(booking.startAt, "p", locale)}–${formatInStudioTz(booking.endAt, "p", locale)}`;
  const tBook = await getTranslations("Book");
  const facts = [
    { label: t("status"), value: t(STATUS_KEY[booking.status]) },
    { label: t("when"), value: when },
    {
      label: t("package"),
      value: booking.package ? localize(booking.package.name, booking.package.nameFr, locale) : "—",
    },
    ...(booking.totalCents !== null
      ? [{ label: t("total"), value: formatCAD(booking.totalCents, locale) }]
      : []),
    ...(booking.depositCents !== null
      ? [{ label: t("deposit"), value: formatCAD(booking.depositCents, locale) }]
      : []),
    {
      label: t("payment"),
      value: booking.paymentMethod === "CASH" ? tBook("payCash") : tBook("payBank"),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <CheckCircle2 className="text-gold-text size-10" aria-hidden />
      <SectionHeading
        as="h1"
        className="mt-6"
        eyebrow={t("eyebrow", { reference })}
        title={t.rich("title", { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> })}
        intro={t("intro", { name: booking.customer.name.split(/\s+/)[0] })}
      />

      <dl className="divide-border mt-10 divide-y rounded-xl border">
        {facts.map((fact) => (
          <div key={fact.label} className="flex justify-between gap-4 px-5 py-3">
            <dt className="text-muted-foreground">{fact.label}</dt>
            <dd className="text-right lining-nums">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {booking.status === "PENDING" && (
        <section aria-labelledby="next-title" className="mt-10">
          <h2 id="next-title" className="text-3xl">
            {t("nextTitle")}
          </h2>
          <ol className="text-muted-foreground mt-4 list-decimal space-y-2 pl-6">
            <li>{booking.paymentMethod === "CASH" ? t("nextCash") : t("nextBank")}</li>
            <li>{t("nextConfirm")}</li>
          </ol>
          <p className="text-muted-foreground mt-6 text-sm">{t("emailCopy")}</p>
        </section>
      )}
    </div>
  );
}
