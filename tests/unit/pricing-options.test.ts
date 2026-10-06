import { describe, expect, it } from "vitest";

import {
  findOption,
  optionSlug,
  pricedOptions,
  savedOptionName,
  startingPriceCents,
  tierKeyFor,
} from "@/lib/pricing/options";

const base = {
  category: "wedding",
  basePriceCents: 280000,
  includedHours: 8,
  includedShooters: 2,
};

describe("pricedOptions", () => {
  it("keeps a package without tiers as one option", () => {
    expect(
      pricedOptions([{ ...base, slug: "wedding", name: "Wedding", nameFr: "Mariage", tiers: [] }]),
    ).toEqual([
      {
        slug: "wedding",
        packageSlug: "wedding",
        tierKey: null,
        category: "wedding",
        name: "Wedding",
        nameFr: "Mariage",
        basePriceCents: 280000,
        includedHours: 8,
        includedShooters: 2,
      },
    ]);
  });

  it("turns each tier into an option with its own price and coverage", () => {
    const options = pricedOptions([
      {
        ...base,
        slug: "wedding",
        name: "Wedding",
        nameFr: "Mariage",
        tiers: [
          {
            key: "silver",
            name: "Silver",
            nameFr: "Argent",
            basePriceCents: 200000,
            includedHours: 6,
            includedShooters: 1,
          },
          {
            key: "gold",
            name: "Gold",
            nameFr: null,
            basePriceCents: 300000,
            includedHours: 10,
            includedShooters: 2,
          },
        ],
      },
    ]);
    expect(options.map((option) => [option.slug, option.name, option.nameFr])).toEqual([
      ["wedding:silver", "Wedding — Silver", "Mariage — Argent"],
      ["wedding:gold", "Wedding — Gold", "Mariage — Gold"],
    ]);
    expect(options[1]).toMatchObject({
      packageSlug: "wedding",
      tierKey: "gold",
      basePriceCents: 300000,
      includedHours: 10,
      includedShooters: 2,
    });
  });

  it("leaves the French name empty when neither part is translated", () => {
    const [option] = pricedOptions([
      {
        ...base,
        slug: "x",
        name: "X",
        nameFr: null,
        tiers: [
          {
            key: "a",
            name: "A",
            nameFr: null,
            basePriceCents: 1,
            includedHours: 1,
            includedShooters: 1,
          },
        ],
      },
    ]);
    expect(option.nameFr).toBeNull();
  });
});

describe("startingPriceCents", () => {
  it("is the cheapest tier, or the package price without tiers", () => {
    expect(startingPriceCents({ basePriceCents: 500, tiers: [] })).toBe(500);
    expect(
      startingPriceCents({
        basePriceCents: 500,
        tiers: [{ basePriceCents: 900 }, { basePriceCents: 700 }],
      }),
    ).toBe(700);
  });
});

describe("tier keys", () => {
  it("are URL-safe and unique within the package", () => {
    expect(tierKeyFor("Gold Plus", new Set())).toBe("gold-plus");
    expect(tierKeyFor("Élégance ✨", new Set())).toBe("elegance");
    expect(tierKeyFor("Gold", new Set(["gold", "gold-2"]))).toBe("gold-3");
    expect(tierKeyFor("!!!", new Set())).toBe("tier");
    expect(optionSlug("wedding", "gold")).toBe("wedding:gold");
    expect(optionSlug("wedding", null)).toBe("wedding");
  });
});

describe("findOption", () => {
  const options = [
    { slug: "wedding:silver", packageSlug: "wedding", basePriceCents: 200000 },
    { slug: "wedding:gold", packageSlug: "wedding", basePriceCents: 300000 },
    { slug: "family-event", packageSlug: "family-event", basePriceCents: 60000 },
  ];

  it("finds a tier from package + tier or a combined slug", () => {
    expect(findOption(options, "wedding", "gold")?.slug).toBe("wedding:gold");
    expect(findOption(options, "wedding:gold")?.slug).toBe("wedding:gold");
    expect(findOption(options, "family-event")?.slug).toBe("family-event");
  });

  it("picks the cheapest tier without a (known) tier, and null for unknown packages", () => {
    expect(findOption(options, "wedding")?.slug).toBe("wedding:silver");
    expect(findOption(options, "wedding", "diamond")?.slug).toBe("wedding:silver");
    expect(findOption(options, "nope")).toBeNull();
    expect(findOption(options, undefined)).toBeNull();
  });
});

describe("savedOptionName", () => {
  const pkg = { name: "Wedding", nameFr: "Mariage" };

  it("prefers the saved option name, in the client's language", () => {
    const breakdown = { packageName: "Wedding — Gold", packageNameFr: "Mariage — Or" };
    expect(savedOptionName(breakdown, pkg, "en")).toBe("Wedding — Gold");
    expect(savedOptionName(breakdown, pkg, "fr")).toBe("Mariage — Or");
    expect(savedOptionName({ packageName: "Wedding — Gold", packageNameFr: null }, pkg, "fr")).toBe(
      "Wedding — Gold",
    );
  });

  it("falls back to the package for older records, or null without one", () => {
    expect(savedOptionName({ lineItems: [] }, pkg, "fr")).toBe("Mariage");
    expect(savedOptionName(null, pkg, "en")).toBe("Wedding");
    expect(savedOptionName({}, null, "en")).toBeNull();
  });
});
