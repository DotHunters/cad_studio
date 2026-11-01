import "server-only";

import type { PackageImport } from "@/lib/validators/admin/package-import";
import { db } from "@/lib/db";

export type PackageImportSummary = {
  dryRun: boolean;
  created: string[];
  updated: string[];
  /** Quotes and bookings of deleted packages keep their record but lose the link. */
  deleted: { slug: string; name: string; quotes: number; bookings: number }[];
  addOns: string[];
};

/** Bad input that only the database can spot (unknown service or add-on). */
export class PackageImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackageImportError";
  }
}

/**
 * Replaces the whole package list with `input.packages` in one transaction: packages with a
 * listed slug are updated in place (same id, so their quotes and bookings stay linked), new
 * slugs are created and every other package is deleted. Tiers are matched by key; tiers not
 * listed are removed. With `dryRun` nothing is written and the summary shows what would be.
 */
export async function importPackages(input: PackageImport): Promise<PackageImportSummary> {
  return db.$transaction(
    async (tx) => {
      const existing = await tx.package.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          _count: { select: { quotes: true, bookings: true } },
        },
      });
      const listed = new Set(input.packages.map((pkg) => pkg.slug));
      const existingSlugs = new Set(existing.map((pkg) => pkg.slug));
      const removed = existing.filter((pkg) => !listed.has(pkg.slug));

      const serviceSlugs = new Set([
        ...input.packages.map((pkg) => pkg.category),
        ...input.addOns.flatMap((addOn) => addOn.categories),
      ]);
      const services = await tx.service.findMany({
        where: { slug: { in: [...serviceSlugs] } },
        select: { slug: true },
      });
      const missingServices = [...serviceSlugs].filter(
        (slug) => !services.some((service) => service.slug === slug),
      );
      if (missingServices.length > 0) {
        throw new PackageImportError(`Unknown services: ${missingServices.join(", ")}`);
      }

      const linkedCodes = new Set(input.packages.flatMap((pkg) => pkg.addOnCodes));
      const definedCodes = new Set(input.addOns.map((addOn) => addOn.code));
      const knownAddOns = await tx.addOn.findMany({
        where: { code: { in: [...linkedCodes] } },
        select: { code: true },
      });
      const missingAddOns = [...linkedCodes].filter(
        (code) => !definedCodes.has(code) && !knownAddOns.some((addOn) => addOn.code === code),
      );
      if (missingAddOns.length > 0) {
        throw new PackageImportError(`Unknown add-ons: ${missingAddOns.join(", ")}`);
      }

      const summary: PackageImportSummary = {
        dryRun: input.dryRun,
        created: input.packages.filter((pkg) => !existingSlugs.has(pkg.slug)).map((p) => p.slug),
        updated: input.packages.filter((pkg) => existingSlugs.has(pkg.slug)).map((p) => p.slug),
        deleted: removed.map((pkg) => ({
          slug: pkg.slug,
          name: pkg.name,
          quotes: pkg._count.quotes,
          bookings: pkg._count.bookings,
        })),
        addOns: [...definedCodes],
      };
      if (input.dryRun) return summary;

      // Quotes, bookings and images keep their rows (SetNull); tiers go with the package.
      await tx.package.deleteMany({ where: { id: { in: removed.map((pkg) => pkg.id) } } });

      for (const { categories, ...addOn } of input.addOns) {
        const services = categories.map((slug) => ({ slug }));
        await tx.addOn.upsert({
          where: { code: addOn.code },
          update: { ...addOn, isActive: true, services: { set: services } },
          create: { ...addOn, services: { connect: services } },
        });
      }

      for (const { tiers, addOnCodes, ...pkg } of input.packages) {
        const addOns = addOnCodes.map((code) => ({ code }));
        const saved = await tx.package.upsert({
          where: { slug: pkg.slug },
          update: { ...pkg, isActive: true, addOns: { set: addOns } },
          create: { ...pkg, addOns: { connect: addOns } },
          select: { id: true },
        });
        await tx.packageTier.deleteMany({
          where: { packageId: saved.id, key: { notIn: tiers.map((tier) => tier.key) } },
        });
        for (const [sortOrder, tier] of tiers.entries()) {
          await tx.packageTier.upsert({
            where: { packageId_key: { packageId: saved.id, key: tier.key } },
            update: { ...tier, sortOrder },
            create: { ...tier, sortOrder, packageId: saved.id },
          });
        }
      }
      return summary;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}
