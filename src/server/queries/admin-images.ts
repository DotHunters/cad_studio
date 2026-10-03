import "server-only";

import type { ImageFormDefaults } from "@/components/admin/image-form";
import { slugFromCategory } from "@/lib/categories";
import { db } from "@/lib/db";

/** All images for the admin list, in gallery order. Uncached. */
export const listImagesForAdmin = () =>
  db.image.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      publicId: true,
      width: true,
      height: true,
      blurDataUrl: true,
      alt: true,
      altFr: true,
      category: true,
      tags: true,
      inGallery: true,
      consentToPublish: true,
      isSample: true,
      sortOrder: true,
      project: { select: { title: true, coverId: true } },
    },
  });

/** Projects to file images under. */
export const projectOptions = async () =>
  (
    await db.portfolioProject.findMany({
      orderBy: [{ year: { sort: "desc", nulls: "last" } }, { title: "asc" }],
      select: { id: true, title: true, year: true },
    })
  ).map((project) => ({
    value: project.id,
    label: project.year ? `${project.title} (${project.year})` : project.title,
  }));

export async function getImageForAdmin(id: string) {
  const image = await db.image.findUnique({
    where: { id },
    include: { project: { select: { coverId: true } } },
  });
  if (!image) return null;
  const defaults: ImageFormDefaults = {
    alt: image.alt,
    altFr: image.altFr ?? "",
    category: image.category ? slugFromCategory(image.category) : "",
    tags: image.tags.join(", "),
    inGallery: image.inGallery,
    sortOrder: String(image.sortOrder),
    projectId: image.projectId ?? "",
    isCover: image.project?.coverId === image.id,
    consentToPublish: image.consentToPublish,
  };
  return { image, defaults };
}
