import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const read = (doc: string, locale: string) =>
  readFileSync(path.join(process.cwd(), "content", "legal", `${doc}.${locale}.md`), "utf8");

const headings = (source: string) => source.match(/^## .+$/gm) ?? [];

describe.each(["privacy", "terms"])("%s document", (doc) => {
  it("exists in English and French with the same number of sections", () => {
    expect(headings(read(doc, "en")).length).toBeGreaterThan(3);
    expect(headings(read(doc, "fr"))).toHaveLength(headings(read(doc, "en")).length);
  });

  it("keeps TODO markers inside HTML comments only", () => {
    for (const locale of ["en", "fr"]) {
      const visible = read(doc, locale).replace(/<!--[\s\S]*?-->/g, "");
      expect(visible).not.toMatch(/TODO/);
    }
  });
});

describe("privacy policy coverage (AGENTS.md §9)", () => {
  const privacy = read("privacy", "en");

  it.each([
    ["CASL opt-in and unsubscribe", /unsubscribe/i],
    ["Québec Law 25", /Law 25/],
    ["access and deletion rights", /deleted/],
    ["privacy requests via contact form", /Privacy request/],
    ["consent to publish photos", /consent to publish/],
  ])("mentions %s", (_, pattern) => {
    expect(privacy).toMatch(pattern);
  });
});
