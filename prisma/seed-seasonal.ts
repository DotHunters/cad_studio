/**
 * Optional one-off (`pnpm db:seed:seasonal`): adds the flyer's seasonal service, packages and
 * add-ons. Create-only, like the main seed: anything that already exists (and anything the
 * owner edited in admin) is left alone. Data lives in ./seasonal-data.ts.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seasonalAddOns, seasonalPackages, seasonalService } from "./seasonal-data";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  await db.service.upsert({
    where: { slug: seasonalService.slug },
    update: {},
    create: seasonalService,
  });

  for (const pkg of seasonalPackages) {
    await db.package.upsert({ where: { slug: pkg.slug }, update: {}, create: pkg });
  }

  for (const { categories, ...addOn } of seasonalAddOns) {
    await db.addOn.upsert({
      where: { code: addOn.code },
      update: {},
      create: {
        ...addOn,
        services: { connect: categories.map((slug) => ({ slug })) },
        packages: { connect: seasonalPackages.map((pkg) => ({ slug: pkg.slug })) },
      },
    });
  }
  console.info("Seasonal offers added (existing rows were left unchanged).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
