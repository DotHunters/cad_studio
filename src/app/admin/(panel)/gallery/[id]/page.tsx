import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ImageForm } from "@/components/admin/image-form";
import { StoredImage } from "@/components/site/stored-image";
import { requireAdminPage } from "@/server/auth/guards";
import { getImageForAdmin, projectOptions } from "@/server/queries/admin-images";
import { adminCategoryOptions } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Edit image" };

type Props = { params: Promise<{ id: string }> };

export default async function EditImagePage({ params }: Props) {
  await requireAdminPage("ADMIN");
  const { id } = await params;
  const [found, categories, projects] = await Promise.all([
    getImageForAdmin(id),
    adminCategoryOptions(),
    projectOptions(),
  ]);
  if (!found) notFound();
  const { image, defaults } = found;

  return (
    <>
      <Link href="/admin/gallery" className="text-gold-text text-sm underline underline-offset-4">
        ← All images
      </Link>
      <h1 className="font-heading mt-4 mb-8 text-4xl">Edit image</h1>
      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <div>
          <StoredImage
            image={image}
            alt={image.alt}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="h-auto w-full rounded-xl border"
          />
          <p className="text-muted-foreground mt-2 font-mono text-xs break-all">
            {image.publicId} · {image.width}×{image.height}
          </p>
        </div>
        <ImageForm id={id} defaults={defaults} categories={categories} projects={projects} />
      </div>
    </>
  );
}
