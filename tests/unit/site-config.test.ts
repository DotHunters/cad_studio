import { describe, expect, it } from "vitest";

import { resolveTimezone, siteConfig } from "@/config/site";

describe("resolveTimezone", () => {
  it("defaults to America/Toronto when unset", () => {
    expect(resolveTimezone(undefined)).toBe("America/Toronto");
  });

  it("accepts a valid IANA zone", () => {
    expect(resolveTimezone("America/Vancouver")).toBe("America/Vancouver");
  });

  it("falls back to the default for an invalid zone", () => {
    expect(resolveTimezone("Mars/Olympus")).toBe("America/Toronto");
  });
});

describe("siteConfig", () => {
  it("uses the owner-confirmed brand name", () => {
    expect(siteConfig.name).toBe("CAD Studio Photography");
  });

  it("supports English and French", () => {
    expect(siteConfig.locales).toEqual(["en", "fr"]);
  });
});
