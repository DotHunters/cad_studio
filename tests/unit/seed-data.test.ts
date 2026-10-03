import { describe, expect, it } from "vitest";

import {
  addOns,
  packages,
  pricingRules,
  sampleProjects,
  sampleReviews,
  siteSettings,
  taxRates,
} from "../../prisma/seed-data";

const CATEGORIES = ["CORPORATE", "WEDDING", "FAMILY", "GATHERING", "PROFESSIONAL", "PRODUCT"];
const PROVINCES = ["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT"];

describe("seed packages", () => {
  it("has one package per category", () => {
    expect(packages.map((p) => p.category).sort()).toEqual([...CATEGORIES].sort());
  });

  it("stores money as integer cents", () => {
    for (const p of packages) expect(Number.isInteger(p.basePriceCents)).toBe(true);
    for (const a of addOns) expect(Number.isInteger(a.priceCents)).toBe(true);
  });

  it("matches the AGENTS.md §8.1 starting prices", () => {
    const bySlug = Object.fromEntries(packages.map((p) => [p.slug, p.basePriceCents]));
    expect(bySlug).toMatchObject({
      "corporate-event": 120000,
      wedding: 280000,
      "family-event": 60000,
      gathering: 75000,
      "professional-photoshoot": 35000,
      "product-photography": 40000,
    });
  });

  it("has French text for every package field", () => {
    for (const p of packages) {
      expect(p.nameFr && p.summaryFr && p.descriptionFr).toBeTruthy();
      expect(p.inclusionsFr).toHaveLength(p.inclusions.length);
      expect(p.exclusionsFr).toHaveLength(p.exclusions.length);
    }
  });

  it("has French names for every add-on", () => {
    for (const addOn of addOns) expect(addOn.nameFr?.trim(), addOn.code).toBeTruthy();
  });

  it("has French titles and stories for every sample project", () => {
    for (const project of sampleProjects) {
      expect(project.titleFr.trim(), project.slug).toBeTruthy();
      expect(project.storyFr.trim(), project.slug).toBeTruthy();
      expect(project.storyFr, project.slug).not.toBe(project.story);
    }
  });

  it("has unique slugs and add-on codes", () => {
    expect(new Set(packages.map((p) => p.slug)).size).toBe(packages.length);
    expect(new Set(addOns.map((a) => a.code)).size).toBe(addOns.length);
  });
});

describe("seed pricing rules", () => {
  it("uses owner-confirmed travel and capacity values", () => {
    expect(pricingRules.FREE_TRAVEL_KM).toBe(40);
    expect(pricingRules.TRAVEL_PER_KM).toBe(70);
    expect(pricingRules.MAX_PHOTOGRAPHERS_PER_DAY).toBe(3);
  });

  it("stores every rule as an integer", () => {
    for (const value of Object.values(pricingRules)) expect(Number.isInteger(value)).toBe(true);
  });
});

describe("seed tax rates", () => {
  it("covers every province and territory plus INTL", () => {
    expect(taxRates.map((t) => t.province).sort()).toEqual([...PROVINCES, "INTL"].sort());
  });

  it("uses known combined rates", () => {
    const total = (p: string) => {
      const t = taxRates.find((r) => r.province === p)!;
      return Number(t.gst) + Number(t.pst) + Number(t.hst);
    };
    expect(total("ON")).toBeCloseTo(0.13);
    expect(total("QC")).toBeCloseTo(0.14975);
    expect(total("NS")).toBeCloseTo(0.14);
    expect(total("PE")).toBeCloseTo(0.15);
    expect(total("AB")).toBeCloseTo(0.05);
    expect(total("INTL")).toBe(0);
  });
});

describe("seed site settings", () => {
  it("provides English and French for each setting", () => {
    for (const value of Object.values(siteSettings)) {
      expect(value.en).toBeTruthy();
      expect(value.fr).toBeTruthy();
    }
  });
});

describe("sample content (AGENTS.md §13)", () => {
  it("marks every sample client as fictional", () => {
    for (const p of sampleProjects) {
      expect(p.clientName).toMatch(/\(Sample\)$/);
      expect(p.story).toMatch(/^\[SAMPLE\]/);
    }
  });

  it("marks every sample review body", () => {
    for (const r of sampleReviews) expect(r.body).toMatch(/^\[SAMPLE\]/);
  });

  it("gives customer reviews a 1–5 rating", () => {
    for (const r of sampleReviews.filter((r) => r.type === "CUSTOMER")) {
      expect(r.rating).toBeGreaterThanOrEqual(1);
      expect(r.rating).toBeLessThanOrEqual(5);
    }
  });
});
