import type { Locale } from "@/config/site";

/** Picks the French companion field when viewing in French and it is filled; otherwise English. */
export function localize<T>(english: T, french: T | null | undefined, locale: Locale): T {
  if (locale === "fr" && french !== null && french !== undefined && french !== "") return french;
  return english;
}
