# Seasonal Offers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner run seasonal photo offers (Christmas first) as admin-managed packages with a strike-through regular price and an end date, show them in a booking strip right after the home hero (hidden when none are live), and book them through the existing booking flow.

**Architecture:** One admin-managed `Service` with slug `seasonal`; its packages are the offers. `Package` gets two optional columns (`regularPriceCents`, `offerEndsAt`). One pure helper (`isOfferLive`) is applied after every cached package read, so expired offers vanish from the site and from the pricing context (which quotes and bookings use). A server component renders the home strip and a `/seasonal` landing page from the same grid.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Prisma 7 (Postgres), Zod 4, next-intl, Tailwind v4, Vitest, Playwright, pnpm.

**Spec:** `docs/superpowers/specs/2026-11-23-seasonal-offers-design.md`. This plan deliberately differs from the spec in these places (Task 10 updates the spec to match):

1. **No flyer data in the default seed.** The default seed feeds the e2e database, and a seventh service would break existing specs (six home tiles, package counts). The flyer content ships as an optional create-only script, `pnpm db:seed:seasonal`. The owner can equally create everything in admin.
2. **Hours** store the upper end of a range rounded up (existing convention in `prisma/seed-data.ts`): Mini 2, Classic 3, Premium 5, Event Coverage 8. The ranges are written in the inclusions.
3. **No nav item and no hero image on `/seasonal`.** Static pages would keep a stale nav link after an offer ends. The home strip and `/seasonal` are revalidated hourly (`revalidate = 3600`), so an ended offer can show up to an hour late; booking is exact because the pricing context filters at call time.
4. **Expired packages cannot be priced or booked** because they are absent from the pricing context. (The existing fallback "unknown package → category's cheapest option" is unchanged and is shown to the user in the wizard, so client and server agree.)

---

## File structure

| File | Responsibility |
|---|---|
| `src/lib/seasonal/offer.ts` (create) | Pure helpers: `SEASONAL_SERVICE_SLUG`, `isOfferLive`, `filterLive`, `offerEndFromDateKey`, `offerEndDateKey` |
| `tests/unit/seasonal-offer.test.ts` (create) | Unit tests for the helpers |
| `prisma/schema.prisma` (modify) | `Package.regularPriceCents`, `Package.offerEndsAt` |
| `prisma/migrations/20261123000000_seasonal_offers/migration.sql` (create) | Adds the two columns |
| `src/lib/validators/admin/fields.ts` (modify) | `optionalDollarsToCents`, `optionalDateKey` |
| `src/lib/validators/admin/package.ts` (modify) | `regularPrice`, `offerEndsOn` + cross-field check |
| `tests/unit/admin-package-schema.test.ts` (modify) | Tests for the new fields |
| `src/server/actions/admin/packages.ts` (modify) | Save the two fields, audit them |
| `src/server/queries/admin-packages.ts` (modify) | Form defaults and list select |
| `src/components/admin/package-form.tsx` (modify) | "Offer" fieldset |
| `src/app/admin/(panel)/packages/(list)/page.tsx` (modify) | Offer end / expired note |
| `src/server/queries/packages.ts` (modify) | Select new fields, filter live after the cache |
| `src/server/queries/pricing.ts` (modify) | Filter expired offers out of the pricing context |
| `src/server/queries/seasonal.ts` (create) | `getSeasonalOffers()` → service, live packages, add-ons, or `null` |
| `messages/en.json`, `messages/fr.json` (modify) | `Seasonal` namespace |
| `src/components/seasonal/seasonal-title.tsx` (create) | Service name with gold accent on the last word |
| `src/components/seasonal/seasonal-offer-card.tsx` (create) | One offer card |
| `src/components/seasonal/seasonal-offer-grid.tsx` (create) | Maps packages to cards (home and `/seasonal`) |
| `src/components/site/seasonal-booking-strip.tsx` (create) | Home section; returns `null` when nothing is live |
| `src/app/[locale]/(site)/page.tsx` (modify) | Strip directly after the hero |
| `src/app/[locale]/(site)/seasonal/page.tsx` (create) | Flyer-style landing page |
| `src/app/sitemap.ts` (modify) | `/seasonal` only while live |
| `prisma/seasonal-data.ts`, `prisma/seed-seasonal.ts` (create), `package.json` (modify) | Optional flyer content + `db:seed:seasonal` |
| `tests/unit/seasonal-data.test.ts` (create) | Flyer data checks |
| `tests/e2e/seasonal.global.spec.ts` (create) | Admin creates offer → home strip → expiry hides it |
| `AGENTS.md`, spec (modify) | Document the feature |

Commit trailer for every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

Before starting: the dev database must be running (see the local-postgres memory: start it detached with PowerShell `Start-Process`), and check for other busy sessions before long builds (`.next` collisions).

---

### Task 1: Offer helpers

**Files:**
- Create: `src/lib/seasonal/offer.ts`
- Test: `tests/unit/seasonal-offer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seasonal-offer.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  filterLive,
  isOfferLive,
  offerEndDateKey,
  offerEndFromDateKey,
  SEASONAL_SERVICE_SLUG,
} from "@/lib/seasonal/offer";

describe("offerEndFromDateKey", () => {
  it("is the last millisecond of that day in Toronto (winter, UTC-5)", () => {
    expect(offerEndFromDateKey("2026-12-25").toISOString()).toBe("2026-12-26T04:59:59.999Z");
  });

  it("follows daylight saving time (summer, UTC-4)", () => {
    expect(offerEndFromDateKey("2026-07-01").toISOString()).toBe("2026-07-02T03:59:59.999Z");
  });

  it("round-trips through offerEndDateKey", () => {
    expect(offerEndDateKey(offerEndFromDateKey("2026-12-25"))).toBe("2026-12-25");
    expect(offerEndDateKey(offerEndFromDateKey("2026-12-25").toISOString())).toBe("2026-12-25");
  });
});

describe("isOfferLive", () => {
  const endsAt = offerEndFromDateKey("2026-12-25");

  it("is live without an end date", () => {
    expect(isOfferLive(null)).toBe(true);
    expect(isOfferLive(undefined)).toBe(true);
  });

  it("is live all through the last day (studio time)", () => {
    expect(isOfferLive(endsAt, new Date("2026-12-25T05:00:00Z"))).toBe(true); // 00:00 Toronto
    expect(isOfferLive(endsAt, new Date("2026-12-26T04:59:59.999Z"))).toBe(true); // 23:59:59.999
  });

  it("ends at midnight studio time", () => {
    expect(isOfferLive(endsAt, new Date("2026-12-26T05:00:00.000Z"))).toBe(false);
    expect(isOfferLive(endsAt, new Date("2027-01-10T12:00:00Z"))).toBe(false);
  });

  it("accepts ISO strings, which is what cached queries return", () => {
    expect(isOfferLive(endsAt.toISOString(), new Date("2026-12-20T12:00:00Z"))).toBe(true);
    expect(isOfferLive(endsAt.toISOString(), new Date("2026-12-27T12:00:00Z"))).toBe(false);
  });
});

describe("filterLive", () => {
  it("keeps open-ended and unexpired items and drops expired ones", () => {
    const now = new Date("2026-12-26T12:00:00Z");
    const items = [
      { slug: "open", offerEndsAt: null },
      { slug: "future", offerEndsAt: offerEndFromDateKey("2027-01-05") },
      { slug: "expired", offerEndsAt: offerEndFromDateKey("2026-12-25").toISOString() },
    ];
    expect(filterLive(items, now).map((item) => item.slug)).toEqual(["open", "future"]);
  });
});

describe("SEASONAL_SERVICE_SLUG", () => {
  it("is the service slug admins create for seasonal offers", () => {
    expect(SEASONAL_SERVICE_SLUG).toBe("seasonal");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/unit/seasonal-offer.test.ts`
Expected: FAIL (cannot resolve `@/lib/seasonal/offer`).

- [ ] **Step 3: Write the implementation**

Create `src/lib/seasonal/offer.ts`:

```ts
/**
 * Seasonal offers (docs/superpowers/specs/2026-11-23-seasonal-offers-design.md). Pure helpers.
 * An offer is live until the end of its last day in the studio time zone; `null` = no end date.
 */
import { fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";
import { studioDateKey } from "@/lib/dates";

/** Slug of the service whose packages are the seasonal offers (admins create it once). */
export const SEASONAL_SERVICE_SLUG = "seasonal";

/** A Date, or the ISO string it becomes after a trip through `unstable_cache`. */
type OfferEnd = Date | string | null | undefined;

/** "2026-12-25" (as picked in admin) → the last millisecond of that day in studio time. */
export function offerEndFromDateKey(dateKey: string): Date {
  return fromZonedTime(`${dateKey}T23:59:59.999`, siteConfig.timezone);
}

/** The studio-local day an offer ends on, as "yyyy-MM-dd" (for the admin form and list). */
export function offerEndDateKey(endsAt: Date | string): string {
  return studioDateKey(endsAt);
}

export function isOfferLive(endsAt: OfferEnd, now: Date = new Date()): boolean {
  if (endsAt === null || endsAt === undefined) return true;
  return now.getTime() <= new Date(endsAt).getTime();
}

/** Drops items whose offer has ended. Applied after cached reads so expiry is never late. */
export function filterLive<T extends { offerEndsAt: OfferEnd }>(
  items: readonly T[],
  now: Date = new Date(),
): T[] {
  return items.filter((item) => isOfferLive(item.offerEndsAt, now));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/unit/seasonal-offer.test.ts`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/seasonal/offer.ts tests/unit/seasonal-offer.test.ts
git commit -m "feat(seasonal): offer end-date helpers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Database columns

**Files:**
- Modify: `prisma/schema.prisma` (model `Package`, after `basePriceCents Int`)
- Create: `prisma/migrations/20261123000000_seasonal_offers/migration.sql`

- [ ] **Step 1: Add the two fields to the schema**

In `prisma/schema.prisma`, in `model Package`, replace

```prisma
  basePriceCents   Int
  includedHours    Int
```

with

```prisma
  basePriceCents   Int
  /// Shown struck through next to basePriceCents when set. Display only: never charged.
  regularPriceCents Int?
  /// Last moment the package can be shown and booked (end of its last day, studio time). Null = no end.
  offerEndsAt      DateTime?
  includedHours    Int
```

Then run `pnpm prisma format` so the column alignment is normalised.

- [ ] **Step 2: Write the migration**

Create `prisma/migrations/20261123000000_seasonal_offers/migration.sql`:

```sql
-- Seasonal offers: optional strike-through price and offer end date on packages.
ALTER TABLE "Package" ADD COLUMN "regularPriceCents" INTEGER,
ADD COLUMN "offerEndsAt" TIMESTAMP(3);
```

- [ ] **Step 3: Apply it and regenerate the client**

Run: `pnpm db:deploy` then `pnpm db:generate`
Expected: `Applying migration 20261123000000_seasonal_offers`, then "Generated Prisma Client". (The generated client in `src/generated/` is git-ignored.)

- [ ] **Step 4: Verify the schema matches the migration**

Run: `pnpm prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
Expected: exit code 0 and "No difference detected".

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261123000000_seasonal_offers/migration.sql
git commit -m "feat(seasonal): package regular price and offer end date columns" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Admin form validation

**Files:**
- Modify: `src/lib/validators/admin/fields.ts` (append after `dollarsToCents`)
- Modify: `src/lib/validators/admin/package.ts`
- Test: `tests/unit/admin-package-schema.test.ts` (append inside the existing `describe("packageFormSchema", …)` block, or as a new `describe` at the end of the file)

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/admin-package-schema.test.ts` (it already defines `valid`, `errors` and imports `packageFormSchema`):

```ts
describe("packageFormSchema seasonal offer fields", () => {
  it("defaults both to null when left blank or missing", () => {
    expect(packageFormSchema.parse(valid)).toMatchObject({ regularPrice: null, offerEndsOn: null });
    expect(
      packageFormSchema.parse({ ...valid, regularPrice: "", offerEndsOn: "" }),
    ).toMatchObject({ regularPrice: null, offerEndsOn: null });
  });

  it("reads a regular price in dollars and an end date", () => {
    expect(
      packageFormSchema.parse({ ...valid, regularPrice: "$1,500", offerEndsOn: "2026-12-25" }),
    ).toMatchObject({ regularPrice: 150_000, offerEndsOn: "2026-12-25" });
  });

  it("requires the regular price to be higher than the starting price", () => {
    expect(errors({ ...valid, regularPrice: "1,250.50" }).regularPrice).toBe(
      "Must be higher than the starting price.",
    );
    expect(errors({ ...valid, regularPrice: "1,000" }).regularPrice).toBe(
      "Must be higher than the starting price.",
    );
    expect(errors({ ...valid, regularPrice: "1,250.51" }).regularPrice).toBeUndefined();
  });

  it("rejects unreadable prices and dates", () => {
    expect(errors({ ...valid, regularPrice: "lots" }).regularPrice).toBe(
      "Enter an amount like 350 or 1,200.50.",
    );
    expect(errors({ ...valid, regularPrice: "0" }).regularPrice).toBe(
      "Enter an amount like 350 or 1,200.50.",
    );
    expect(errors({ ...valid, offerEndsOn: "25/12/2026" }).offerEndsOn).toBe(
      "Enter a valid date.",
    );
    expect(errors({ ...valid, offerEndsOn: "2026-02-30" }).offerEndsOn).toBe(
      "Enter a valid date.",
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/admin-package-schema.test.ts`
Expected: the four new tests FAIL (`regularPrice` is `undefined`, no errors reported).

- [ ] **Step 3: Add the field parsers**

In `src/lib/validators/admin/fields.ts`, after the `dollarsToCents` export, add:

```ts
/** Optional dollars: blank → null; otherwise like `dollarsToCents`, but above zero. */
export const optionalDollarsToCents = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    try {
      const cents = toCents(value);
      if (cents > 0 && cents <= 100_000_000) return cents;
    } catch {
      // Reported below.
    }
    ctx.addIssue({ code: "custom", message: "Enter an amount like 350 or 1,200.50." });
    return z.NEVER;
  });

/** Optional calendar date from `<input type="date">`: blank → null, else the "yyyy-MM-dd" text. */
export const optionalDateKey = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00Z`);
    const real =
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(date.getTime()) &&
      date.toISOString().startsWith(value);
    if (real) return value;
    ctx.addIssue({ code: "custom", message: "Enter a valid date." });
    return z.NEVER;
  });
```

- [ ] **Step 4: Use them in the package schema**

In `src/lib/validators/admin/package.ts`:

1. Extend the import from `./fields`:

```ts
import {
  checkbox,
  dollarsToCents,
  integer,
  lines,
  optionalDateKey,
  optionalDollarsToCents,
  optionalInteger,
  optionalText,
  text,
} from "./fields";
```

2. In `packageFormSchema`, after the `basePrice: dollarsToCents,` line add:

```ts
  regularPrice: optionalDollarsToCents,
  offerEndsOn: optionalDateKey,
```

3. Change the end of the schema from `  sortOrder: integer(0, 1000),\n});` to:

```ts
  sortOrder: integer(0, 1000),
}).refine((form) => form.regularPrice === null || form.regularPrice > form.basePrice, {
  path: ["regularPrice"],
  message: "Must be higher than the starting price.",
});
```

(The schema is now `z.object({...}).refine(...)`. Keep the `export const packageFormSchema =` prefix and the doc comment above it unchanged.)

- [ ] **Step 5: Run to verify it passes**

Run: `pnpm vitest run tests/unit/admin-package-schema.test.ts`
Expected: PASS (new and existing tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/validators/admin/fields.ts src/lib/validators/admin/package.ts tests/unit/admin-package-schema.test.ts
git commit -m "feat(seasonal): validate regular price and offer end date" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Admin action, form and list

**Files:**
- Modify: `src/server/actions/admin/packages.ts`
- Modify: `src/server/queries/admin-packages.ts`
- Modify: `src/components/admin/package-form.tsx`
- Modify: `src/app/admin/(panel)/packages/(list)/page.tsx`

(Covered by the e2e spec in Task 9; no separate unit test because these are thin wiring.)

- [ ] **Step 1: Save the two fields in the action**

In `src/server/actions/admin/packages.ts`:

1. Add the import (after `import { tierKeyFor } from "@/lib/pricing/options";`):

```ts
import { offerEndDateKey, offerEndFromDateKey } from "@/lib/seasonal/offer";
```

2. Replace

```ts
  const { basePrice, category, faqs, tiers, ...rest } = parsed.data;
  const data = {
    ...rest,
    category: category,
    basePriceCents: basePrice,
    faqs: faqs as Prisma.InputJsonValue,
  };
```

with

```ts
  const { basePrice, regularPrice, offerEndsOn, category, faqs, tiers, ...rest } = parsed.data;
  const data = {
    ...rest,
    category: category,
    basePriceCents: basePrice,
    regularPriceCents: regularPrice,
    offerEndsAt: offerEndsOn ? offerEndFromDateKey(offerEndsOn) : null,
    faqs: faqs as Prisma.InputJsonValue,
  };
```

3. In the `describeChanges(before, data, { … })` field map, after the `basePriceCents` entry add:

```ts
              regularPriceCents: {
                label: "regular price",
                format: (value) =>
                  value === null ? "none" : formatCAD(Number(value), "en", { suffix: false }),
              },
              offerEndsAt: {
                label: "offer ends",
                format: (value) => (value ? offerEndDateKey(value as Date) : "none"),
              },
```

- [ ] **Step 2: Form defaults and list select**

In `src/server/queries/admin-packages.ts`:

1. In `listPackagesForAdmin`'s `select`, after `basePriceCents: true,` add `offerEndsAt: true,`.
2. In `EMPTY_PACKAGE`, after `basePrice: "",` add:

```ts
  regularPrice: "",
  offerEndsOn: "",
```

3. Add the import `import { offerEndDateKey } from "@/lib/seasonal/offer";` (after the `@/lib/db` import) and, in `getPackageFormDefaults`'s returned object, after the `basePrice: …` line add:

```ts
    regularPrice: pkg.regularPriceCents === null ? "" : (pkg.regularPriceCents / 100).toFixed(2),
    offerEndsOn: pkg.offerEndsAt ? offerEndDateKey(pkg.offerEndsAt) : "",
```

- [ ] **Step 3: Form type and "Offer" fieldset**

In `src/components/admin/package-form.tsx`:

1. In `PackageFormDefaults`, after `basePrice: string;` add:

```ts
  regularPrice: string;
  offerEndsOn: string;
```

2. Insert a new fieldset directly after the closing `</fieldset>` of "Price and coverage" (just before `<PackageTiersEditor …/>`):

```tsx
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="mb-3 text-lg font-medium">Offer</legend>
        <p className="text-muted-foreground text-sm sm:col-span-2 lg:col-span-4">
          Optional, for seasonal or limited-time packages. The starting price above is what clients
          pay.
        </p>
        <Field
          error={errors.regularPrice}
          name="regularPrice"
          label="Regular price (CAD)"
          hint="Shown struck through next to the starting price, e.g. 350"
        >
          <input
            {...field("regularPrice")}
            inputMode="decimal"
            defaultValue={defaults.regularPrice}
            className={adminFieldClass}
          />
        </Field>
        <Field
          error={errors.offerEndsOn}
          name="offerEndsOn"
          label="Offer ends on"
          hint="Last day it can be booked (Toronto time). Blank = no end date."
        >
          <input
            {...field("offerEndsOn")}
            type="date"
            defaultValue={defaults.offerEndsOn}
            className={adminFieldClass}
          />
        </Field>
      </fieldset>
```

- [ ] **Step 4: Show the end date in the admin list**

In `src/app/admin/(panel)/packages/(list)/page.tsx`:

1. Add the import `import { isOfferLive, offerEndDateKey } from "@/lib/seasonal/offer";` after the `@/lib/pricing/options` import.
2. In the Name cell, directly after the `<span className="text-muted-foreground block font-mono text-xs">{pkg.slug}</span>` element, add:

```tsx
                    {pkg.offerEndsAt && (
                      <span className="text-muted-foreground block text-xs">
                        {isOfferLive(pkg.offerEndsAt)
                          ? `Offer ends ${offerEndDateKey(pkg.offerEndsAt)}`
                          : "Offer expired"}
                      </span>
                    )}
```

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/server/actions/admin/packages.ts src/server/queries/admin-packages.ts src/components/admin/package-form.tsx "src/app/admin/(panel)/packages/(list)/page.tsx"
git commit -m "feat(seasonal): edit regular price and offer end date in admin" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Public queries hide expired offers

**Files:**
- Modify: `src/server/queries/packages.ts`
- Modify: `src/server/queries/pricing.ts` (full replacement below)
- Create: `src/server/queries/seasonal.ts`

`unstable_cache` stores JSON, so `offerEndsAt` comes back as an ISO string; `isOfferLive` accepts both. The cached read stays cached (hourly + tags); the live filter runs on every call after it.

- [ ] **Step 1: Packages queries**

In `src/server/queries/packages.ts`:

1. Add after `import { db } from "@/lib/db";`:

```ts
import { filterLive, isOfferLive } from "@/lib/seasonal/offer";
```

2. Replace `export const getActivePackages = unstable_cache(` with `const readActivePackages = unstable_cache(`.

3. In that query's top-level `select`, replace

```ts
        summaryFr: true,
        basePriceCents: true,
        includedHours: true,
```

with

```ts
        summaryFr: true,
        basePriceCents: true,
        regularPriceCents: true,
        offerEndsAt: true,
        includedHours: true,
```

4. Replace

```ts
  ["packages:active"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

export type PackageSummary
```

with

```ts
  ["packages:active"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** Active packages whose offer (if any) has not ended. The live check runs after the cache. */
export async function getActivePackages() {
  return filterLive(await readActivePackages());
}

export type PackageSummary
```

5. Replace `export const getPackageBySlug = unstable_cache(` with `const readPackageBySlug = unstable_cache(`.

6. Replace

```ts
  ["packages:by-slug"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

export type PackageDetail
```

with

```ts
  ["packages:by-slug"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** One live package, or null (inactive, unknown or offer ended → 404). */
export async function getPackageBySlug(slug: string) {
  const pkg = await readPackageBySlug(slug);
  return pkg && isOfferLive(pkg.offerEndsAt) ? pkg : null;
}

export type PackageDetail
```

- [ ] **Step 2: Pricing context**

Replace the whole of `src/server/queries/pricing.ts` with:

```ts
import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { pricedOptions } from "@/lib/pricing/options";
import { parsePricingRules } from "@/lib/pricing/rules";
import { filterLive } from "@/lib/seasonal/offer";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

const readPricingData = unstable_cache(
  async () => {
    const [packages, addOns, ruleRows, taxRates] = await Promise.all([
      db.package.findMany({
        where: { isActive: true, service: { archivedAt: null } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          category: true,
          name: true,
          nameFr: true,
          basePriceCents: true,
          offerEndsAt: true,
          includedHours: true,
          includedShooters: true,
          tiers: {
            orderBy: [{ sortOrder: "asc" }, { basePriceCents: "asc" }],
            select: {
              key: true,
              name: true,
              nameFr: true,
              basePriceCents: true,
              includedHours: true,
              includedShooters: true,
            },
          },
        },
      }),
      db.addOn.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          code: true,
          name: true,
          nameFr: true,
          priceCents: true,
          unit: true,
          services: { where: { archivedAt: null }, select: { slug: true } },
        },
      }),
      db.pricingRule.findMany({ select: { key: true, value: true } }),
      db.taxRate.findMany(),
    ]);

    return {
      packages,
      addOns: addOns.map(({ services, ...addOn }) => ({
        ...addOn,
        categories: services.map((service) => service.slug),
      })),
      rules: parsePricingRules(ruleRows),
      quoteValidDays: Number(ruleRows.find((row) => row.key === "QUOTE_VALID_DAYS")?.value ?? 14),
      // Decimal → string so it can be passed to the client.
      taxRates: taxRates.map((rate) => ({
        province: rate.province,
        gst: rate.gst.toString(),
        pst: rate.pst.toString(),
        hst: rate.hst.toString(),
        label: rate.label,
      })),
    };
  },
  ["pricing:data"],
  {
    tags: [CACHE_TAGS.packages, CACHE_TAGS.settings, CACHE_TAGS.services],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

/**
 * Everything the quote engine needs, serializable for the browser's live estimate and reused
 * by the server action as the source of truth (AGENTS.md §6.5, §8.1). Offers that have ended
 * are dropped here, after the cache, so they cannot be priced or booked once they are over.
 */
export async function getPricingContext(now: Date = new Date()) {
  const data = await readPricingData();
  return {
    ...data,
    // One option per package, or per tier for packages with tiers (lib/pricing/options.ts).
    packages: pricedOptions(filterLive(data.packages, now)),
  };
}

export type PricingContext = Awaited<ReturnType<typeof getPricingContext>>;
```

- [ ] **Step 3: Seasonal offers query**

Create `src/server/queries/seasonal.ts`:

```ts
import "server-only";

import { SEASONAL_SERVICE_SLUG } from "@/lib/seasonal/offer";
import { getActivePackages } from "@/server/queries/packages";
import { getPricingContext } from "@/server/queries/pricing";
import { getServices } from "@/server/queries/services";

/**
 * The live seasonal offers: the `seasonal` service, its live packages and its add-ons, or
 * `null` when the service is missing/archived or has no live package. `null` is what hides
 * the home strip and 404s /seasonal.
 */
export async function getSeasonalOffers() {
  const [services, packages, context] = await Promise.all([
    getServices(),
    getActivePackages(),
    getPricingContext(),
  ]);
  const service = services.find((row) => row.slug === SEASONAL_SERVICE_SLUG && row.active);
  const live = packages.filter((pkg) => pkg.category === SEASONAL_SERVICE_SLUG);
  if (!service || live.length === 0) return null;
  return {
    service,
    packages: live,
    addOns: context.addOns.filter((addOn) => addOn.categories.includes(SEASONAL_SERVICE_SLUG)),
  };
}

export type SeasonalOffers = NonNullable<Awaited<ReturnType<typeof getSeasonalOffers>>>;
```

- [ ] **Step 4: Typecheck and run the unit suite**

Run: `pnpm typecheck && pnpm test`
Expected: PASS. If `pricedOptions(filterLive(...))` complains about the extra `offerEndsAt` property, widen nothing: the extra property is structurally allowed; a failure there means a typo in the select above.

- [ ] **Step 5: Commit**

```bash
git add src/server/queries/packages.ts src/server/queries/pricing.ts src/server/queries/seasonal.ts
git commit -m "feat(seasonal): hide ended offers from site and pricing context" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Messages, card components and the home strip

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`
- Create: `src/components/seasonal/seasonal-title.tsx`, `src/components/seasonal/seasonal-offer-card.tsx`, `src/components/seasonal/seasonal-offer-grid.tsx`, `src/components/site/seasonal-booking-strip.tsx`
- Modify: `src/app/[locale]/(site)/page.tsx`

- [ ] **Step 1: Add the `Seasonal` messages**

In `messages/en.json`, insert before the line `  "Packages": {` (the top-level key; it is unique):

```json
  "Seasonal": {
    "metaTitle": "Seasonal offers",
    "metaDescription": "Limited-time seasonal photoshoot packages for couples, families and small events, with offer prices and online booking.",
    "eyebrow": "Limited seasonal offer",
    "viewAll": "See all seasonal offers",
    "book": "Book this session",
    "offerBadge": "Offer",
    "regularPrice": "Regular price",
    "endsOn": "Offer ends {date}",
    "addOnsTitle": "Add-ons",
    "addOnsIntro": "Add these to any seasonal session.",
    "ribbonTitle": "Limited booking slots available",
    "ribbonBody": "Book your date and confirm your preferred time.",
    "contactLead": "Questions? Reach us:"
  },
```

In `messages/fr.json`, insert the same block before its `  "Packages": {`:

```json
  "Seasonal": {
    "metaTitle": "Offres saisonnières",
    "metaDescription": "Forfaits photo saisonniers à durée limitée pour couples, familles et petits événements, avec tarifs promotionnels et réservation en ligne.",
    "eyebrow": "Offre saisonnière limitée",
    "viewAll": "Voir toutes les offres saisonnières",
    "book": "Réserver cette séance",
    "offerBadge": "Offre",
    "regularPrice": "Prix régulier",
    "endsOn": "L’offre se termine le {date}",
    "addOnsTitle": "Options",
    "addOnsIntro": "Ajoutez-les à n’importe quelle séance saisonnière.",
    "ribbonTitle": "Places de réservation limitées",
    "ribbonBody": "Réservez votre date et confirmez l’heure souhaitée.",
    "contactLead": "Des questions ? Joignez-nous :"
  },
```

Run: `pnpm vitest run tests/unit/messages.test.ts`
Expected: PASS (same keys in both languages, no empties).

- [ ] **Step 2: Title component**

Create `src/components/seasonal/seasonal-title.tsx`:

```tsx
import { Accent } from "@/components/site/section-heading";

/** The season's service name with its last word in the gold italic accent. */
export function SeasonalTitle({ name }: { name: string }) {
  const split = name.lastIndexOf(" ");
  if (split < 0) return <Accent>{name}</Accent>;
  return (
    <>
      {name.slice(0, split + 1)}
      <Accent>{name.slice(split + 1)}</Accent>
    </>
  );
}
```

- [ ] **Step 3: Offer card**

Create `src/components/seasonal/seasonal-offer-card.tsx`:

```tsx
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { formatCAD } from "@/lib/money";
import { cn } from "@/lib/utils";

const MAX_INCLUSIONS = 5;

export type SeasonalOfferCardProps = {
  headingId: string;
  packageSlug: string;
  name: string;
  summary: string;
  priceCents: number;
  /** True when the package has options, so the price shown is its cheapest option. */
  startingAt: boolean;
  /** Struck-through price; null when there is no offer discount to show. */
  regularPriceCents: number | null;
  hours: number | null;
  editedImages: number | null;
  inclusions: string[];
  /** Already formatted, e.g. "December 25, 2026"; null when the offer has no end date. */
  endsOn: string | null;
  locale: Locale;
};

/** One seasonal offer: price, struck-through regular price, key facts and a Book button. */
export function SeasonalOfferCard({
  headingId,
  packageSlug,
  name,
  summary,
  priceCents,
  startingAt,
  regularPriceCents,
  hours,
  editedImages,
  inclusions,
  endsOn,
  locale,
}: SeasonalOfferCardProps) {
  const t = useTranslations();
  const facts = [
    hours !== null && t("Packages.hours", { count: hours }),
    editedImages !== null && t("Packages.editedImages", { count: editedImages }),
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <article
      aria-labelledby={headingId}
      className="bg-card text-card-foreground hover:border-gold relative flex h-full flex-col rounded-xl border p-6 shadow-sm transition-colors"
    >
      {regularPriceCents !== null && (
        <span className="bg-gold-button absolute top-4 right-4 rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold tracking-[0.15em] uppercase">
          {t("Seasonal.offerBadge")}
        </span>
      )}
      <h3 id={headingId} className="pr-16 text-2xl">
        {name}
      </h3>
      <p className="text-muted-foreground mt-2 text-sm">{summary}</p>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-3">
        {startingAt && (
          <span className="text-muted-foreground w-full text-xs tracking-[0.15em] uppercase">
            {t("PackageDetail.startingAt")}
          </span>
        )}
        <span className="font-heading text-4xl lining-nums">{formatCAD(priceCents, locale)}</span>
        {regularPriceCents !== null && (
          <s className="text-muted-foreground text-lg">
            <span className="sr-only">{t("Seasonal.regularPrice")}: </span>
            {formatCAD(regularPriceCents, locale, { suffix: false })}
          </s>
        )}
      </p>

      {facts.length > 0 && <p className="text-muted-foreground mt-2 text-sm">{facts.join(" · ")}</p>}
      {inclusions.length > 0 && (
        <ul className="border-border mt-4 flex-1 space-y-2 border-t pt-4 text-sm">
          {inclusions.slice(0, MAX_INCLUSIONS).map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="text-gold-text mt-0.5 size-4 shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      )}
      {endsOn && (
        <p className="text-muted-foreground mt-4 text-xs">{t("Seasonal.endsOn", { date: endsOn })}</p>
      )}

      <Link
        href={{ pathname: "/book", query: { package: packageSlug } }}
        aria-describedby={headingId}
        className={cn(buttonVariants({ size: "cta" }), "mt-6")}
      >
        {t("Seasonal.book")}
      </Link>
    </article>
  );
}
```

- [ ] **Step 4: Offer grid**

Create `src/components/seasonal/seasonal-offer-grid.tsx`:

```tsx
import type { Locale } from "@/config/site";
import { formatInStudioTz } from "@/lib/dates";
import { localize } from "@/lib/localize";
import { startingPriceCents } from "@/lib/pricing/options";
import type { PackageSummary } from "@/server/queries/packages";

import { SeasonalOfferCard } from "./seasonal-offer-card";

/** Live seasonal packages as cards; one column on phones, as many as fit on wide screens. */
export function SeasonalOfferGrid({
  packages,
  locale,
  withInclusions = false,
}: {
  packages: readonly PackageSummary[];
  locale: Locale;
  withInclusions?: boolean;
}) {
  return (
    <ul className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr))]">
      {packages.map((pkg) => {
        const tiered = pkg.tiers.length > 0;
        return (
          <li key={pkg.id}>
            <SeasonalOfferCard
              headingId={`seasonal-${pkg.slug}`}
              packageSlug={pkg.slug}
              name={localize(pkg.name, pkg.nameFr, locale)}
              summary={localize(pkg.summary, pkg.summaryFr, locale)}
              priceCents={startingPriceCents(pkg)}
              startingAt={tiered}
              regularPriceCents={tiered ? null : pkg.regularPriceCents}
              hours={tiered ? null : pkg.includedHours}
              editedImages={tiered ? null : pkg.editedImages}
              inclusions={
                withInclusions
                  ? localize(pkg.inclusions, pkg.inclusionsFr.length ? pkg.inclusionsFr : null, locale)
                  : []
              }
              endsOn={pkg.offerEndsAt ? formatInStudioTz(pkg.offerEndsAt, "PPP", locale) : null}
              locale={locale}
            />
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 5: Home strip**

Create `src/components/site/seasonal-booking-strip.tsx`:

```tsx
import { getLocale, getTranslations } from "next-intl/server";

import { SeasonalOfferGrid } from "@/components/seasonal/seasonal-offer-grid";
import { SeasonalTitle } from "@/components/seasonal/seasonal-title";
import type { Locale } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { localize } from "@/lib/localize";
import { getSeasonalOffers } from "@/server/queries/seasonal";

import { SectionHeading } from "./section-heading";

/**
 * Home section right after the hero: the live seasonal offers with a Book button each.
 * Renders nothing when no seasonal package is live, so it never shows an empty or ended offer.
 */
export async function SeasonalBookingStrip() {
  const offers = await getSeasonalOffers();
  if (!offers) return null;

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Seasonal");
  const name = localize(offers.service.name, offers.service.nameFr, locale);
  const intro = localize(offers.service.description, offers.service.descriptionFr, locale);

  return (
    <section
      aria-labelledby="seasonal-title"
      className="mx-auto max-w-7xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-16"
    >
      <SectionHeading
        id="seasonal-title"
        align="center"
        eyebrow={t("eyebrow")}
        title={<SeasonalTitle name={name} />}
        intro={intro}
        className="mb-10"
      />
      <SeasonalOfferGrid packages={offers.packages} locale={locale} />
      <p className="mt-8 text-center">
        <Link href="/seasonal" className="text-gold-text text-sm underline-offset-4 hover:underline">
          {t("viewAll")}
        </Link>
      </p>
    </section>
  );
}
```

- [ ] **Step 6: Place it directly after the hero**

In `src/app/[locale]/(site)/page.tsx`, add the import (alphabetical, after `ReviewsCarousel`):

```tsx
import { SeasonalBookingStrip } from "@/components/site/seasonal-booking-strip";
```

and change

```tsx
      <HomeHero />
      <HomeIntro />
```

to

```tsx
      <HomeHero />
      <SeasonalBookingStrip />
      <HomeIntro />
```

- [ ] **Step 7: Verify**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS. (If ESLint's import-order rule reorders imports, run `pnpm lint --fix`.)

- [ ] **Step 8: Commit**

```bash
git add messages/en.json messages/fr.json src/components/seasonal src/components/site/seasonal-booking-strip.tsx "src/app/[locale]/(site)/page.tsx"
git commit -m "feat(seasonal): home booking strip after the hero" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: `/seasonal` page and sitemap

**Files:**
- Create: `src/app/[locale]/(site)/seasonal/page.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: The page**

Create `src/app/[locale]/(site)/seasonal/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { SeasonalOfferGrid } from "@/components/seasonal/seasonal-offer-grid";
import { SeasonalTitle } from "@/components/seasonal/seasonal-title";
import { JsonLd } from "@/components/site/json-ld";
import { ctaNav } from "@/components/site/nav-items";
import { SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { isPricingConfirmed } from "@/lib/flags";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { startingPriceCents } from "@/lib/pricing/options";
import { serviceJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getSeasonalOffers } from "@/server/queries/seasonal";

// Offers end on a date, so the live check must re-run regularly (queries are cached and tagged).
export const revalidate = 3600;

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seasonal" });
  return pageMetadata({
    locale,
    path: "/seasonal",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Flyer-style landing page for the live seasonal offers; 404 when none is live. */
export default async function SeasonalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [offers, t, packagesT, navT] = await Promise.all([
    getSeasonalOffers(),
    getTranslations("Seasonal"),
    getTranslations("Packages"),
    getTranslations("Nav"),
  ]);
  if (!offers) notFound();

  const name = localize(offers.service.name, offers.service.nameFr, locale);
  const intro = localize(offers.service.description, offers.service.descriptionFr, locale);
  const unitLabel = { FLAT: "", PER_HOUR: "/ h", PER_ITEM: "/ item" };
  const phone = siteConfig.contact.phones[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      {offers.packages.map((pkg) => (
        <JsonLd
          key={pkg.id}
          data={serviceJsonLd({
            baseUrl: siteConfig.url,
            locale,
            pricingConfirmed: isPricingConfirmed(),
            pkg: {
              slug: pkg.slug,
              name: localize(pkg.name, pkg.nameFr, locale),
              description: localize(pkg.summary, pkg.summaryFr, locale),
              category: name,
              basePriceCents: startingPriceCents(pkg),
            },
          })}
        />
      ))}

      <SectionHeading
        as="h1"
        align="center"
        eyebrow={t("eyebrow")}
        title={<SeasonalTitle name={name} />}
        intro={intro}
      />

      <div className="mt-12">
        <SeasonalOfferGrid packages={offers.packages} locale={locale} withInclusions />
      </div>

      {offers.addOns.length > 0 && (
        <section aria-labelledby="seasonal-addons" className="mx-auto mt-16 max-w-2xl">
          <h2 id="seasonal-addons" className="text-center text-3xl">
            {t("addOnsTitle")}
          </h2>
          <p className="text-muted-foreground mt-2 text-center text-sm">{t("addOnsIntro")}</p>
          <ul className="divide-border mt-6 divide-y rounded-xl border">
            {offers.addOns.map((addOn) => (
              <li key={addOn.code} className="flex items-center justify-between gap-4 px-5 py-3">
                <span>{localize(addOn.name, addOn.nameFr, locale)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatCAD(addOn.priceCents, locale, { suffix: false })} {unitLabel[addOn.unit]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="seasonal-book"
        className="bg-ink text-paper mt-16 rounded-2xl px-6 py-10 text-center sm:px-12"
      >
        <h2 id="seasonal-book" className="text-3xl">
          {t("ribbonTitle")}
        </h2>
        <p className="text-paper/80 mx-auto mt-3 max-w-xl">{t("ribbonBody")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={ctaNav.book.href} className={cn(buttonVariants({ size: "cta" }))}>
            {navT("bookDate")}
          </Link>
          <Link
            href={ctaNav.quote.href}
            className={cn(
              buttonVariants({ variant: "outline", size: "cta" }),
              "border-paper/50 text-paper hover:bg-paper hover:text-ink bg-transparent dark:bg-transparent",
            )}
          >
            {navT("getQuote")}
          </Link>
        </div>
      </section>

      <p className="text-muted-foreground mt-10 text-center text-sm">
        {t("contactLead")}{" "}
        <a className="hover:text-foreground underline" href={`mailto:${siteConfig.contact.email}`}>
          {siteConfig.contact.email}
        </a>
        {phone && (
          <>
            {" · "}
            <a className="hover:text-foreground underline" href={`tel:${phone.tel}`}>
              {phone.display}
            </a>
          </>
        )}
        {siteConfig.socials.instagram && (
          <>
            {" · "}
            <a
              className="hover:text-foreground underline"
              href={siteConfig.socials.instagram}
              rel="noopener noreferrer"
            >
              Instagram
            </a>
          </>
        )}
      </p>
      <p className="text-muted-foreground mt-6 text-center text-xs">{packagesT("taxNote")}</p>
    </div>
  );
}
```

- [ ] **Step 2: Sitemap entry only while live**

In `src/app/sitemap.ts`:

1. Add `import { getSeasonalOffers } from "@/server/queries/seasonal";` after the `getPublishedProjects` import.
2. Replace

```ts
  const [packages, projects] = await Promise.all([getActivePackages(), getPublishedProjects()]);
  return [
    ...STATIC_PATHS.map((path) => entry(path, path === "" ? 1 : 0.7)),
```

with

```ts
  const [packages, projects, seasonal] = await Promise.all([
    getActivePackages(),
    getPublishedProjects(),
    getSeasonalOffers(),
  ]);
  return [
    ...STATIC_PATHS.map((path) => entry(path, path === "" ? 1 : 0.7)),
    // The seasonal page exists only while an offer is live.
    ...(seasonal ? [entry("/seasonal", 0.8)] : []),
```

- [ ] **Step 3: Verify**

Run: `pnpm lint && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(site)/seasonal/page.tsx" src/app/sitemap.ts
git commit -m "feat(seasonal): flyer-style /seasonal page" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Optional flyer content (`pnpm db:seed:seasonal`)

**Files:**
- Create: `prisma/seasonal-data.ts`, `prisma/seed-seasonal.ts`
- Modify: `package.json` (scripts)
- Test: `tests/unit/seasonal-data.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/seasonal-data.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { SEASONAL_SERVICE_SLUG } from "@/lib/seasonal/offer";

import { seasonalAddOns, seasonalPackages, seasonalService } from "../../prisma/seasonal-data";

describe("seasonal flyer data", () => {
  it("uses the flyer's offer and regular prices in whole cents", () => {
    const prices = Object.fromEntries(
      seasonalPackages.map((pkg) => [pkg.slug, [pkg.basePriceCents, pkg.regularPriceCents]]),
    );
    expect(prices).toEqual({
      "seasonal-mini-session": [25_000, 35_000],
      "seasonal-classic-session": [40_000, 55_000],
      "seasonal-premium-session": [65_000, 85_000],
      "seasonal-event-coverage": [75_000, null],
    });
  });

  it("prices every offer below its regular price", () => {
    for (const pkg of seasonalPackages) {
      if (pkg.regularPriceCents !== null) {
        expect(pkg.regularPriceCents, pkg.slug).toBeGreaterThan(pkg.basePriceCents);
      }
    }
  });

  it("stores the hour ranges as their upper end rounded up", () => {
    const hours = Object.fromEntries(seasonalPackages.map((pkg) => [pkg.slug, pkg.includedHours]));
    expect(hours).toEqual({
      "seasonal-mini-session": 2,
      "seasonal-classic-session": 3,
      "seasonal-premium-session": 5,
      "seasonal-event-coverage": 8,
    });
  });

  it("belongs to the seasonal service", () => {
    expect(seasonalService.slug).toBe(SEASONAL_SERVICE_SLUG);
    for (const pkg of seasonalPackages) expect(pkg.category).toBe(SEASONAL_SERVICE_SLUG);
    for (const addOn of seasonalAddOns) expect(addOn.categories).toEqual([SEASONAL_SERVICE_SLUG]);
  });

  it("has the flyer's three add-ons", () => {
    expect(
      Object.fromEntries(seasonalAddOns.map((addOn) => [addOn.code, [addOn.priceCents, addOn.unit]])),
    ).toEqual({
      SEASONAL_FRAME: [8_500, "PER_ITEM"],
      SEASONAL_REELS: [35_000, "FLAT"],
      SEASONAL_RETOUCH: [2_000, "PER_ITEM"],
    });
  });

  it("has French text and unique slugs and codes", () => {
    expect(seasonalService.nameFr && seasonalService.descriptionFr).toBeTruthy();
    for (const pkg of seasonalPackages) {
      expect(pkg.nameFr && pkg.summaryFr && pkg.descriptionFr, pkg.slug).toBeTruthy();
      expect(pkg.inclusionsFr).toHaveLength(pkg.inclusions.length);
    }
    for (const addOn of seasonalAddOns) expect(addOn.nameFr.trim(), addOn.code).toBeTruthy();
    expect(new Set(seasonalPackages.map((pkg) => pkg.slug)).size).toBe(seasonalPackages.length);
    expect(new Set(seasonalAddOns.map((addOn) => addOn.code)).size).toBe(seasonalAddOns.length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/seasonal-data.test.ts`
Expected: FAIL (cannot resolve `prisma/seasonal-data`).

- [ ] **Step 3: The data**

Create `prisma/seasonal-data.ts`:

```ts
/**
 * Seasonal offers from the owner's flyer "Christmas & Season Photoshoot & Family Photoshoot"
 * (2026-11). Optional one-off: `pnpm db:seed:seasonal` creates what is missing and never
 * overwrites edits. The owner can equally build all of this in Admin → Services, Packages and
 * Add-ons. Hour ranges are stored as their upper end rounded up (see seed-data.ts).
 *
 * TODO(owner-fr): review — all French (`*Fr`) text was drafted by an agent.
 */
import type { AddOnSeed, PackageSeed } from "./seed-data";

const dollars = (amount: number) => Math.round(amount * 100);

export type SeasonalPackageSeed = Omit<PackageSeed, "tiers"> & {
  /** Struck-through price on the offer card; null = no discount shown. */
  regularPriceCents: number | null;
};

export const seasonalService = {
  slug: "seasonal",
  name: "Christmas & Seasonal Photoshoots",
  nameFr: "Séances photo de Noël et de saison",
  description:
    "Couple, family and small-event photoshoots with limited-time seasonal offers. Indoor and outdoor sessions available.",
  descriptionFr:
    "Séances photo en couple, en famille et petits événements à tarifs saisonniers limités. Séances en intérieur et en extérieur offertes.",
  sortOrder: 6,
};

const SESSION_NOTE =
  " Indoor and outdoor photoshoots available; couples, children and full family sessions are welcome.";
const SESSION_NOTE_FR =
  " Séances en intérieur et en extérieur offertes; couples, enfants et familles complètes bienvenus.";

export const seasonalPackages: SeasonalPackageSeed[] = [
  {
    slug: "seasonal-mini-session",
    category: "seasonal",
    name: "Mini Session",
    nameFr: "Mini séance",
    summary: "Per couple shoot, family shoot or small event. 1 to 1.5 hours.",
    summaryFr: "Par séance de couple, de famille ou petit événement. 1 à 1,5 heure.",
    description: `A short, relaxed seasonal session for a couple or a family, or coverage of a small event. 15 colour-graded and edited photos.${SESSION_NOTE}`,
    descriptionFr: `Une courte séance saisonnière détendue pour un couple ou une famille, ou la couverture d'un petit événement. 15 photos étalonnées et retouchées.${SESSION_NOTE_FR}`,
    basePriceCents: dollars(250),
    regularPriceCents: dollars(350),
    includedHours: 2,
    includedShooters: 1,
    editedImages: 15,
    turnaroundDays: null,
    inclusions: [
      "1 to 1.5 hours of coverage",
      "15 colour-graded and edited photos",
      "Indoor or outdoor session",
    ],
    inclusionsFr: [
      "1 à 1,5 heure de couverture",
      "15 photos étalonnées et retouchées",
      "Séance en intérieur ou en extérieur",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 1,
  },
  {
    slug: "seasonal-classic-session",
    category: "seasonal",
    name: "Classic Session",
    nameFr: "Séance classique",
    summary: "Per couple shoot, family shoot or small event. 2 to 3 hours.",
    summaryFr: "Par séance de couple, de famille ou petit événement. 2 à 3 heures.",
    description: `More time and more photos for a couple, a family or a small event. 35 colour-graded and edited photos.${SESSION_NOTE}`,
    descriptionFr: `Plus de temps et plus de photos pour un couple, une famille ou un petit événement. 35 photos étalonnées et retouchées.${SESSION_NOTE_FR}`,
    basePriceCents: dollars(400),
    regularPriceCents: dollars(550),
    includedHours: 3,
    includedShooters: 1,
    editedImages: 35,
    turnaroundDays: null,
    inclusions: [
      "2 to 3 hours of coverage",
      "35 colour-graded and edited photos",
      "Indoor or outdoor session",
    ],
    inclusionsFr: [
      "2 à 3 heures de couverture",
      "35 photos étalonnées et retouchées",
      "Séance en intérieur ou en extérieur",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 2,
  },
  {
    slug: "seasonal-premium-session",
    category: "seasonal",
    name: "Premium Session",
    nameFr: "Séance prestige",
    summary: "Per couple shoot, family shoot or small event. 4 to 5 hours.",
    summaryFr: "Par séance de couple, de famille ou petit événement. 4 à 5 heures.",
    description: `Our fullest seasonal session, with high-end retouching on your favourite photos. 60+ colour-graded and edited photos, 20 of them high-end retouched.${SESSION_NOTE}`,
    descriptionFr: `Notre séance saisonnière la plus complète, avec retouche haut de gamme sur vos photos préférées. Plus de 60 photos étalonnées et retouchées, dont 20 retouchées haut de gamme.${SESSION_NOTE_FR}`,
    basePriceCents: dollars(650),
    regularPriceCents: dollars(850),
    includedHours: 5,
    includedShooters: 1,
    editedImages: 60,
    turnaroundDays: null,
    inclusions: [
      "4 to 5 hours of coverage",
      "60+ colour-graded and edited photos",
      "20 high-end retouched photos",
      "Indoor or outdoor session",
    ],
    inclusionsFr: [
      "4 à 5 heures de couverture",
      "Plus de 60 photos étalonnées et retouchées",
      "20 photos retouchées haut de gamme",
      "Séance en intérieur ou en extérieur",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 3,
  },
  {
    slug: "seasonal-event-coverage",
    category: "seasonal",
    name: "Event Coverage",
    nameFr: "Couverture d'événement",
    summary: "Any Christmas party or event: church events, corporate parties and year-end parties.",
    summaryFr:
      "Toute fête de Noël ou tout événement : événements religieux, fêtes d'entreprise et fêtes de fin d'année.",
    description:
      "Full coverage of your Christmas party or event, from arrival to the last toast. All event photos get basic colour correction and are delivered fast.",
    descriptionFr:
      "Couverture complète de votre fête de Noël ou de votre événement, de l'arrivée au dernier toast. Toutes les photos reçoivent une correction des couleurs de base et sont livrées rapidement.",
    basePriceCents: dollars(750),
    regularPriceCents: null,
    includedHours: 8,
    includedShooters: 1,
    editedImages: null,
    turnaroundDays: null,
    inclusions: [
      "Full coverage, 7 to 8 hours",
      "All event photos with basic colour correction",
      "Fast delivery",
      "Church events, corporate parties and year-end parties",
    ],
    inclusionsFr: [
      "Couverture complète, 7 à 8 heures",
      "Toutes les photos de l'événement avec correction des couleurs de base",
      "Livraison rapide",
      "Événements religieux, fêtes d'entreprise et fêtes de fin d'année",
    ],
    exclusions: [],
    exclusionsFr: [],
    sortOrder: 4,
  },
];

export const seasonalAddOns: AddOnSeed[] = [
  {
    code: "SEASONAL_FRAME",
    name: "10 × 15 inch printed frame",
    nameFr: "Cadre imprimé 10 × 15 po",
    priceCents: dollars(85),
    unit: "PER_ITEM",
    categories: ["seasonal"],
    sortOrder: 1,
  },
  {
    code: "SEASONAL_REELS",
    name: "Professional reels video",
    nameFr: "Vidéo de reels professionnelle",
    priceCents: dollars(350),
    unit: "FLAT",
    categories: ["seasonal"],
    sortOrder: 2,
  },
  {
    code: "SEASONAL_RETOUCH",
    name: "High-end photo retouching (per photo)",
    nameFr: "Retouche photo haut de gamme (par photo)",
    priceCents: dollars(20),
    unit: "PER_ITEM",
    categories: ["seasonal"],
    sortOrder: 3,
  },
];
```

- [ ] **Step 4: The script**

Create `prisma/seed-seasonal.ts`:

```ts
/**
 * Optional one-off (`pnpm db:seed:seasonal`): adds the flyer's seasonal service, packages and
 * add-ons. Create-only, like the main seed: anything that already exists (and anything the
 * owner edited in admin) is left alone. Data lives in ./seasonal-data.ts.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { seasonalAddOns, seasonalPackages, seasonalService } from "./seasonal-data";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  await db.service.upsert({
    where: { slug: seasonalService.slug },
    update: {},
    create: seasonalService,
  });

  for (const pkg of seasonalPackages) {
    await db.package.upsert({ where: { slug: pkg.slug }, update: {}, create: pkg });
  }

  for (const { categories, ...addOn } of seasonalAddOns) {
    await db.addOn.upsert({
      where: { code: addOn.code },
      update: {},
      create: {
        ...addOn,
        services: { connect: categories.map((slug) => ({ slug })) },
        packages: { connect: seasonalPackages.map((pkg) => ({ slug: pkg.slug })) },
      },
    });
  }
  console.info("Seasonal offers added (existing rows were left unchanged).");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
```

- [ ] **Step 5: Add the script**

In `package.json`, in `scripts`, after the `"db:seed": "prisma db seed",` line add:

```json
    "db:seed:seasonal": "tsx prisma/seed-seasonal.ts",
```

- [ ] **Step 6: Run to verify**

Run: `pnpm vitest run tests/unit/seasonal-data.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS. (If `tsconfig` does not include `prisma/*.ts`, the typecheck simply skips them; the unit test already type-checks the data through Vitest.)

- [ ] **Step 7: Commit**

```bash
git add prisma/seasonal-data.ts prisma/seed-seasonal.ts package.json tests/unit/seasonal-data.test.ts
git commit -m "feat(seasonal): optional flyer content seed" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: End-to-end test

**Files:**
- Create: `tests/e2e/seasonal.global.spec.ts`

`*.global.spec.ts` files run once in the `global` project, after all other specs (they change site-wide data). The test uses the admin UI for everything that changes data, so the cache tags are revalidated exactly as in real use, and it removes its own data through the UI.

- [ ] **Step 1: Write the spec**

Create `tests/e2e/seasonal.global.spec.ts`:

```ts
import { expect, type Page, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// "global" project: a seasonal service changes the home page for every other test.
const SERVICE_SLUG = "seasonal";
const SERVICE_NAME = "E2E Seasonal Offers";
const PACKAGE_SLUG = "e2e-seasonal-mini";
const PACKAGE_NAME = "E2E Mini Session";

async function deleteFixtures() {
  await queryDb(`delete from "Package" where slug = $1`, [PACKAGE_SLUG]);
  await queryDb(`delete from "Service" where slug = $1`, [SERVICE_SLUG]);
}

test.beforeEach(deleteFixtures);
test.afterEach(async ({}, testInfo) => {
  // Safety net if the test failed half way; a passing test already cleaned up through the UI.
  await deleteFixtures();
  await deleteAdmin(adminEmailFor(testInfo));
});

async function createService(page: Page) {
  await page.goto("/admin/services/new");
  await page.getByLabel("Name (English)").fill(SERVICE_NAME);
  await page.getByLabel("Name (French)").fill("Offres saisonnières E2E");
  await page.getByLabel("Description (English)").fill("Limited seasonal offers for the test.");
  await page.getByLabel("Web address").fill(SERVICE_SLUG);
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved. The site shows it now.");
}

async function createPackage(page: Page) {
  await page.goto("/admin/packages/new");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Slug").fill(PACKAGE_SLUG);
  await page.getByLabel("Service").selectOption(SERVICE_SLUG);
  await page.getByLabel("Name (English)").fill(PACKAGE_NAME);
  await page.getByLabel("Summary (English)").fill("Per couple shoot, family shoot or small event.");
  await page.getByLabel("Description (English)").fill("Created by an end-to-end test.");
  await page.getByLabel("Starting price (CAD)").fill("250");
  await page.getByLabel("Regular price (CAD)").fill("350");
  await page.getByLabel("Hours included").fill("2");
  await page.getByLabel("Edited images").fill("15");
  await page.getByRole("button", { name: "Save package" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved “${PACKAGE_SLUG}”`);
}

const strip = (page: Page) => page.getByRole("region", { name: SERVICE_NAME });

test("an admin creates a seasonal offer, it shows after the hero, and it hides when it ends", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  // Nothing seasonal yet: no strip, no page.
  await page.goto("/en");
  await expect(strip(page)).toHaveCount(0);
  const none = await page.goto("/en/seasonal");
  expect(none?.status()).toBe(404);

  // A service without packages still shows nothing.
  await createService(page);
  await page.goto("/en");
  await expect(strip(page)).toHaveCount(0);

  // First package: strip appears right after the hero.
  await createPackage(page);
  await page.goto("/en");
  await expect(strip(page)).toBeVisible();
  await expect(page.locator("main section").nth(1)).toHaveAccessibleName(SERVICE_NAME);
  const card = strip(page).getByRole("article", { name: PACKAGE_NAME });
  await expect(card).toContainText("$250.00 CAD");
  await expect(card.locator("s")).toContainText("$350.00");
  await expect(card).toContainText("Offer");
  await expect(card.getByRole("link", { name: "Book this session" })).toHaveAttribute(
    "href",
    `/en/book?package=${PACKAGE_SLUG}`,
  );

  // The French home page uses the French service name.
  await page.goto("/fr");
  await expect(page.getByRole("region", { name: "Offres saisonnières E2E" })).toBeVisible();

  // The landing page and the booking link work.
  await page.goto("/en/seasonal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(SERVICE_NAME);
  await expect(page.getByRole("article", { name: PACKAGE_NAME })).toBeVisible();
  await page.getByRole("link", { name: "Book this session" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/book\\?package=${PACKAGE_SLUG}$`));

  // Ending the offer (two days ago) hides it everywhere.
  const ended = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.goto("/admin/packages");
  await page.getByRole("link", { name: PACKAGE_NAME }).first().click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Offer ends on").fill(ended);
  await page.getByRole("button", { name: "Save package" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved “${PACKAGE_SLUG}”`);
  await expect(page.getByRole("row", { name: new RegExp(PACKAGE_NAME) })).toContainText(
    "Offer expired",
  );

  await page.goto("/en");
  await expect(strip(page)).toHaveCount(0);
  expect((await page.goto("/en/seasonal"))?.status()).toBe(404);
  expect((await page.goto(`/en/packages/${PACKAGE_SLUG}`))?.status()).toBe(404);

  // Clean up through the UI so the site caches are refreshed too.
  await page.goto("/admin/packages");
  const packageRow = page.getByRole("row").filter({ hasText: PACKAGE_NAME });
  await packageRow.getByRole("button", { name: `Delete ${PACKAGE_NAME}` }).click();
  await packageRow.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("row").filter({ hasText: PACKAGE_NAME })).toHaveCount(0);

  await page.goto("/admin/services");
  const serviceRow = page.getByRole("row").filter({ hasText: SERVICE_NAME });
  await serviceRow.getByRole("button", { name: `Delete ${SERVICE_NAME}` }).click();
  await serviceRow.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("row").filter({ hasText: SERVICE_NAME })).toHaveCount(0);
});
```

- [ ] **Step 2: Run the spec**

Check no other session is using port 3100 or `.next-e2e` (see the parallel-sessions memory), then run:

```bash
pnpm exec playwright test --project=global --no-deps tests/e2e/seasonal.global.spec.ts
```

Expected: 1 passed. (`--no-deps` skips the chromium/mobile projects the global project normally waits for. The web server builds the app first, which takes a few minutes.)

If a locator fails, fix the test or the component, not the assertion's intent. Common cause: a label in the admin service form differs from `tests/e2e/admin-services.global.spec.ts`; copy the labels from there.

- [ ] **Step 3: Run the neighbouring specs to check nothing regressed**

```bash
pnpm exec playwright test --project=chromium tests/e2e/home.spec.ts tests/e2e/packages.spec.ts tests/e2e/book.spec.ts tests/e2e/admin-packages.spec.ts tests/e2e/package-detail.spec.ts
```

Expected: all pass (no seasonal data exists in the e2e database outside the global spec, so the strip is absent and counts are unchanged).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/seasonal.global.spec.ts
git commit -m "test(seasonal): e2e for creating, showing and ending an offer" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Docs and final verification

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-11-23-seasonal-offers-design.md`

- [ ] **Step 1: Document the feature in AGENTS.md**

1. In §1 "Required features (MVP)", after item 9 (Events by CAD) add:

```markdown
10. **Seasonal offers** — admin-managed seasonal packages (service slug `seasonal`) with an optional regular price and end date, a booking strip on the home page right after the hero (hidden when no offer is live) and a `/seasonal` page.
```

and renumber the Admin dashboard item to `11.`.

2. In §6, after §6.11, add:

```markdown
### 6.12 Seasonal offers `/seasonal`
- One service with slug `seasonal` (created in Admin → Services; rename it each season). Its packages are the offers. Optional `Package.regularPriceCents` (struck through on cards, display only — clients are charged the starting price) and `Package.offerEndsAt` (entered as a date; live until the end of that day, Toronto time).
- An offer is **live** when the package is active, its service is not archived and `offerEndsAt` is empty or not yet past (`src/lib/seasonal/offer.ts`). Applied after the cached reads in `getActivePackages`, `getPackageBySlug` and `getPricingContext`, so ended offers disappear from the site and cannot be priced or booked.
- Home: `SeasonalBookingStrip` directly after the hero; renders nothing when no offer is live. `/seasonal` returns 404 and leaves the sitemap in that case. Both revalidate hourly.
- Booking uses the normal wizard (`/book?package=<slug>`), availability and deposit rules.
- Flyer content (Christmas 2026) is available as `pnpm db:seed:seasonal` (create-only); it is not part of `pnpm db:seed`.
```

- [ ] **Step 2: Bring the spec in line with the plan**

Edit `docs/superpowers/specs/2026-11-23-seasonal-offers-design.md`:

- In **§1 Data → Seed**, replace the first sentence with: "Flyer content (owner-supplied, so not invented) ships as an optional create-only script, `pnpm db:seed:seasonal` (`prisma/seasonal-data.ts`), not in the default seed, so the e2e database and existing specs stay unchanged." and replace the hour sentence/list so hours read: Mini 2, Classic 3, Premium 5, Event Coverage 8 ("upper end of the range rounded up, as elsewhere in the seed; the ranges are in the inclusions"). Remove "Seed `offerEndsAt` is left null…" only if redundant; keep it.
- In **§4 `/seasonal` page**, remove the "hero image from tile" wording and the sentence about the **Seasonal** nav item; add: "No nav item: static pages would keep a stale link after an offer ends."
- In **§2 Live rule**, replace the last paragraph with: "The package queries stay cached (existing tags). `isOfferLive` is applied after the cached read on every call. Home and `/seasonal` revalidate hourly, so an ended offer can show up to an hour late there; the pricing context is exact, so an ended offer cannot be booked."
- Set the status line to `Status: approved (brainstorm), plan: docs/superpowers/plans/2026-11-23-seasonal-offers.md`.

- [ ] **Step 3: Full verification**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all PASS.

- [ ] **Step 4: Manual check in the browser (golden path)**

Start the dev server (`pnpm dev`), run `pnpm db:seed:seasonal`, then open `http://localhost:3000/en` and check, at 360 px and 1280 px, in light and dark theme: the strip sits directly under the hero with four cards (Mini, Classic, Premium, Event Coverage), offer prices with struck-through regular prices and the OFFER badge, Book opens `/en/book?package=<slug>` with that package selected; `/en/seasonal` shows the add-ons and the booking ribbon; `/fr` shows French text. Then in Admin → Packages set "Offer ends on" to yesterday for one package and confirm it leaves the strip. Report anything that looks wrong instead of assuming it passes.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md docs/superpowers/specs/2026-11-23-seasonal-offers-design.md
git commit -m "docs(seasonal): document seasonal offers" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage**

| Spec section | Task |
|---|---|
| §1 Data: two columns | 2 |
| §1 Seed with flyer content | 8 (optional script, deviation 1–2) |
| §2 Live rule, applied everywhere | 1 (helper), 5 (queries, pricing context) |
| §3 Home section after hero, hidden when none | 6 |
| §4 `/seasonal`, 404 when none, sitemap while live, JSON-LD | 7 (nav item and hero image dropped, deviation 3) |
| §5 Admin fields, expired badge | 3, 4 |
| §6 Booking unchanged | 5 (pricing context) and 9 (link opens wizard) |
| §7 Tests | 1, 3, 8 (unit), 9 (e2e) |

**Placeholder scan:** none; every code step has full code.

**Type consistency:** `offerEndsAt` is `Date | string | null` in `OfferEnd`; `filterLive`/`isOfferLive` take it everywhere; `getSeasonalOffers` returns `{ service, packages: PackageSummary[], addOns }`; `SeasonalOfferGrid` takes `PackageSummary[]` (which now includes `regularPriceCents` and `offerEndsAt` from Task 5 Step 1); form field names `regularPrice` / `offerEndsOn` are the same in validator, action, defaults, form and e2e labels ("Regular price (CAD)", "Offer ends on").
