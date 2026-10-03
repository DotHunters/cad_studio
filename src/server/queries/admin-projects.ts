import "server-only";

import type { ProjectFormDefaults } from "@/components/admin/project-form";
import { slugFromCategory } from "@/lib/categories";
import { db } from "@/lib/db";

/** All projects (published or not, samples included) for the admin list. Uncached. */
export const listProjectsForAdmin = () =>
  db.portfolioProject.findMany({
    orderBy: [{ year: { sort: "desc", nulls: "last" } }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      clientName: true,
      consentToPublish: true,
      category: true,
      reach: true,
      year: true,
      featured: true,
      isSample: true,
      publishedAt: true,
      _count: { select: { images: true } },
    },
  });

export const EMPTY_PROJECT: ProjectFormDefaults = {
  slug: "",
  title: "",
  titleFr: "",
  clientName: "",
  consentToPublish: false,
  category: "",
  reach: "",
  city: "",
  country: "Canada",
  year: String(new Date().getFullYear()),
  story: "",
  storyFr: "",
  featured: false,
  published: false,
};

export async function getProjectForAdmin(id: string) {
  const project = await db.portfolioProject.findUnique({
    where: { id },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          publicId: true,
          width: true,
          height: true,
          blurDataUrl: true,
          alt: true,
          consentToPublish: true,
        },
      },
    },
  });
  if (!project) return null;
  const defaults: ProjectFormDefaults = {
    slug: project.slug,
    title: project.title,
    titleFr: project.titleFr ?? "",
    clientName: project.clientName ?? "",
    consentToPublish: project.consentToPublish,
    category: slugFromCategory(project.category),
    reach: project.reach,
    city: project.city ?? "",
    country: project.country,
    year: project.year ? String(project.year) : "",
    story: project.story,
    storyFr: project.storyFr ?? "",
    featured: project.featured,
    published: project.publishedAt !== null,
  };
  return {
    defaults,
    isSample: project.isSample,
    images: project.images,
    coverId: project.coverId,
  };
}
