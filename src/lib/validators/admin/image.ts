import { z } from "zod";

import { categorySlugs } from "@/lib/categories";

import { checkbox, integer, optionalText, text } from "./fields";

/** "Wedding, Outdoor , wedding" → ["wedding", "outdoor"]. */
export function parseTags(value: string | undefined): string[] {
  const tags = (value ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)];
}

/**
 * Admin image details (AGENTS.md §6.4, §9). An image can only be shown in the gallery or on
 * a case study once the admin confirms the client agreed to publish it.
 */
export const imageFormSchema = z
  .object({
    alt: text(250),
    altFr: optionalText(250),
    category: z
      .enum(categorySlugs)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tags: z
      .string()
      .optional()
      .transform(parseTags)
      .pipe(
        z.array(z.string().max(30, "Keep each tag under 30 characters.")).max(20, "Up to 20 tags."),
      ),
    inGallery: checkbox,
    sortOrder: integer(0, 10_000),
    projectId: optionalText(40),
    isCover: checkbox,
    consentToPublish: checkbox,
  })
  .superRefine((image, ctx) => {
    if (!image.consentToPublish && (image.inGallery || image.projectId)) {
      ctx.addIssue({
        code: "custom",
        path: ["consentToPublish"],
        message: "Confirm the client agreed before showing this image in the gallery or a project.",
      });
    }
    if (image.isCover && !image.projectId) {
      ctx.addIssue({ code: "custom", path: ["isCover"], message: "Choose a project first." });
    }
  });

export type ImageFormValues = z.output<typeof imageFormSchema>;
