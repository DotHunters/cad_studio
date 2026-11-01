import { describe, expect, it } from "vitest";

import { packageImportSchema } from "@/lib/validators/admin/package-import";

import { addOns, packages } from "../../prisma/seed-data";

const payload = {
  packages: packages.map(({ tiers = [], ...pkg }) => ({
    ...pkg,
    tiers,
    addOnCodes: addOns.filter((a) => a.categories.includes(pkg.category)).map((a) => a.code),
  })),
  addOns,
};

describe("packageImportSchema", () => {
  it("accepts the seeded packages and add-ons", () => {
    expect(packageImportSchema.safeParse(payload).success).toBe(true);
  });

  it("is a dry run unless told otherwise", () => {
    expect(packageImportSchema.parse(payload).dryRun).toBe(true);
    expect(packageImportSchema.parse({ ...payload, dryRun: false }).dryRun).toBe(false);
  });

  it("rejects duplicate package slugs and tier keys", () => {
    const [first] = payload.packages;
    expect(packageImportSchema.safeParse({ ...payload, packages: [first, first] }).success).toBe(
      false,
    );
    const wedding = payload.packages.find((pkg) => pkg.tiers.length > 1)!;
    const tiers = [wedding.tiers[0], wedding.tiers[0]];
    expect(
      packageImportSchema.safeParse({ ...payload, packages: [{ ...wedding, tiers }] }).success,
    ).toBe(false);
  });

  it("rejects an empty package list, unknown fields and fractional cents", () => {
    expect(packageImportSchema.safeParse({ ...payload, packages: [] }).success).toBe(false);
    expect(packageImportSchema.safeParse({ ...payload, extra: 1 }).success).toBe(false);
    const [first] = payload.packages;
    const bad = { ...first, basePriceCents: 10.5 };
    expect(packageImportSchema.safeParse({ ...payload, packages: [bad] }).success).toBe(false);
  });
});
