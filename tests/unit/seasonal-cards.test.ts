import { describe, expect, it } from "vitest";

import { seasonalCards } from "@/lib/seasonal/cards";

const tier = (key: string, name: string, basePriceCents: number) => ({
  key,
  name,
  nameFr: null as string | null,
  basePriceCents,
  inclusions: [`${name} inclusion`],
  inclusionsFr: [] as string[],
});

const single = {
  slug: "mini",
  name: "Mini Session",
  nameFr: "Mini séance" as string | null,
  summary: "A short session.",
  summaryFr: null as string | null,
  basePriceCents: 25_000,
  regularPriceCents: 35_000 as number | null,
  editedImages: 15 as number | null,
  inclusions: ["Online gallery"],
  inclusionsFr: ["Galerie en ligne"],
  offerEndsAt: null as Date | string | null,
  tiers: [] as ReturnType<typeof tier>[],
};

const withOptions = {
  ...single,
  slug: "christmas",
  name: "Christmas",
  nameFr: "Noël",
  offerEndsAt: "2027-01-01T04:59:59.999Z",
  tiers: [
    tier("mini", "Mini Session", 25_000),
    tier("classic", "Classic Session", 40_000),
    tier("premium", "Premium Session", 65_000),
    tier("event", "Event Coverage", 75_000),
  ],
};

describe("seasonalCards", () => {
  it("makes one card for a package without options, with its offer price details", () => {
    expect(seasonalCards([single], "en")).toEqual([
      {
        id: "mini",
        packageSlug: "mini",
        tierKey: null,
        name: "Mini Session",
        summary: "A short session.",
        priceCents: 25_000,
        regularPriceCents: 35_000,
        editedImages: 15,
        inclusions: [],
        offerEndsAt: null,
      },
    ]);
  });

  it("lists the package's inclusions only when asked", () => {
    expect(seasonalCards([single], "en", { withInclusions: true })[0].inclusions).toEqual([
      "Online gallery",
    ]);
  });

  it("makes one card for every option, in order, each with its own price and booking key", () => {
    const cards = seasonalCards([withOptions], "en");
    expect(cards.map((card) => [card.name, card.priceCents, card.tierKey])).toEqual([
      ["Mini Session", 25_000, "mini"],
      ["Classic Session", 40_000, "classic"],
      ["Premium Session", 65_000, "premium"],
      ["Event Coverage", 75_000, "event"],
    ]);
    for (const card of cards) {
      expect(card.packageSlug).toBe("christmas");
      expect(card.offerEndsAt).toBe("2027-01-01T04:59:59.999Z");
      // The package's own regular price and image count don't describe any one option.
      expect(card.regularPriceCents).toBeNull();
      expect(card.editedImages).toBeNull();
    }
    expect(new Set(cards.map((card) => card.id)).size).toBe(4);
  });

  it("shows an option's inclusions in place of the repeated package summary", () => {
    const [card] = seasonalCards([withOptions], "en");
    expect(card.inclusions).toEqual(["Mini Session inclusion"]);
    expect(card.summary).toBeNull();
  });

  it("falls back to the package summary for an option without inclusions", () => {
    const bare = { ...withOptions, tiers: [{ ...withOptions.tiers[0], inclusions: [] }] };
    const [card] = seasonalCards([bare], "en");
    expect(card.summary).toBe("A short session.");
  });

  it("prefixes the package name when several packages are listed", () => {
    expect(seasonalCards([single, withOptions], "en").map((card) => card.name)).toEqual([
      "Mini Session",
      "Christmas — Mini Session",
      "Christmas — Classic Session",
      "Christmas — Premium Session",
      "Christmas — Event Coverage",
    ]);
  });

  it("uses French text, falling back to English piece by piece", () => {
    const translated = {
      ...withOptions,
      tiers: [
        { ...withOptions.tiers[0], nameFr: "Mini séance", inclusionsFr: ["Inclusion mini"] },
        withOptions.tiers[1],
      ],
    };
    const cards = seasonalCards([translated], "fr");
    expect(cards.map((card) => card.name)).toEqual(["Mini séance", "Classic Session"]);
    expect(cards.map((card) => card.inclusions)).toEqual([
      ["Inclusion mini"],
      ["Classic Session inclusion"],
    ]);
  });
});
