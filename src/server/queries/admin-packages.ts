import "server-only";

import type { PackageFormDefaults } from "@/components/admin/package-form";
import { parseFaqs } from "@/lib/content";
import { db } from "@/lib/db";
import { getServices } from "@/server/queries/services";

/** All packages (active and hidden) for the admin list. Uncached. */
export const listPackagesForAdmin = () =>
  db.package.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      basePriceCents: true,
      includedHours: true,
      isActive: true,
      sortOrder: true,
      tiers: { orderBy: { sortOrder: "asc" }, select: { name: true, basePriceCents: true } },
    },
  });

export const EMPTY_PACKAGE: PackageFormDefaults = {
  slug: "",
  category: "",
  name: "",
  nameFr: "",
  summary: "",
  summaryFr: "",
  description: "",
  descriptionFr: "",
  basePrice: "",
  includedHours: "1",
  includedShooters: "1",
  editedImages: "",
  turnaroundDays: "",
  inclusions: "",
  inclusionsFr: "",
  exclusions: "",
  exclusionsFr: "",
  faqs: [],
  tiers: [],
  isActive: true,
  sortOrder: "0",
};

/** A package as form values (prices as dollars, lists as lines), or null if missing. */
export async function getPackageFormDefaults(id: string): Promise<PackageFormDefaults | null> {
  const pkg = await db.package.findUnique({
    where: { id },
    include: { tiers: { orderBy: { sortOrder: "asc" } } },
  });
  if (!pkg) return null;
  const optional = (value: number | null) => (value === null ? "" : String(value));
  return {
    slug: pkg.slug,
    category: pkg.category,
    name: pkg.name,
    nameFr: pkg.nameFr ?? "",
    summary: pkg.summary,
    summaryFr: pkg.summaryFr ?? "",
    description: pkg.description,
    descriptionFr: pkg.descriptionFr ?? "",
    basePrice: (pkg.basePriceCents / 100).toFixed(2),
    includedHours: String(pkg.includedHours),
    includedShooters: String(pkg.includedShooters),
    editedImages: optional(pkg.editedImages),
    turnaroundDays: optional(pkg.turnaroundDays),
    inclusions: pkg.inclusions.join("\n"),
    inclusionsFr: pkg.inclusionsFr.join("\n"),
    exclusions: pkg.exclusions.join("\n"),
    exclusionsFr: pkg.exclusionsFr.join("\n"),
    faqs: parseFaqs(pkg.faqs).map((faq) => ({
      q: faq.q,
      a: faq.a,
      qFr: faq.qFr ?? "",
      aFr: faq.aFr ?? "",
    })),
    tiers: pkg.tiers.map((tier) => ({
      key: tier.key,
      name: tier.name,
      nameFr: tier.nameFr ?? "",
      basePrice: (tier.basePriceCents / 100).toFixed(2),
      includedHours: String(tier.includedHours),
      includedShooters: String(tier.includedShooters),
      editedImages: optional(tier.editedImages),
      turnaroundDays: optional(tier.turnaroundDays),
      inclusions: tier.inclusions.join("\n"),
      inclusionsFr: tier.inclusionsFr.join("\n"),
    })),
    isActive: pkg.isActive,
    sortOrder: String(pkg.sortOrder),
  };
}

/** Service choices for admin forms, in English; archived ones are marked so old records still match. */
export async function adminCategoryOptions() {
  const services = await getServices();
  return services.map((service) => ({
    value: service.slug,
    label: service.active ? service.name : `${service.name} (archived)`,
  }));
}
