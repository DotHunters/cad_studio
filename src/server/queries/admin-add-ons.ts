import "server-only";

import type { AddOnFormDefaults } from "@/components/admin/add-on-form";
import { db } from "@/lib/db";

/** All add-ons (active and hidden) for the admin list. Uncached. */
export const listAddOnsForAdmin = () =>
  db.addOn.findMany({
    // Services in display order (join-table rows come back in no fixed order).
    include: {
      services: { select: { slug: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

export const EMPTY_ADD_ON: AddOnFormDefaults = {
  code: "",
  name: "",
  nameFr: "",
  price: "",
  unit: "",
  categories: [],
  isActive: true,
  sortOrder: "0",
};

export async function getAddOnFormDefaults(id: string): Promise<AddOnFormDefaults | null> {
  const addOn = await db.addOn.findUnique({
    where: { id },
    include: { services: { select: { slug: true } } },
  });
  if (!addOn) return null;
  return {
    code: addOn.code,
    name: addOn.name,
    nameFr: addOn.nameFr ?? "",
    price: (addOn.priceCents / 100).toFixed(2),
    unit: addOn.unit,
    categories: addOn.services.map((s) => s.slug),
    isActive: addOn.isActive,
    sortOrder: String(addOn.sortOrder),
  };
}
