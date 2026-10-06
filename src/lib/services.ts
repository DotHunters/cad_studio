import type { Locale } from "@/config/site";
import { localize } from "@/lib/localize";

/**
 * Services (AGENTS.md §1) are admin-managed rows in the `Service` table. Other tables refer to
 * them by slug, which is set once on creation and never changes (URLs and saved quotes use it).
 */
export const SERVICE_SLUG_MAX = 40;
export const SERVICE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A service as cached for the site: plain JSON (no Dates), `active` = not archived. */
export type ServiceRow = {
  slug: string;
  name: string;
  nameFr: string | null;
  description: string;
  descriptionFr: string | null;
  sortOrder: number;
  active: boolean;
  tileImageId: string | null;
};

/** What forms and filters need: the slug and the name in the viewer's language. */
export type ServiceOption = { slug: string; name: string };

/** Rows that point at a service; any non-zero count blocks a hard delete. */
export type ServiceUsage = {
  packages: number;
  addOns: number;
  quotes: number;
  bookings: number;
  projects: number;
  images: number;
  reviews: number;
};

export function isServiceSlug(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= SERVICE_SLUG_MAX &&
    SERVICE_SLUG_PATTERN.test(value)
  );
}

const LIGATURES: Record<string, string> = { œ: "oe", Œ: "OE", æ: "ae", Æ: "AE", ß: "ss" };

/** "Événements & Galas" → "evenements-galas"; "" when nothing usable is left. */
export function slugFromName(name: string): string {
  return name
    .replace(/[œŒæÆß]/g, (char) => LIGATURES[char])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SERVICE_SLUG_MAX)
    .replace(/-+$/, "");
}

const bySortOrder = (a: ServiceRow, b: ServiceRow) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

export function serviceOptions(
  services: readonly ServiceRow[],
  locale: Locale,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): ServiceOption[] {
  return [...services]
    .filter((service) => includeArchived || service.active)
    .sort(bySortOrder)
    .map((service) => ({
      slug: service.slug,
      name: localize(service.name, service.nameFr, locale),
    }));
}

/** Slug → localized name for every service, archived ones included (old quotes still name them). */
export function serviceNameMap(services: readonly ServiceRow[], locale: Locale) {
  return new Map(
    services.map((service) => [service.slug, localize(service.name, service.nameFr, locale)]),
  );
}

export const usageTotal = (usage: ServiceUsage) =>
  Object.values(usage).reduce((sum, count) => sum + count, 0);

export const canDeleteService = (usage: ServiceUsage) => usageTotal(usage) === 0;

/** The site always needs at least one active service. */
export function canArchiveService(
  services: ReadonlyArray<Pick<ServiceRow, "slug" | "active">>,
  slug: string,
) {
  return services.some((service) => service.active && service.slug !== slug);
}

/** Swaps `slug` with its neighbour; unchanged at the ends or when the slug is unknown. */
export function moveSlug(order: readonly string[], slug: string, direction: "up" | "down") {
  const index = order.indexOf(slug);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= order.length) return [...order];
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
