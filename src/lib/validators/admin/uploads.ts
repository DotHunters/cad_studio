import * as z from "zod";

import { isBlobUrl } from "@/lib/images";
import { MAX_UPLOAD_FILES } from "@/lib/uploads";

import { text } from "./fields";

/** Photos the browser uploaded to Vercel Blob, to be added to a portfolio project. */
export const projectImagesSchema = z.object({
  // AGENTS.md §9: photos are only published with the client's consent.
  consent: z.literal(true, "Confirm that the client agreed to publish these photos."),
  altPrefix: text(120),
  images: z
    .array(
      z.object({
        url: z.string().refine(isBlobUrl, "Not an uploaded photo."),
        width: z.number().int().min(1).max(20_000),
        height: z.number().int().min(1).max(20_000),
        blurDataUrl: z
          .string()
          .max(4_000)
          .regex(/^data:image\/(jpeg|png|webp);base64,/)
          .nullable(),
      }),
    )
    .min(1, "Choose at least one photo.")
    .max(MAX_UPLOAD_FILES, `Up to ${MAX_UPLOAD_FILES} photos at a time.`),
});
