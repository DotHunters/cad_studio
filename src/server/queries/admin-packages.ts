import "server-only";

import { getTranslations } from "next-intl/server";

import type { PackageFormDefaults } from "@/components/admin/package-form";
import { categorySlugs, slugFromCategory } from "@/lib/categories";
import { parseFaqs } from "@/lib/content";
import { db } from "@/lib/db";

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
  isActive: true,
  sortOrder: "0",
};

/** A package as form values (prices as dollars, lists as lines), or null if missing. */
export async function getPackageFormDefaults(id: string): Promise<PackageFormDefaults | null> {
  const pkg = await db.package.findUnique({ where: { id } });
  if (!pkg) return null;
  const optional = (value: number | null) => (value === null ? "" : String(value));
  return {
    slug: pkg.slug,
    category: slugFromCategory(pkg.category),
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
    isActive: pkg.isActive,
    sortOrder: String(pkg.sortOrder),
  };
}

/** Category choices for admin forms, labelled in English. */
export async function adminCategoryOptions() {
  const t = await getTranslations({ locale: "en", namespace: "Categories" });
  return categorySlugs.map((slug) => ({ value: slug, label: t(`${slug}.name`) }));
}
