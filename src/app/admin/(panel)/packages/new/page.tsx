import type { Metadata } from "next";
import Link from "next/link";

import { PackageForm } from "@/components/admin/package-form";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions, EMPTY_PACKAGE } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "New package" };

export default async function NewPackagePage() {
  await requireAdminPage("ADMIN");
  return (
    <>
      <Link href="/admin/packages" className="text-gold-text text-sm underline underline-offset-4">
        ← All packages
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">New package</h1>
      <PackageForm id={null} defaults={EMPTY_PACKAGE} categories={await adminCategoryOptions()} />
    </>
  );
}
