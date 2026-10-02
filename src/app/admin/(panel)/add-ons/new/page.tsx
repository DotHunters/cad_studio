import type { Metadata } from "next";
import Link from "next/link";

import { AddOnForm } from "@/components/admin/add-on-form";
import { requireAdminPage } from "@/server/auth/guards";
import { EMPTY_ADD_ON } from "@/server/queries/admin-add-ons";
import { adminCategoryOptions } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "New add-on" };

export default async function NewAddOnPage() {
  await requireAdminPage("ADMIN");
  return (
    <>
      <Link href="/admin/add-ons" className="text-gold-text text-sm underline underline-offset-4">
        ← All add-ons
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">New add-on</h1>
      <AddOnForm id={null} defaults={EMPTY_ADD_ON} categories={await adminCategoryOptions()} />
    </>
  );
}
