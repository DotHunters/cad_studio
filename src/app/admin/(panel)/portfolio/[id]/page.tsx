import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/admin/project-form";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";
import { getProjectForAdmin } from "@/server/queries/admin-projects";

export const metadata: Metadata = { title: "Edit project" };

type Props = { params: Promise<{ id: string }> };

export default async function EditProjectPage({ params }: Props) {
  await requireAdminPage("ADMIN");
  const { id } = await params;
  const [project, categories] = await Promise.all([getProjectForAdmin(id), adminCategoryOptions()]);
  if (!project) notFound();

  return (
    <>
      <Link href="/admin/portfolio" className="text-gold-text text-sm underline underline-offset-4">
        ← All projects
      </Link>
      <h1 className="font-heading mt-4 mb-2 text-4xl">Edit {project.defaults.title}</h1>
      {project.isSample && (
        <p className="text-muted-foreground mb-6 text-sm">
          Sample project — only shown outside production. Replace it with real work before launch.
        </p>
      )}
      <div className="mt-6">
        <ProjectForm id={id} defaults={project.defaults} categories={categories} />
      </div>
    </>
  );
}
