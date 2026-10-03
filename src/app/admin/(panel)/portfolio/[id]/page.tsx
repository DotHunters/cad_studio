import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/admin/project-form";
import { ProjectPhotoUploader } from "@/components/admin/project-photo-uploader";
import { StoredImage } from "@/components/site/stored-image";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";
import { getProjectForAdmin } from "@/server/queries/admin-projects";

export const metadata: Metadata = { title: "Edit project" };
// Reads BLOB_READ_WRITE_TOKEN at request time.
export const dynamic = "force-dynamic";
// Converting a large photo to WebP (per photo, in a Server Action) can take a few seconds.
export const maxDuration = 60;

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

      <section aria-labelledby="photos-title" className="mt-14 max-w-5xl">
        <h2 id="photos-title" className="font-heading text-2xl">
          Photos ({project.images.length})
        </h2>
        {project.images.length > 0 ? (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {project.images.map((image) => (
              <li key={image.id}>
                <Link
                  href={`/admin/gallery/${image.id}`}
                  className="group block"
                  aria-label={`Edit photo: ${image.alt}`}
                >
                  <span className="relative block aspect-square overflow-hidden rounded-md border">
                    <StoredImage image={image} alt="" fill sizes="160px" className="object-cover" />
                  </span>
                  <span className="text-muted-foreground mt-1 line-clamp-2 block text-xs group-hover:underline">
                    {image.id === project.coverId && "Cover · "}
                    {image.consentToPublish ? "" : "Hidden (no consent) · "}
                    {image.alt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">No photos yet.</p>
        )}
        <h3 className="mt-8 mb-3 text-lg font-medium">Upload photos</h3>
        <ProjectPhotoUploader
          projectId={id}
          projectSlug={project.defaults.slug}
          defaultAlt={project.defaults.title}
          enabled={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        />
      </section>
    </>
  );
}
