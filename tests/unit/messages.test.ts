import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function valueAt(messages: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages);
}

function leaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.values(value).flatMap(leaves);
}

describe("UI messages", () => {
  it("French has exactly the same keys as English", () => {
    expect(keyPaths(fr).sort()).toEqual(keyPaths(en).sort());
  });

  it("has no empty strings", () => {
    for (const text of [...leaves(en), ...leaves(fr)]) expect(text.trim()).not.toBe("");
  });

  it("never uses the old brand name", () => {
    for (const text of [...leaves(en), ...leaves(fr)]) {
      expect(text).not.toMatch(/CAD Studios?|Cad Studios/);
    }
  });

  it("has no ASCII apostrophe before a tag or placeholder (ICU would quote it)", () => {
    // In ICU MessageFormat, ' before < or { starts a literal, so "l'<accent>" renders the
    // tag as text. Use the typographic apostrophe (’) instead.
    for (const text of [...leaves(en), ...leaves(fr)]) expect(text).not.toMatch(/'[<{]/);
  });

  it("uses the typographic apostrophe in French", () => {
    for (const text of leaves(fr)) expect(text).not.toContain("'");
  });

  it("translates every French string except names, cognates and pure formats", () => {
    // Same in both languages on purpose (task 8.6). Anything else identical to English is
    // probably untranslated.
    const sameInFrench = new Set([
      "Home.heading",
      "Home.tagline",
      "Home.trustLocation",
      "Home.reachLocal",
      "Nav.portfolio",
      "Nav.contact",
      "About.factYearsValue",
      "About.factBaseValue",
      "Contact.metaTitle",
      "Contact.message",
      "Portfolio.metaTitle",
      "Portfolio.eyebrow",
      "Portfolio.local",
      "Project.client",
      "Project.imageCount",
      "Gallery.category",
      "Lightbox.position",
      "Quote.lines.addOn",
      "Quote.lines.addOnQty",
      "Provinces.ON",
      "Provinces.AB",
      "Provinces.MB",
      "Provinces.SK",
      "Provinces.NU",
      "Provinces.YT",
      "Email.icsSummary",
      "QuoteResult.date",
      "QuoteResult.hours",
      "Book.steps.service",
      "Book.reviewWho",
      "BookingConfirmed.total",
      "Reviews.category",
      "Reviews.eventOn",
    ]);
    const english = new Map(keyPaths(en).map((path) => [path, valueAt(en, path)]));
    const untranslated = keyPaths(fr).filter(
      (path) => !sameInFrench.has(path) && valueAt(fr, path) === english.get(path),
    );
    expect(untranslated).toEqual([]);
  });

  it("formats decimal values (ratings, hours, km) for the locale", () => {
    // A bare {rating} prints "4.7" in French; {rating, number} prints "4,7".
    for (const text of [...leaves(en), ...leaves(fr)]) {
      expect(text).not.toMatch(/\{(rating|hours|km)\}/);
    }
  });
});
