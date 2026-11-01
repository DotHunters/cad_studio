/**
 * Pushes the owner's package list (wedding, engagement & couples, birthdays & private events,
 * maternity and the wedding add-ons in prisma/seed-data.ts) to a deployed site through
 * POST /api/admin/packages/import. The listed packages REPLACE all others: every package not
 * listed is DELETED on the remote site (its quotes and bookings stay, unlinked).
 *
 * Fill in .env.remote (git-ignored):
 *   REMOTE_BASE_URL=https://your-site.vercel.app
 *   REMOTE_ADMIN_EMAIL=admin@example.com
 *   REMOTE_ADMIN_PASSWORD=...
 *
 * Then:
 *   pnpm push:packages            # dry run: shows what would change, writes nothing
 *   pnpm push:packages --apply    # makes the change
 */
import { config } from "dotenv";

import { addOns, packages } from "../prisma/seed-data";

config({ path: ".env.remote", quiet: true });

const PACKAGE_SLUGS = ["wedding", "engagement-couples", "family-event", "maternity"];
/** Wedding add-ons from the owner's price list; created or updated on the remote site. */
const ADD_ON_CODES = ["WEDDING_VIDEO", "CUSTOM_ALBUM", "EXTRA_COVERAGE", "EXTRA_SHOOT"];

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set — fill it in .env.remote`);
  return value;
}

function buildPayload(dryRun: boolean) {
  return {
    dryRun,
    packages: packages
      .filter((pkg) => PACKAGE_SLUGS.includes(pkg.slug))
      .map(({ tiers = [], ...pkg }) => ({
        ...pkg,
        tiers,
        // Same links as the seed: add-ons offered for the package's service.
        addOnCodes: addOns
          .filter((addOn) => addOn.categories.includes(pkg.category))
          .map((addOn) => addOn.code),
      })),
    addOns: addOns.filter((addOn) => ADD_ON_CODES.includes(addOn.code)),
  };
}

type Summary = {
  dryRun: boolean;
  created: string[];
  updated: string[];
  deleted: { slug: string; name: string; quotes: number; bookings: number }[];
  addOns: string[];
};

async function main() {
  const apply = process.argv.includes("--apply");
  const baseUrl = required("REMOTE_BASE_URL").replace(/\/+$/, "");
  const email = required("REMOTE_ADMIN_EMAIL");
  const password = required("REMOTE_ADMIN_PASSWORD");

  const payload = buildPayload(!apply);
  if (payload.packages.length !== PACKAGE_SLUGS.length) {
    throw new Error("Some packages are missing from prisma/seed-data.ts");
  }

  const response = await fetch(`${baseUrl}/api/admin/packages/import`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(`${email}:${password}`).toString("base64")}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 2000)}`);
  }
  const summary = JSON.parse(text) as Summary;

  console.info(summary.dryRun ? "DRY RUN — nothing was changed.\n" : "Done.\n");
  console.info(`Created:  ${summary.created.join(", ") || "—"}`);
  console.info(`Updated:  ${summary.updated.join(", ") || "—"}`);
  console.info(`Add-ons:  ${summary.addOns.join(", ") || "—"}`);
  console.info(summary.dryRun ? "Would delete:" : "Deleted:");
  for (const pkg of summary.deleted) {
    console.info(`  ${pkg.slug} (${pkg.name}) — ${pkg.quotes} quotes, ${pkg.bookings} bookings`);
  }
  if (summary.deleted.length === 0) console.info("  —");
  if (summary.dryRun) console.info("\nRun again with --apply to make these changes.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
