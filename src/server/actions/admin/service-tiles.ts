"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { categorySlugs } from "@/lib/categories";
import { db } from "@/lib/db";
import {
  parseServiceTileChoices,
  SERVICE_TILES_KEY,
  withServiceTileChoice,
} from "@/lib/service-tiles";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

const inputSchema = z.object({
  slug: z.enum(categorySlugs),
  // "" = back to the default launch photo.
  imageId: z.string().trim().max(64),
});

/** Chooses the photo on one home-page service tile (Admin → Service tiles). ADMIN only. */
export async function setServiceTile(formData: FormData): Promise<void> {
  const actor = await requireRole("ADMIN");
  const parsed = inputSchema.safeParse({
    slug: formData.get("slug"),
    imageId: formData.get("imageId") ?? "",
  });
  if (!parsed.success) redirect("/admin/service-tiles");
  const { slug, imageId } = parsed.data;

  // Only photos the client agreed to publish may go on the home page (AGENTS.md §9).
  const image = imageId
    ? await db.image.findFirst({
        where: { id: imageId, consentToPublish: true },
        select: { id: true, alt: true },
      })
    : null;
  if (imageId && !image) redirect(`/admin/service-tiles/${slug}?error=photo`);

  const setting = await db.siteSetting.findUnique({ where: { key: SERVICE_TILES_KEY } });
  const value = withServiceTileChoice(
    parseServiceTileChoices(setting?.value),
    slug,
    image?.id ?? null,
  );
  await db.siteSetting.upsert({
    where: { key: SERVICE_TILES_KEY },
    update: { value },
    create: { key: SERVICE_TILES_KEY, value },
  });
  await audit(actor, {
    action: "settings.update",
    entityType: "SiteSetting",
    entityId: SERVICE_TILES_KEY,
    summary: image
      ? `Service tile "${slug}": photo "${image.alt}"`
      : `Service tile "${slug}": default photo`,
  });
  revalidateContent("settings");
  revalidatePath("/admin/service-tiles", "layout");
  redirect(`/admin/service-tiles?saved=${slug}`);
}
