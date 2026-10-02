import "server-only";

import type { AddOnFormDefaults } from "@/components/admin/add-on-form";
import { slugFromCategory } from "@/lib/categories";
import { db } from "@/lib/db";

/** All add-ons (active and hidden) for the admin list. Uncached. */
export const listAddOnsForAdmin = () =>
  db.addOn.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });

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
  const addOn = await db.addOn.findUnique({ where: { id } });
  if (!addOn) return null;
  return {
    code: addOn.code,
    name: addOn.name,
    nameFr: addOn.nameFr ?? "",
    price: (addOn.priceCents / 100).toFixed(2),
    unit: addOn.unit,
    categories: addOn.categories.map(slugFromCategory),
    isActive: addOn.isActive,
    sortOrder: String(addOn.sortOrder),
  };
}
