import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PackageForm } from "@/components/admin/package-form";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions, getPackageFormDefaults } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Edit package" };

type Props = { params: Promise<{ id: string }> };

export default async function EditPackagePage({ params }: Props) {
  await requireAdminPage("ADMIN");
  const { id } = await params;
  const [defaults, categories] = await Promise.all([
    getPackageFormDefaults(id),
    adminCategoryOptions(),
  ]);
  if (!defaults) notFound();

  return (
    <>
      <Link href="/admin/packages" className="text-gold-text text-sm underline underline-offset-4">
        ← All packages
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">Edit {defaults.name}</h1>
      <PackageForm id={id} defaults={defaults} categories={categories} />
    </>
  );
}
