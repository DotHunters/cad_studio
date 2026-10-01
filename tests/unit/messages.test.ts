import { describe, expect, it } from "vitest";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
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
});
