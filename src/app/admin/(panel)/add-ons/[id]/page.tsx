import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddOnForm } from "@/components/admin/add-on-form";
import { requireAdminPage } from "@/server/auth/guards";
import { getAddOnFormDefaults } from "@/server/queries/admin-add-ons";
import { adminCategoryOptions } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Edit add-on" };

type Props = { params: Promise<{ id: string }> };

export default async function EditAddOnPage({ params }: Props) {
  await requireAdminPage("ADMIN");
  const { id } = await params;
  const [defaults, categories] = await Promise.all([
    getAddOnFormDefaults(id),
    adminCategoryOptions(),
  ]);
  if (!defaults) notFound();

  return (
    <>
      <Link href="/admin/add-ons" className="text-gold-text text-sm underline underline-offset-4">
        ← All add-ons
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">Edit {defaults.name}</h1>
      <AddOnForm id={id} defaults={defaults} categories={categories} />
    </>
  );
}
