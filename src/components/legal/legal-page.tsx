import { TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import ReactMarkdown, { type Components } from "react-markdown";

import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { formatInStudioTz } from "@/lib/dates";
import { shouldShowLegalDraftNotice } from "@/lib/flags";
import { LEGAL_LAST_UPDATED, type LegalDocument, loadLegalDocument } from "@/server/content/legal";

// Internal links ("/contact") get the locale prefix; external links open normally.
const components: Components = {
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className="text-gold-text underline underline-offset-4">
        {children}
      </Link>
    ) : (
      <a href={href} className="text-gold-text underline underline-offset-4">
        {children}
      </a>
    ),
  h2: ({ children }) => <h2 className="mt-12 text-3xl">{children}</h2>,
  p: ({ children }) => <p className="text-muted-foreground mt-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-6">{children}</ul>
  ),
  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
};

type Props = { doc: LegalDocument; locale: Locale };

/** Renders a legal Markdown document. Raw HTML (incl. TODO comments) is never rendered. */
export async function LegalPage({ doc, locale }: Props) {
  const [t, source] = await Promise.all([
    getTranslations({ locale, namespace: "Legal" }),
    loadLegalDocument(doc, locale),
  ]);
  const updated = formatInStudioTz(`${LEGAL_LAST_UPDATED[doc]}T12:00:00Z`, "PPP", locale);

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-muted-foreground text-xs font-medium tracking-[0.25em] uppercase">
        {t("eyebrow")}
      </p>
      <span aria-hidden className="bg-gold-gradient mt-3 block h-px w-12" />
      <h1 className="mt-4 text-5xl">{t(doc === "privacy" ? "privacyTitle" : "termsTitle")}</h1>
      <p className="text-muted-foreground mt-3 text-sm">{t("lastUpdated", { date: updated })}</p>

      {shouldShowLegalDraftNotice() && (
        <p
          role="note"
          className="border-gold/50 bg-gold-light/20 mt-8 flex gap-3 rounded-lg border p-4 text-sm"
        >
          <TriangleAlert className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
          {t("draftNotice")}
        </p>
      )}

      <div className="mt-8">
        <ReactMarkdown components={components} skipHtml>
          {source}
        </ReactMarkdown>
      </div>
    </article>
  );
}
