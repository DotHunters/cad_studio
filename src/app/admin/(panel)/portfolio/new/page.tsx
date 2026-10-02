import type { Metadata } from "next";
import Link from "next/link";

import { ProjectForm } from "@/components/admin/project-form";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";
import { EMPTY_PROJECT } from "@/server/queries/admin-projects";

export const metadata: Metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireAdminPage("ADMIN");
  return (
    <>
      <Link href="/admin/portfolio" className="text-gold-text text-sm underline underline-offset-4">
        ← All projects
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">New project</h1>
      <ProjectForm id={null} defaults={EMPTY_PROJECT} categories={await adminCategoryOptions()} />
    </>
  );
}
