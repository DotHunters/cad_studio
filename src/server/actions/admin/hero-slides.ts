"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionResult } from "@/lib/admin/action-result";
import { db } from "@/lib/db";
import {
  addHeroSlide,
  HERO_FOCUS,
  HERO_SLIDES_KEY,
  heroImageSrc,
  type HeroSlideChoice,
  MAX_HERO_SLIDES,
  moveHeroSlide,
  parseHeroSlides,
  removeHeroSlide,
  setHeroSlideFocus,
} from "@/lib/hero-slides";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

const imageIdSchema = z.string().trim().min(1).max(64);
const INVALID = { ok: false, error: "Invalid request." } as const;

async function readSlides() {
  const setting = await db.siteSetting.findUnique({ where: { key: HERO_SLIDES_KEY } });
  return parseHeroSlides(setting?.value);
}

/** Saves the list, records it in the audit log and refreshes the home page. */
async function writeSlides(
  actor: { id: string; email?: string | null },
  value: HeroSlideChoice[],
  summary: string,
) {
  await db.siteSetting.upsert({
    where: { key: HERO_SLIDES_KEY },
    update: { value },
    create: { key: HERO_SLIDES_KEY, value },
  });
  await audit(actor, {
    action: "settings.update",
    entityType: "SiteSetting",
    entityId: HERO_SLIDES_KEY,
    summary,
  });
  revalidateContent("settings");
  revalidatePath("/admin/hero", "layout");
}

/** Adds a photo to the end of the home hero (Admin → Hero slides → Add photo). ADMIN only. */
export async function addHeroPhoto(formData: FormData): Promise<void> {
  const actor = await requireRole("ADMIN");
  const parsed = imageIdSchema.safeParse(formData.get("imageId"));
  if (!parsed.success) redirect("/admin/hero/add?error=choose");

  // Only photos the client agreed to publish may go on the home page (AGENTS.md §9).
  const image = await db.image.findFirst({
    where: { id: parsed.data, consentToPublish: true },
    select: { id: true, alt: true, publicId: true },
  });
  if (!image || !heroImageSrc(image.publicId)) redirect("/admin/hero/add?error=photo");

  const slides = await readSlides();
  if (slides.length >= MAX_HERO_SLIDES) redirect("/admin/hero?error=full");
  await writeSlides(actor, addHeroSlide(slides, image.id), `Hero: added photo "${image.alt}"`);
  redirect("/admin/hero?saved=added");
}

/** Removes one slide. With no slides left the home page goes back to the launch photos. */
export async function removeHeroPhoto(imageId: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = imageIdSchema.safeParse(imageId);
  if (!parsed.success) return INVALID;
  const slides = await readSlides();
  await writeSlides(actor, removeHeroSlide(slides, parsed.data), "Hero: removed a photo");
  return { ok: true };
}

/** Moves one slide a place earlier or later in the slideshow. */
export async function moveHeroPhoto(
  imageId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = z
    .object({ imageId: imageIdSchema, direction: z.enum(["up", "down"]) })
    .safeParse({ imageId, direction });
  if (!parsed.success) return INVALID;
  const slides = await readSlides();
  await writeSlides(
    actor,
    moveHeroSlide(slides, parsed.data.imageId, parsed.data.direction),
    `Hero: moved a photo ${parsed.data.direction}`,
  );
  return { ok: true };
}

/** Sets which part of the photo stays in frame (top / centre / bottom). */
export async function setHeroPhotoFocus(imageId: string, focus: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const parsed = z
    .object({
      imageId: imageIdSchema,
      focus: z.enum(["top", "center", "bottom"] satisfies (keyof typeof HERO_FOCUS)[]),
    })
    .safeParse({ imageId, focus });
  if (!parsed.success) return INVALID;
  const slides = await readSlides();
  await writeSlides(
    actor,
    setHeroSlideFocus(slides, parsed.data.imageId, parsed.data.focus),
    `Hero: photo focus set to ${parsed.data.focus}`,
  );
  return { ok: true };
}
