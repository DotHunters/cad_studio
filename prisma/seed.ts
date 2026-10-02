/**
 * Idempotent seed: safe to run repeatedly (`pnpm db:seed`). Upserts by unique key.
 * Data lives in ./seed-data.ts.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  addOns,
  packages,
  pricingRules,
  sampleProjects,
  sampleReviews,
  siteSettings,
  taxRates,
} from "./seed-data";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Packages, add-ons, pricing rules and tax rates are starting values only: once they exist
// the owner manages them in admin, so re-running the seed (e.g. to add the first admin) must
// never overwrite them. Only missing rows are created.
async function seedCatalogue() {
  for (const pkg of packages) {
    await db.package.upsert({ where: { slug: pkg.slug }, update: {}, create: pkg });
  }

  for (const addOn of addOns) {
    // Link each add-on to every package in one of its categories.
    const linked = packages.filter((p) => addOn.categories.includes(p.category));
    const connect = linked.map((p) => ({ slug: p.slug }));
    await db.addOn.upsert({
      where: { code: addOn.code },
      update: {},
      create: { ...addOn, packages: { connect } },
    });
  }
}

async function seedSettings() {
  for (const [key, value] of Object.entries(pricingRules)) {
    await db.pricingRule.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  for (const rate of taxRates) {
    await db.taxRate.upsert({ where: { province: rate.province }, update: {}, create: rate });
  }

  // Only create — never overwrite text the owner has edited in admin.
  for (const [key, value] of Object.entries(siteSettings)) {
    await db.siteSetting.upsert({ where: { key }, update: {}, create: { key, value } });
  }
}

async function seedSamples() {
  for (const { imageCount, ...project } of sampleProjects) {
    const saved = await db.portfolioProject.upsert({
      where: { slug: project.slug },
      update: { ...project, isSample: true, consentToPublish: true },
      create: { ...project, isSample: true, consentToPublish: true, publishedAt: new Date() },
    });

    for (let i = 1; i <= imageCount; i++) {
      const publicId = `placeholder/${project.slug}-${i}`;
      const image = await db.image.upsert({
        where: { publicId },
        update: {},
        create: {
          publicId,
          width: i % 3 === 0 ? 1200 : 1600,
          height: i % 3 === 0 ? 1600 : 1067,
          alt: `Sample placeholder image ${i} for ${project.title}`,
          altFr: `Image d'exemple ${i} pour ${project.titleFr}`,
          category: project.category,
          tags: ["sample"],
          sortOrder: i,
          isSample: true,
          consentToPublish: true,
          projectId: saved.id,
        },
      });
      if (i === 1 && saved.coverId !== image.id) {
        await db.portfolioProject.update({ where: { id: saved.id }, data: { coverId: image.id } });
      }
    }
  }

  // Reviews have no natural unique key: replace the sample set wholesale.
  await db.review.deleteMany({ where: { isSample: true } });
  await db.review.createMany({
    data: sampleReviews.map((review) => ({
      ...review,
      status: "APPROVED" as const,
      consentToPublish: true,
      isSample: true,
    })),
  });
}

/** First admin account (AGENTS.md §6.10). Nobody can sign up; more staff are added in admin. */
async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!email) return;
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", isActive: true },
    create: { email, role: "ADMIN" },
  });
}

async function main() {
  await seedCatalogue();
  await seedSettings();
  await seedSamples();
  await seedAdmin();
  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
