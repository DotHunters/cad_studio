import { describe, expect, it } from "vitest";

import { localize } from "@/lib/localize";

describe("localize", () => {
  it("uses English for en", () => {
    expect(localize("Wedding", "Mariage", "en")).toBe("Wedding");
  });

  it("uses French for fr when available", () => {
    expect(localize("Wedding", "Mariage", "fr")).toBe("Mariage");
  });

  it("falls back to English when the French field is empty", () => {
    expect(localize("Wedding", null, "fr")).toBe("Wedding");
    expect(localize("Wedding", undefined, "fr")).toBe("Wedding");
    expect(localize("Wedding", "", "fr")).toBe("Wedding");
  });

  it("works for arrays", () => {
    expect(localize(["a"], ["b"], "fr")).toEqual(["b"]);
  });
});
