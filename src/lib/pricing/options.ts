/**
 * Priced options (AGENTS.md §6.2, §8.1): a package without tiers is one option; a package with
 * tiers (Silver / Gold / Platinum…) is one option per tier. The quote form, booking wizard and
 * quote engine work on options, so tiers need no special handling there. Pure, unit tested.
 */

export type TierRecord = {
  key: string;
  name: string;
  nameFr: string | null;
  basePriceCents: number;
  includedHours: number;
  includedShooters: number;
};

export type PackageRecord<C extends string = string> = {
  slug: string;
  category: C;
  name: string;
  nameFr: string | null;
  basePriceCents: number;
  includedHours: number;
  includedShooters: number;
  tiers: readonly TierRecord[];
};

export type PricedOption<C extends string = string> = {
  /** "wedding" or, for a tier, "wedding:gold". Saved with quotes and bookings. */
  slug: string;
  packageSlug: string;
  tierKey: string | null;
  category: C;
  /** "Wedding — Gold" for a tier. */
  name: string;
  nameFr: string | null;
  basePriceCents: number;
  includedHours: number;
  includedShooters: number;
};

export const optionSlug = (packageSlug: string, tierKey?: string | null) =>
  tierKey ? `${packageSlug}:${tierKey}` : packageSlug;

/** Packages (in display order) → options (tiers in their order). */
export function pricedOptions<C extends string>(
  packages: readonly PackageRecord<C>[],
): PricedOption<C>[] {
  return packages.flatMap((pkg): PricedOption<C>[] => {
    if (pkg.tiers.length === 0) {
      return [
        {
          slug: pkg.slug,
          packageSlug: pkg.slug,
          tierKey: null,
          category: pkg.category,
          name: pkg.name,
          nameFr: pkg.nameFr,
          basePriceCents: pkg.basePriceCents,
          includedHours: pkg.includedHours,
          includedShooters: pkg.includedShooters,
        },
      ];
    }
    return pkg.tiers.map((tier) => ({
      slug: optionSlug(pkg.slug, tier.key),
      packageSlug: pkg.slug,
      tierKey: tier.key,
      category: pkg.category,
      name: `${pkg.name} — ${tier.name}`,
      // French falls back piece by piece, so a missing tier translation keeps the package's.
      nameFr:
        pkg.nameFr || tier.nameFr
          ? `${pkg.nameFr || pkg.name} — ${tier.nameFr || tier.name}`
          : null,
      basePriceCents: tier.basePriceCents,
      includedHours: tier.includedHours,
      includedShooters: tier.includedShooters,
    }));
  });
}

/** The lowest price a package can be booked at: its cheapest tier, or its own price. */
export function startingPriceCents(pkg: {
  basePriceCents: number;
  tiers: readonly { basePriceCents: number }[];
}): number {
  return pkg.tiers.length
    ? Math.min(...pkg.tiers.map((tier) => tier.basePriceCents))
    : pkg.basePriceCents;
}

/** A URL-safe tier key from its name ("Gold Plus" → "gold-plus"), unique among `taken`. */
export function tierKeyFor(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tier";
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  return key;
}

/**
 * The option a link points at: `?package=wedding&tier=gold` (or `?package=wedding:gold`), or
 * the package's cheapest option when no or an unknown tier is given. Null for unknown packages.
 */
export function findOption<T extends { slug: string; packageSlug: string; basePriceCents: number }>(
  options: readonly T[],
  packageParam: string | undefined,
  tierParam?: string,
): T | null {
  if (!packageParam) return null;
  const exact = options.find((option) => option.slug === optionSlug(packageParam, tierParam));
  if (exact) return exact;
  const packageSlug = packageParam.split(":")[0];
  return options
    .filter((option) => option.packageSlug === packageSlug)
    .reduce<T | null>(
      (best, option) => (!best || option.basePriceCents < best.basePriceCents ? option : best),
      null,
    );
}

/**
 * The option name a quote or booking was priced with ("Wedding — Gold"), saved in its
 * breakdown so it survives later renames; older records fall back to the package's name.
 */
export function savedOptionName(
  breakdown: unknown,
  pkg: { name: string; nameFr?: string | null } | null,
  locale: "en" | "fr",
): string | null {
  const saved =
    breakdown && typeof breakdown === "object"
      ? (breakdown as { packageName?: unknown; packageNameFr?: unknown })
      : {};
  const name = typeof saved.packageName === "string" ? saved.packageName : pkg?.name;
  if (!name) return null;
  const nameFr =
    typeof saved.packageNameFr === "string"
      ? saved.packageNameFr
      : typeof saved.packageName === "string"
        ? null
        : (pkg?.nameFr ?? null);
  return locale === "fr" && nameFr ? nameFr : name;
}
