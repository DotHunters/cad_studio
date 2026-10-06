/**
 * Idempotent seed: safe to run repeatedly (`pnpm db:seed`). Upserts by unique key.
 * Data lives in ./seed-data.ts.
 */
import { readFileSync } from "node:fs";

import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import type { PhotoGroup } from "../src/lib/photos";
import {
  addOns,
  packages,
  pricingRules,
  sampleProjects,
  sampleReviews,
  services,
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
  // Services first: everything else refers to them. Create-only, like the rest of the catalogue.
  for (const service of services) {
    await db.service.upsert({ where: { slug: service.slug }, update: {}, create: service });
  }

  for (const pkg of packages) {
    await db.package.upsert({ where: { slug: pkg.slug }, update: {}, create: pkg });
  }

  for (const { categories, ...addOn } of addOns) {
    // Link each add-on to its services and to every package in one of them.
    const connect = packages
      .filter((p) => categories.includes(p.category))
      .map((p) => ({ slug: p.slug }));
    await db.addOn.upsert({
      where: { code: addOn.code },
      update: {},
      create: {
        ...addOn,
        services: { connect: categories.map((slug) => ({ slug })) },
        packages: { connect },
      },
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

/**
 * The owner's real work, from `src/data/photos.json` (written by `pnpm photos`): one portfolio
 * project per photo group, its images also in the gallery. Projects and image text are only
 * created, never overwritten, so edits made in admin survive a re-seed; image dimensions and
 * blur placeholders are refreshed in case the photos were re-encoded.
 */
async function seedPhotos() {
  const { groups } = JSON.parse(readFileSync("src/data/photos.json", "utf8")) as {
    groups: PhotoGroup[];
  };

  for (const [groupIndex, group] of groups.entries()) {
    const project = await db.portfolioProject.upsert({
      where: { slug: group.slug },
      update: {},
      create: {
        slug: group.slug,
        title: group.title,
        titleFr: group.titleFr,
        clientName: null,
        category: group.category,
        // TODO(owner): confirm reach, city and country in Admin → Portfolio.
        reach: "LOCAL",
        city: null,
        country: "",
        year: group.year,
        story: `${group.title}, photographed by CAD Studio Photography.`,
        // TODO(owner-fr): review
        storyFr: `${group.titleFr}, photographié par CAD Studio Photography.`,
        featured: group.featured,
        isSample: false,
        consentToPublish: true,
        publishedAt: new Date(),
      },
    });

    const total = group.images.length;
    for (const [index, photo] of group.images.entries()) {
      const publicId = `local${photo.src}`;
      const position = index + 1;
      const image = await db.image.upsert({
        where: { publicId },
        update: { width: photo.width, height: photo.height, blurDataUrl: photo.blurDataUrl },
        create: {
          publicId,
          width: photo.width,
          height: photo.height,
          blurDataUrl: photo.blurDataUrl,
          alt: `${group.alt} (photo ${position} of ${total})`,
          altFr: `${group.altFr} (photo ${position} sur ${total})`,
          category: group.category,
          tags: group.tags,
          inGallery: true,
          // Interleaves the groups in the gallery; order within each project is kept.
          sortOrder: index * 100 + groupIndex,
          // The owner supplied these photos for the website (AGENTS.md §9).
          consentToPublish: true,
          isSample: false,
          projectId: project.id,
        },
      });
      if (index === 0 && !project.coverId) {
        await db.portfolioProject.update({
          where: { id: project.id },
          data: { coverId: image.id },
        });
      }
    }
  }
}

async function main() {
  await seedCatalogue();
  await seedSettings();
  await seedSamples();
  await seedPhotos();
  console.info("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
