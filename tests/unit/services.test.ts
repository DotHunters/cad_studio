import { describe, expect, it } from "vitest";

import {
  canArchiveService,
  canDeleteService,
  isServiceSlug,
  moveSlug,
  serviceNameMap,
  serviceOptions,
  type ServiceRow,
  slugFromName,
  usageTotal,
} from "@/lib/services";

const row = (slug: string, sortOrder: number, extra: Partial<ServiceRow> = {}): ServiceRow => ({
  slug,
  name: slug.toUpperCase(),
  nameFr: null,
  description: `${slug} description`,
  descriptionFr: null,
  sortOrder,
  active: true,
  tileImageId: null,
  ...extra,
});

describe("isServiceSlug", () => {
  it("accepts lowercase words joined by single dashes", () => {
    for (const slug of ["wedding", "baby-shower", "event-2026", "a"]) {
      expect(isServiceSlug(slug)).toBe(true);
    }
  });

  it("accepts a slug of exactly 40 characters", () => {
    expect(isServiceSlug("a".repeat(40))).toBe(true);
  });

  it("rejects anything else", () => {
    for (const value of [
      "",
      "Wedding",
      "-wedding",
      "wedding-",
      "baby--shower",
      "a b",
      "é",
      3,
      null,
    ]) {
      expect(isServiceSlug(value)).toBe(false);
    }
    expect(isServiceSlug("a".repeat(41))).toBe(false);
  });
});

describe("slugFromName", () => {
  it("lowercases, strips accents and joins words with dashes", () => {
    expect(slugFromName("Baby Showers")).toBe("baby-showers");
    expect(slugFromName("  Événements & Galas ")).toBe("evenements-galas");
    expect(slugFromName("Graduations 2026!")).toBe("graduations-2026");
    expect(slugFromName("Cœur & Straße")).toBe("coeur-strasse");
  });

  it("keeps the result within 40 characters without a trailing dash", () => {
    const slug = slugFromName("Very long service name that goes on and on forever");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
    expect(isServiceSlug(slug)).toBe(true);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugFromName("!!!")).toBe("");
  });
});

describe("serviceOptions", () => {
  const services = [
    row("wedding", 1, { name: "Weddings", nameFr: "Mariages" }),
    row("corporate", 0, { name: "Corporate" }),
    row("old", 2, { name: "Old", active: false }),
  ];

  it("lists active services in sort order with localized names", () => {
    expect(serviceOptions(services, "fr")).toEqual([
      { slug: "corporate", name: "Corporate" },
      { slug: "wedding", name: "Mariages" },
    ]);
  });

  it("can include archived services", () => {
    expect(serviceOptions(services, "en", { includeArchived: true }).map((s) => s.slug)).toEqual([
      "corporate",
      "wedding",
      "old",
    ]);
  });

  it("maps every slug (archived too) to its localized name", () => {
    const names = serviceNameMap(services, "fr");
    expect(names.get("wedding")).toBe("Mariages");
    expect(names.get("old")).toBe("Old");
  });
});

describe("usage guards", () => {
  const unused = {
    packages: 0,
    addOns: 0,
    quotes: 0,
    bookings: 0,
    projects: 0,
    images: 0,
    reviews: 0,
  };

  it("allows delete only when nothing uses the service", () => {
    expect(canDeleteService(unused)).toBe(true);
    expect(canDeleteService({ ...unused, reviews: 1 })).toBe(false);
    expect(usageTotal({ ...unused, quotes: 2, images: 3 })).toBe(5);
  });

  it("refuses to archive the last active service", () => {
    const services = [row("wedding", 0), row("old", 1, { active: false })];
    expect(canArchiveService(services, "wedding")).toBe(false);
    expect(canArchiveService([...services, row("family", 2)], "wedding")).toBe(true);
  });
});

describe("moveSlug", () => {
  const order = ["a", "b", "c"];

  it("swaps with the neighbour", () => {
    expect(moveSlug(order, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveSlug(order, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("leaves the order alone at the ends or for unknown slugs", () => {
    expect(moveSlug(order, "a", "up")).toEqual(order);
    expect(moveSlug(order, "c", "down")).toEqual(order);
    expect(moveSlug(order, "x", "up")).toEqual(order);
  });
});
