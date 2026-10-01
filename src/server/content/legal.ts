import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Locale } from "@/config/site";

export type LegalDocument = "privacy" | "terms";

/** Bump when the wording changes; shown as "Last updated" on the page. */
export const LEGAL_LAST_UPDATED: Record<LegalDocument, string> = {
  privacy: "2026-10-01",
  terms: "2026-10-01",
};

/** Markdown source in content/legal/<doc>.<locale>.md — editable without touching code. */
export async function loadLegalDocument(doc: LegalDocument, locale: Locale): Promise<string> {
  const file = path.join(process.cwd(), "content", "legal", `${doc}.${locale}.md`);
  return readFile(file, "utf8");
}
