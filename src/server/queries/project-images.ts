/**
 * Project images that may be shown publicly: only those the admin marked "client consent
 * to publish obtained" (AGENTS.md §9), in display order.
 */
export const publicProjectImages = {
  where: { consentToPublish: true },
  orderBy: { sortOrder: "asc" as const },
};
