/**
 * One-off: applies the owner's 2026-10-20 price list (wedding, engagement, maternity, birthday
 * packages and the wedding add-ons in ./seed-data.ts) to a database that was seeded earlier.
 * The seed only creates missing rows, so it never updates these on its own.
 *
 * OVERWRITES the listed packages (and replaces their options), the services of VIDEO and
 * ALBUM, and add-on links to seeded packages, including edits made in admin to those. Other
 * packages only get their sort order. Run once per database:
 *   pnpm exec tsx prisma/apply-price-list.ts
 *   DATABASE_URL=<e2e url> pnpm exec tsx prisma/apply-price-list.ts
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { addOns, packages } from "./seed-data";

config({ path: [".env.local", ".env"], quiet: true });

const UPDATED = ["wedding", "engagement-couples", "family-event", "maternity"];
/** Add-ons no longer offered for weddings (replaced by WEDDING_VIDEO and CUSTOM_ALBUM). */
const RELINKED_ADD_ONS = ["VIDEO", "ALBUM"];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  await db.$transaction(async (tx) => {
    for (const { tiers = [], ...pkg } of packages) {
      if (!UPDATED.includes(pkg.slug)) {
        await tx.package.updateMany({
          where: { slug: pkg.slug },
          data: { sortOrder: pkg.sortOrder },
        });
        continue;
      }
      const saved = await tx.package.upsert({
        where: { slug: pkg.slug },
        update: pkg,
        create: pkg,
      });
      // Same keys as before, so saved quotes and bookings still find their option.
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

    // Links to seeded packages follow the seed; packages created in admin keep theirs.
    for (const { categories, ...addOn } of addOns) {
      const services = categories.map((slug) => ({ slug }));
      const linked = packages
        .filter((p) => categories.includes(p.category))
        .map((p) => ({ slug: p.slug }));
      const unlinked = packages
        .filter((p) => !categories.includes(p.category))
        .map((p) => ({ slug: p.slug }));
      await tx.addOn.upsert({
        where: { code: addOn.code },
        update: {
          ...(RELINKED_ADD_ONS.includes(addOn.code) && { services: { set: services } }),
          packages: { connect: linked, disconnect: unlinked },
        },
        create: { ...addOn, services: { connect: services }, packages: { connect: linked } },
      });
    }
  });
  console.info("Price list applied.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
