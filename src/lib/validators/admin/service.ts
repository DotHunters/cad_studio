import * as z from "zod";

import { SERVICE_SLUG_MAX, SERVICE_SLUG_PATTERN } from "@/lib/services";

import { optionalText, text } from "./fields";

/** Admin service form (Admin → Services). The slug is set on creation only. */
export const serviceFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(SERVICE_SLUG_MAX, `Keep it under ${SERVICE_SLUG_MAX} characters.`)
    .regex(SERVICE_SLUG_PATTERN, "Use lowercase letters, numbers and dashes, e.g. graduations.")
    .optional(),
  name: text(80),
  nameFr: optionalText(80),
  description: text(200),
  descriptionFr: optionalText(200),
});

export type ServiceFormValues = z.output<typeof serviceFormSchema>;
