# Dynamic Services Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `Category` enum (six services) with an admin-managed `Service` table: create, edit EN/FR, reorder, choose tile photo, archive/restore, delete when unused.

**Architecture:** `Service.slug` is the primary key; every `category` column becomes a `String` FK to it (values lowercase, e.g. `wedding`). Add-on ↔ service becomes an implicit many-to-many. Pure helpers live in `src/lib/services.ts`; one cached query (`getServices`, tag `services`) feeds the site; forms receive `{ slug, name }[]` props. Spec: `docs/superpowers/specs/2026-10-06-dynamic-services-design.md`.

**Tech Stack:** Next.js 15 App Router, Prisma 7 (`prisma-client` generator → `src/generated/prisma`), PostgreSQL, Zod, next-intl, Vitest, Playwright.

**Ground rules for the executor**
- Branch: `feat/dynamic-services` (already created). Commit after every task with Conventional Commits and the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Before any `pnpm build` / `pnpm test:e2e` / commit: run ListAgents and `git status`; other Claude sessions may share this tree (see memory `parallel-sessions`).
- Local Postgres must be running (see memory `local-postgres`).
- Between Task 2 and Task 8 `pnpm typecheck` is expected to fail in files not yet migrated. Each task lists the files it must leave compiling; run `pnpm typecheck 2>&1 | grep <path>` to check just those.

---

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/services.ts` | create | Pure: slug rules, `slugFromName`, localized options/names, usage + archive guards, reorder |
| `tests/unit/services.test.ts` | create | Unit tests for the above |
| `prisma/schema.prisma` | modify | `Service` model, FKs, drop `Category` enum |
| `prisma/migrations/20261006000000_dynamic_services/migration.sql` | create | Hand-written data-preserving migration |
| `prisma/seed-data.ts`, `prisma/seed.ts` | modify | Seed six services first; lowercase slugs |
| `scripts/photos.config.mjs`, `src/data/photos.json`, `src/lib/photos.ts` | modify | Lowercase category slugs |
| `src/server/cache.ts` | modify | Add `services` tag |
| `src/server/queries/services.ts` | create | Cached `getServices`, `getServiceNames`, `getActiveServiceOptions`, `isActiveServiceSlug`, admin list with usage |
| `src/server/queries/service-tiles.ts`, `src/lib/service-tiles.ts` | modify / delete | Tile photos from `Service.tileImageId` |
| `src/lib/validators/admin/service.ts` | create | Admin service form schema |
| `src/server/actions/admin/services.ts` | create | save / move / archive / delete / setTile |
| `src/components/admin/service-form.tsx` | create | Create/edit form |
| `src/app/admin/(panel)/services/**` | create | List, new, edit, photo picker |
| `src/app/admin/(panel)/service-tiles/**` | modify | Redirects to `/admin/services` |
| `src/lib/categories.ts`, `tests/unit/categories.test.ts` | delete | Replaced by services |
| ~45 consumers | modify | Use slugs + service names instead of enum + `Categories.*` messages |
| `messages/en.json`, `messages/fr.json` | modify | Remove `Categories` + `Contact.types.<service>` keys |
| `tests/e2e/admin-services.global.spec.ts` | create | End-to-end admin flow |
| `AGENTS.md` | modify | §1, §6.10, §7 |

---

### Task 1: Pure service helpers

**Files:**
- Create: `src/lib/services.ts`
- Test: `tests/unit/services.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// tests/unit/services.test.ts
import { describe, expect, it } from "vitest";

import {
  canArchiveService,
  canDeleteService,
  isServiceSlug,
  moveSlug,
  serviceNameMap,
  serviceOptions,
  type ServiceRow,
  slugFromName,
  usageTotal,
} from "@/lib/services";

const row = (slug: string, sortOrder: number, extra: Partial<ServiceRow> = {}): ServiceRow => ({
  slug,
  name: slug.toUpperCase(),
  nameFr: null,
  description: `${slug} description`,
  descriptionFr: null,
  sortOrder,
  active: true,
  tileImageId: null,
  ...extra,
});

describe("isServiceSlug", () => {
  it("accepts lowercase words joined by single dashes", () => {
    for (const slug of ["wedding", "baby-shower", "event-2026", "a"]) {
      expect(isServiceSlug(slug)).toBe(true);
    }
  });

  it("rejects anything else", () => {
    for (const value of ["", "Wedding", "-wedding", "wedding-", "baby--shower", "a b", "é", 3, null]) {
      expect(isServiceSlug(value)).toBe(false);
    }
    expect(isServiceSlug("a".repeat(41))).toBe(false);
  });
});

describe("slugFromName", () => {
  it("lowercases, strips accents and joins words with dashes", () => {
    expect(slugFromName("Baby Showers")).toBe("baby-showers");
    expect(slugFromName("  Événements & Galas ")).toBe("evenements-galas");
    expect(slugFromName("Graduations 2026!")).toBe("graduations-2026");
  });

  it("keeps the result within 40 characters without a trailing dash", () => {
    const slug = slugFromName("Very long service name that goes on and on forever");
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith("-")).toBe(false);
    expect(isServiceSlug(slug)).toBe(true);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugFromName("!!!")).toBe("");
  });
});

describe("serviceOptions", () => {
  const services = [
    row("wedding", 1, { name: "Weddings", nameFr: "Mariages" }),
    row("corporate", 0, { name: "Corporate" }),
    row("old", 2, { name: "Old", active: false }),
  ];

  it("lists active services in sort order with localized names", () => {
    expect(serviceOptions(services, "fr")).toEqual([
      { slug: "corporate", name: "Corporate" },
      { slug: "wedding", name: "Mariages" },
    ]);
  });

  it("can include archived services", () => {
    expect(serviceOptions(services, "en", { includeArchived: true }).map((s) => s.slug)).toEqual([
      "corporate",
      "wedding",
      "old",
    ]);
  });

  it("maps every slug (archived too) to its localized name", () => {
    const names = serviceNameMap(services, "fr");
    expect(names.get("wedding")).toBe("Mariages");
    expect(names.get("old")).toBe("Old");
  });
});

describe("usage guards", () => {
  const unused = { packages: 0, addOns: 0, quotes: 0, bookings: 0, projects: 0, images: 0, reviews: 0 };

  it("allows delete only when nothing uses the service", () => {
    expect(canDeleteService(unused)).toBe(true);
    expect(canDeleteService({ ...unused, reviews: 1 })).toBe(false);
    expect(usageTotal({ ...unused, quotes: 2, images: 3 })).toBe(5);
  });

  it("refuses to archive the last active service", () => {
    const services = [row("wedding", 0), row("old", 1, { active: false })];
    expect(canArchiveService(services, "wedding")).toBe(false);
    expect(canArchiveService([...services, row("family", 2)], "wedding")).toBe(true);
  });
});

describe("moveSlug", () => {
  const order = ["a", "b", "c"];

  it("swaps with the neighbour", () => {
    expect(moveSlug(order, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveSlug(order, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("leaves the order alone at the ends or for unknown slugs", () => {
    expect(moveSlug(order, "a", "up")).toEqual(order);
    expect(moveSlug(order, "c", "down")).toEqual(order);
    expect(moveSlug(order, "x", "up")).toEqual(order);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/services.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/services"`.

- [ ] **Step 3: Implement**

```ts
// src/lib/services.ts
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

/** "Événements & Galas" → "evenements-galas"; "" when nothing usable is left. */
export function slugFromName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
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
  return services
    .filter((service) => includeArchived || service.active)
    .toSorted(bySortOrder)
    .map((service) => ({ slug: service.slug, name: localize(service.name, service.nameFr, locale) }));
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run tests/unit/services.test.ts`
Expected: PASS (all tests). If `toSorted` is flagged by the TS lib target, use `[...services].filter(...).sort(bySortOrder)`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services.ts tests/unit/services.test.ts
git commit -m "feat: pure helpers for admin-managed services"
```

---

### Task 2: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261006000000_dynamic_services/migration.sql`

- [ ] **Step 1: Edit the schema**

Delete the whole `enum Category { … }` block. Add after `enum Locale`:

```prisma
/// A service the studio offers (AGENTS.md §1), managed in Admin → Services. Other tables refer
/// to it by slug, which never changes. Archived services are hidden from the public site and
/// from new quotes, bookings and reviews; they can only be deleted when nothing uses them.
model Service {
  /// Lowercase words joined by dashes, e.g. "wedding". Set on creation, never edited.
  slug          String             @id
  name          String
  nameFr        String?
  description   String
  descriptionFr String?
  sortOrder     Int                @default(0)
  archivedAt    DateTime?
  /// Photo on the home-page tile; null = first launch photo of the service.
  tileImageId   String?
  tileImage     Image?             @relation("ServiceTile", fields: [tileImageId], references: [id], onDelete: SetNull)
  packages      Package[]
  addOns        AddOn[]
  quotes        Quote[]
  bookings      Booking[]
  projects      PortfolioProject[]
  images        Image[]            @relation("ServiceImages")
  reviews       Review[]
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}
```

Change each `category` field and add a relation field next to it:

```prisma
// Package
  category         String
  service          Service       @relation(fields: [category], references: [slug], onDelete: Restrict)

// AddOn: replace `categories Category[]` with
  services   Service[]

// Quote
  category        String
  service         Service     @relation(fields: [category], references: [slug], onDelete: Restrict)

// Booking
  category           String
  service            Service                @relation(fields: [category], references: [slug], onDelete: Restrict)

// PortfolioProject
  category         String
  service          Service   @relation(fields: [category], references: [slug], onDelete: Restrict)

// Image
  category         String?
  service          Service?          @relation("ServiceImages", fields: [category], references: [slug], onDelete: Restrict)
  /// Services whose home tile shows this photo.
  tileFor          Service[]         @relation("ServiceTile")

// Review
  category         String?
  service          Service?     @relation(fields: [category], references: [slug], onDelete: Restrict)
```

- [ ] **Step 2: Validate and format**

Run: `pnpm prisma format && pnpm prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 3: Write the migration by hand**

Do **not** use Prisma's generated SQL (it would drop and recreate the columns, losing data). Create `prisma/migrations/20261006000000_dynamic_services/migration.sql`:

```sql
-- Services become admin-managed rows (docs/superpowers/specs/2026-10-06-dynamic-services-design.md).
-- Data-preserving: enum values are rewritten to lowercase slugs in place.

CREATE TABLE "Service" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameFr" TEXT,
    "description" TEXT NOT NULL,
    "descriptionFr" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "tileImageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Service_pkey" PRIMARY KEY ("slug")
);

-- The six launch services, names copied from messages/en.json and messages/fr.json.
INSERT INTO "Service" ("slug", "name", "nameFr", "description", "descriptionFr", "sortOrder", "updatedAt") VALUES
  ('corporate', 'Corporate Events', 'Événements corporatifs', 'Conferences, launches, galas and on-site headshots.', 'Conférences, lancements, galas et portraits sur place.', 0, CURRENT_TIMESTAMP),
  ('wedding', 'Weddings', 'Mariages', 'Engagement, ceremony and reception.', 'Fiançailles, cérémonie et réception.', 1, CURRENT_TIMESTAMP),
  ('family', 'Family Events', 'Événements familiaux', 'Birthdays, anniversaries, baby showers and milestones.', 'Anniversaires, fêtes prénatales et grandes étapes.', 2, CURRENT_TIMESTAMP),
  ('gathering', 'Gatherings', 'Rassemblements', 'Community, cultural, religious and social events.', 'Événements communautaires, culturels, religieux et sociaux.', 3, CURRENT_TIMESTAMP),
  ('professional', 'Professional Photoshoots', 'Séances professionnelles', 'Portraits, headshots, branding and portfolios.', 'Portraits, photos professionnelles, image de marque et portfolios.', 4, CURRENT_TIMESTAMP),
  ('product', 'Product Photography', 'Photographie de produits', 'E-commerce, catalogue, lifestyle and flat-lay.', 'Commerce en ligne, catalogue, mise en situation et vue de dessus.', 5, CURRENT_TIMESTAMP);

-- Enum columns → slug text.
ALTER TABLE "Package" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Quote" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Booking" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "PortfolioProject" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Image" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);
ALTER TABLE "Review" ALTER COLUMN "category" TYPE TEXT USING lower("category"::text);

-- Add-on services: enum array → join table.
CREATE TABLE "_AddOnToService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_AddOnToService_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX "_AddOnToService_B_index" ON "_AddOnToService"("B");
INSERT INTO "_AddOnToService" ("A", "B")
  SELECT DISTINCT a."id", lower(c::text) FROM "AddOn" a, unnest(a."categories") AS c;
ALTER TABLE "AddOn" DROP COLUMN "categories";

DROP TYPE "Category";

-- Home tile choices move from the SERVICE_TILE_IMAGES setting onto the service row.
UPDATE "Service" s SET "tileImageId" = i."id"
  FROM "SiteSetting" st, "Image" i
  WHERE st."key" = 'SERVICE_TILE_IMAGES' AND i."id" = st."value" ->> s."slug";
DELETE FROM "SiteSetting" WHERE "key" = 'SERVICE_TILE_IMAGES';

-- Foreign keys.
ALTER TABLE "Service" ADD CONSTRAINT "Service_tileImageId_fkey" FOREIGN KEY ("tileImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Package" ADD CONSTRAINT "Package_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Image" ADD CONSTRAINT "Image_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_category_fkey" FOREIGN KEY ("category") REFERENCES "Service"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "_AddOnToService" ADD CONSTRAINT "_AddOnToService_A_fkey" FOREIGN KEY ("A") REFERENCES "AddOn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_AddOnToService" ADD CONSTRAINT "_AddOnToService_B_fkey" FOREIGN KEY ("B") REFERENCES "Service"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Apply and confirm schema and migrations agree**

Run: `pnpm prisma migrate dev`
Expected: applies `20261006000000_dynamic_services`, regenerates the client. If it then says the schema drifted or offers a new migration, cancel and run `pnpm prisma migrate dev --create-only --name drift_check`; read the generated SQL, fold the difference (usually a constraint/index name) into the hand-written migration, delete `drift_check`, run `pnpm prisma migrate reset --force` (dev DB only), and repeat until `pnpm prisma migrate dev --create-only --name drift_check` reports no changes.

- [ ] **Step 5: Check the data**

Run:
```bash
psql "$DATABASE_URL" -c 'select slug, "sortOrder", "tileImageId" from "Service" order by "sortOrder"' -c 'select category, count(*) from "Package" group by 1' -c 'select count(*) from "_AddOnToService"'
```
Expected: six services; package categories all lowercase; join table non-empty.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261006000000_dynamic_services src/generated
git commit -m "feat(db): Service table replaces the Category enum"
```
(Check `.gitignore`: if `src/generated` is ignored, leave it out.)

---

### Task 3: Seed, launch photos and photo helpers

**Files:**
- Modify: `prisma/seed-data.ts`, `prisma/seed.ts`, `scripts/photos.config.mjs`, `src/data/photos.json`, `src/lib/photos.ts`
- Test: `tests/unit/seed-data.test.ts`, `tests/unit/photos.test.ts`

- [ ] **Step 1: Lowercase launch-photo categories**

```bash
sed -i -E 's/category: "(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)"/category: "\L\1"/' scripts/photos.config.mjs
sed -i -E 's/"category": "(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)"/"category": "\L\1"/' src/data/photos.json
grep -c '"category": "[A-Z]' src/data/photos.json   # expect 0
```
In `scripts/photos.config.mjs` change the JSDoc type `category: Category` to `category: string` (a service slug), and remove any `Category` typedef/import there.

- [ ] **Step 2: `src/lib/photos.ts`**

Remove `import type { Category } from "@/generated/prisma/enums";` and `import { type CategorySlug, categoryFromSlug } from "./categories";`. Change `PhotoGroup.category: Category` to `category: string; // service slug`. Change `categoryPhoto`:

```ts
export function categoryPhoto(
  slug: string,
  groups: readonly PhotoGroup[] = photos.groups,
): Photo | null {
  return groups.find((group) => group.category === slug)?.images[0] ?? null;
}
```
(Keep the existing JSDoc; replace `CategorySlug` with `string` in the signature.)

- [ ] **Step 3: `prisma/seed-data.ts`**

- Remove the `Category` import. Every `category: Category` type → `category: string`; `categories: Category[]` → `categories: string[]`.
- Lowercase every value: `sed -i -E 's/"(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)"/"\L\1"/g' prisma/seed-data.ts`.
- Add and export the services (same text as the migration):

```ts
/** Launch services (AGENTS.md §1). Starting values only: the owner manages them in Admin → Services. */
export const services = [
  { slug: "corporate", name: "Corporate Events", nameFr: "Événements corporatifs", description: "Conferences, launches, galas and on-site headshots.", descriptionFr: "Conférences, lancements, galas et portraits sur place.", sortOrder: 0 },
  { slug: "wedding", name: "Weddings", nameFr: "Mariages", description: "Engagement, ceremony and reception.", descriptionFr: "Fiançailles, cérémonie et réception.", sortOrder: 1 },
  { slug: "family", name: "Family Events", nameFr: "Événements familiaux", description: "Birthdays, anniversaries, baby showers and milestones.", descriptionFr: "Anniversaires, fêtes prénatales et grandes étapes.", sortOrder: 2 },
  { slug: "gathering", name: "Gatherings", nameFr: "Rassemblements", description: "Community, cultural, religious and social events.", descriptionFr: "Événements communautaires, culturels, religieux et sociaux.", sortOrder: 3 },
  { slug: "professional", name: "Professional Photoshoots", nameFr: "Séances professionnelles", description: "Portraits, headshots, branding and portfolios.", descriptionFr: "Portraits, photos professionnelles, image de marque et portfolios.", sortOrder: 4 },
  { slug: "product", name: "Product Photography", nameFr: "Photographie de produits", description: "E-commerce, catalogue, lifestyle and flat-lay.", descriptionFr: "Commerce en ligne, catalogue, mise en situation et vue de dessus.", sortOrder: 5 },
];
```
(Prettier will wrap it.)

- [ ] **Step 4: `prisma/seed.ts`**

Import `services` from `./seed-data`. At the top of `seedCatalogue()`:

```ts
  // Services first: everything else refers to them. Create-only, like the rest of the catalogue.
  for (const service of services) {
    await db.service.upsert({ where: { slug: service.slug }, update: {}, create: service });
  }
```
Replace the add-on upsert body:

```ts
  for (const { categories, ...addOn } of addOns) {
    // Link each add-on to its services and to every package in one of them.
    const connect = packages.filter((p) => categories.includes(p.category)).map((p) => ({ slug: p.slug }));
    await db.addOn.upsert({
      where: { code: addOn.code },
      update: {},
      create: {
        ...addOn,
        services: { connect: categories.map((slug) => ({ slug })) },
        packages: { connect },
      },
    });
  }
```
For launch-photo images and sample projects the `category: group.category` / `project.category` lines keep working (now lowercase strings).

- [ ] **Step 5: Update the unit tests**

In `tests/unit/seed-data.test.ts` and `tests/unit/photos.test.ts` replace uppercase enum literals with lowercase slugs (`sed -i -E 's/"(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)"/"\L\1"/g'` on both files), drop any import from `@/lib/categories` or `@/generated/prisma/enums`, and add to `seed-data.test.ts`:

```ts
import { addOns, packages, sampleProjects, services } from "../../prisma/seed-data";

it("only refers to seeded services", () => {
  const slugs = new Set(services.map((service) => service.slug));
  for (const pkg of packages) expect(slugs).toContain(pkg.category);
  for (const addOn of addOns) for (const slug of addOn.categories) expect(slugs).toContain(slug);
  for (const project of sampleProjects) expect(slugs).toContain(project.category);
});
```
(Adjust the import path/names to the file's existing import line.)

- [ ] **Step 6: Run**

Run: `pnpm vitest run tests/unit/seed-data.test.ts tests/unit/photos.test.ts tests/unit/services.test.ts && pnpm prisma migrate reset --force`
Expected: tests PASS; reset re-applies all migrations and the seed finishes without errors.

- [ ] **Step 7: Commit**

```bash
git add prisma/seed.ts prisma/seed-data.ts scripts/photos.config.mjs src/data/photos.json src/lib/photos.ts tests/unit/seed-data.test.ts tests/unit/photos.test.ts
git commit -m "feat(db): seed services; launch photos use service slugs"
```

---

### Task 4: Service queries and cache tag

**Files:**
- Modify: `src/server/cache.ts`
- Create: `src/server/queries/services.ts`
- Modify: `src/server/queries/admin-packages.ts` (`adminCategoryOptions`)

- [ ] **Step 1: Cache tag**

In `src/server/cache.ts` add `services: "services",` to `CACHE_TAGS`.

- [ ] **Step 2: Queries**

```ts
// src/server/queries/services.ts
import "server-only";

import { unstable_cache } from "next/cache";

import type { Locale } from "@/config/site";
import { db } from "@/lib/db";
import {
  serviceNameMap,
  serviceOptions,
  type ServiceRow,
  type ServiceUsage,
} from "@/lib/services";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

/** Every service (archived too) in display order. Cached as plain JSON — no Dates. */
export const getServices = unstable_cache(
  async (): Promise<ServiceRow[]> => {
    const rows = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return rows.map(({ archivedAt, createdAt: _c, updatedAt: _u, ...row }) => ({
      ...row,
      active: archivedAt === null,
    }));
  },
  ["services:all"],
  { tags: [CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** Active services as `{ slug, name }` in the viewer's language — for public forms and filters. */
export const getActiveServiceOptions = async (locale: Locale) =>
  serviceOptions(await getServices(), locale);

/** Slug → localized name for every service, so old quotes and bookings keep their label. */
export async function getServiceNames(locale: Locale) {
  const names = serviceNameMap(await getServices(), locale);
  return (slug: string | null | undefined) => (slug ? (names.get(slug) ?? slug) : "");
}

/** Server-side check for new quotes, bookings, reviews and enquiries. */
export async function isActiveServiceSlug(slug: string) {
  return (await getServices()).some((service) => service.slug === slug && service.active);
}

/** Admin list: services with usage counts. Uncached. */
export async function listServicesForAdmin() {
  const rows = await db.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      tileImage: { select: { publicId: true, width: true, height: true, blurDataUrl: true } },
      _count: {
        select: {
          packages: true,
          addOns: true,
          quotes: true,
          bookings: true,
          projects: true,
          images: true,
          reviews: true,
        },
      },
    },
  });
  return rows.map(({ _count, ...service }) => ({ ...service, usage: _count as ServiceUsage }));
}

export async function getServiceUsage(slug: string): Promise<ServiceUsage | null> {
  const service = await db.service.findUnique({
    where: { slug },
    select: {
      _count: {
        select: {
          packages: true,
          addOns: true,
          quotes: true,
          bookings: true,
          projects: true,
          images: true,
          reviews: true,
        },
      },
    },
  });
  return service?._count ?? null;
}
```

- [ ] **Step 3: Admin dropdown options read the table**

In `src/server/queries/admin-packages.ts` replace `adminCategoryOptions` (and drop the `categorySlugs` / `getTranslations` imports if now unused):

```ts
/** Service choices for admin forms, in English; archived ones are marked so old records still match. */
export async function adminCategoryOptions() {
  const services = await getServices();
  return services.map((service) => ({
    value: service.slug,
    label: service.active ? service.name : `${service.name} (archived)`,
  }));
}
```
Import `getServices` from `@/server/queries/services`.

- [ ] **Step 4: Typecheck these files**

Run: `pnpm typecheck 2>&1 | grep -E "queries/(services|admin-packages)|server/cache"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/server/cache.ts src/server/queries/services.ts src/server/queries/admin-packages.ts
git commit -m "feat: cached service queries"
```

---

### Task 5: Validators, filters and pricing data use slugs

**Files:**
- Modify: `src/lib/validators/{quote,booking,review,contact}.ts`, `src/lib/validators/admin/{package,project,image,add-on}.ts`, `src/lib/gallery-filters.ts`, `src/lib/portfolio-filters.ts`, `src/lib/review-display.ts`, `src/server/queries/pricing.ts`, `src/server/queries/packages.ts`
- Delete: `src/lib/categories.ts`, `tests/unit/categories.test.ts`
- Test: `tests/unit/{quote-schema,booking-schema,contact-schema,admin-package-schema,admin-project-schema,admin-image-schema,admin-add-on-schema,gallery-filters,portfolio-filters,review-display,pricing-options,pricing-rules,quote-engine,engine-input,quote-match}.test.ts`

- [ ] **Step 1: Schemas accept any slug-shaped value** (existence/active is checked on the server — Task 6)

In each file replace the `categorySlugs` import with `import { SERVICE_SLUG_PATTERN } from "@/lib/services";` and:

```ts
// validators/quote.ts and validators/booking.ts
    category: z.string("required").regex(SERVICE_SLUG_PATTERN, "required").max(40, "required"),

// validators/review.ts and validators/admin/image.ts
    category: z
      .string()
      .regex(SERVICE_SLUG_PATTERN)
      .max(40)
      .optional()
      .or(z.literal("").transform(() => undefined)),

// validators/admin/package.ts and validators/admin/project.ts
  category: z.string("Choose a service.").regex(SERVICE_SLUG_PATTERN, "Choose a service."),

// validators/admin/add-on.ts
    z.array(z.string().regex(SERVICE_SLUG_PATTERN)).min(1, "Choose at least one service."),
```

`validators/contact.ts`: replace the `enquiryTypes` tuple and schema field:

```ts
/** Non-service enquiry types; the rest are active service slugs (checked by the server action). */
export const otherEnquiryTypes = ["other", "privacy"] as const;

// in contactSchema:
  enquiryType: z
    .string("required")
    .refine(
      (value) =>
        (otherEnquiryTypes as readonly string[]).includes(value) || SERVICE_SLUG_PATTERN.test(value),
      "required",
    ),
```
Keep the existing error key used for `enquiryType` if it differs from `"required"` (check the current line). Remove `export type EnquiryType` if unused after Task 7; otherwise make it `string`.

- [ ] **Step 2: Filters**

`src/lib/gallery-filters.ts`, `src/lib/portfolio-filters.ts`, `src/lib/review-display.ts`: replace `category && categoryFromSlug(category) ? (category as CategorySlug) : null` with `isServiceSlug(category) ? category : null` (import `isServiceSlug` from `@/lib/services`), and every `CategorySlug` type with `string`. In `gallery-filters.ts` replace `galleryCategories`:

```ts
/** Services that have at least one image, in the given service order (active services only). */
export function galleryCategories(
  images: readonly Filterable[],
  serviceOrder: readonly string[],
): string[] {
  const present = new Set(images.map((image) => image.category));
  return serviceOrder.filter((slug) => present.has(slug));
}
```
The page passes `serviceOrder` (Task 7). Unknown/archived slugs in the URL are dropped by the pages (Task 7), not here.

- [ ] **Step 3: Pricing data and package queries hide archived services**

`src/server/queries/pricing.ts`:
- package `where: { isActive: true, service: { archivedAt: null } }`
- add-on `where: { isActive: true }`, select `services: { where: { archivedAt: null }, select: { slug: true } }` instead of `categories: true`, then map: `addOns: addOns.map(({ services, ...addOn }) => ({ ...addOn, categories: services.map((s) => s.slug) })),`
- add `CACHE_TAGS.services` to its tags.

`src/server/queries/packages.ts`: in `getActivePackages` and `getPackageBySlug` change `where` to include `service: { archivedAt: null }`, add `CACHE_TAGS.services` to both tag lists. Any other query in this file that lists packages publicly gets the same filter.

- [ ] **Step 4: Delete the enum helpers**

```bash
git rm src/lib/categories.ts tests/unit/categories.test.ts
```

- [ ] **Step 5: Update unit tests**

For each listed test file: lowercase enum literals (`sed -i -E 's/"(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)"/"\L\1"/g'`), remove imports from `@/lib/categories`. Specific changes:
- `gallery-filters.test.ts`: calls become `galleryCategories(images, ["corporate","wedding","family","gathering","professional","product"])`; add a case: an image whose category is not in `serviceOrder` produces no chip.
- `portfolio-filters.test.ts` / `review-display.test.ts`: expectations that `?category=birthday` → `null` now become `"birthday"` (slug-shaped, page decides); keep `"WEDDING"` → `null` and `"bad slug"` → `null`.
- `contact-schema.test.ts`: `enquiryType: "wedding"` still passes; add `"graduations"` passes and `"Not A Slug"` fails.
- `quote-schema.test.ts` / `booking-schema.test.ts`: a bad category such as `"WEDDING"` still fails; `"graduations"` passes.

- [ ] **Step 6: Run**

Run: `pnpm vitest run tests/unit`
Expected: PASS except tests for files changed in later tasks (`service-tiles.test.ts` is rewritten in Task 9). Note any other failure and fix it here if it belongs to a file touched in this task.

- [ ] **Step 7: Commit**

```bash
git add -A src/lib src/server/queries tests/unit
git commit -m "refactor: validators, filters and pricing use service slugs"
```

---

### Task 6: Server actions check services

**Files:**
- Modify: `src/server/actions/quote.ts`, `src/server/booking/place-booking.ts`, `src/server/actions/review.ts`, `src/server/actions/contact.ts`, `src/server/actions/admin/{packages,projects,images,add-ons}.ts`, `src/server/review-links.ts`, `src/server/queries/quotes.ts`, `src/server/queries/admin-{images,packages,projects,add-ons}.ts`

- [ ] **Step 1: Public actions refuse unknown or archived services**

`src/server/actions/quote.ts` (around line 63):

```ts
    if (!(await isActiveServiceSlug(request.category))) return { ok: false, error: "unavailable" };
    const pkg = resolvePackage(context.packages, request.category, request.packageSlug);
```
`src/server/booking/place-booking.ts` (around line 50):

```ts
  const category = (await isActiveServiceSlug(request.category)) ? request.category : null;
  const pkg = category ? resolvePackage(context.packages, category, request.packageSlug) : null;
  if (!category || !pkg) return { ok: false, error: "invalid" };
```
`src/server/actions/review.ts`: line 63 becomes `category: verifiedBooking?.categorySlug ?? review.category ?? null,`. Before the insert, when `review.category` is set and not from a verified booking, drop it if inactive: `const category = verifiedBooking?.categorySlug ?? (review.category && (await isActiveServiceSlug(review.category)) ? review.category : null);` and use `category` in both the insert and the notification text.

`src/server/actions/contact.ts`: after parsing, reject unknown service enquiries the same way the action already reports field errors (mirror its existing return shape for a Zod failure on `enquiryType`):

```ts
  const isOther = (otherEnquiryTypes as readonly string[]).includes(data.enquiryType);
  if (!isOther && !(await isActiveServiceSlug(data.enquiryType))) {
    return { ok: false, fieldErrors: { enquiryType: "required" } };
  }
```
Make the email line readable: `Enquiry type: ${isOther ? data.enquiryType : (await getServiceNames("en"))(data.enquiryType)}` (and the same in the subject).

Imports: `isActiveServiceSlug`, `getServiceNames` from `@/server/queries/services`; `otherEnquiryTypes` from `@/lib/validators/contact`.

- [ ] **Step 2: Admin actions store slugs directly**

- `actions/admin/packages.ts`: `category: categoryFromSlug(category)!` → `category`; remove import.
- `actions/admin/projects.ts`: same.
- `actions/admin/images.ts`: `category: category ? categoryFromSlug(category) : null` → `category: category ?? null`.
- `actions/admin/add-ons.ts`: `const data = { ...rest, priceCents: price };` and in the create/update calls add `services: { set: categories.map((slug) => ({ slug })) }` for update and `services: { connect: categories.map((slug) => ({ slug })) }` for create. Keep `categories` in the audit `describeChanges` by passing `{ ...data, categories }` as the "after" value and `{ ...before, categories: before.services.map((s) => s.slug) }` as "before" (load `before` with `include: { services: { select: { slug: true } } }`). A foreign-key error (`P2003`, `P2025`) returns `{ ok: false, fieldErrors: { categories: "Choose at least one service." } }`.
- Also add `revalidateContent("packages", "services")` is **not** needed here; leave existing tags.

- [ ] **Step 3: Queries that turned enums into slugs**

Remove `slugFromCategory(...)` wrappers (the value already is the slug) and `as CategorySlug` casts in: `queries/admin-images.ts:50` (`category: image.category ?? ""`), `queries/admin-packages.ts:61`, `queries/admin-projects.ts:69`, `queries/quotes.ts:58`, `server/review-links.ts:55`. In `queries/admin-add-ons.ts` load `include: { services: { select: { slug: true } } }` and map `categories: addOn.services.map((s) => s.slug)`; `listAddOnsForAdmin` likewise includes services.

- [ ] **Step 4: Typecheck these files**

Run: `pnpm typecheck 2>&1 | grep -E "server/(actions|booking|queries|review-links)"`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/server
git commit -m "feat: actions accept only active services"
```

---

### Task 7: Public site reads service names from the database

**Files:**
- Modify: `src/components/site/category-tiles.tsx`, `src/components/packages/{category-filter,package-card}.tsx`, `src/components/portfolio/project-card.tsx`, `src/components/quote/quote-form.tsx`, `src/components/booking/booking-wizard.tsx`, `src/components/reviews/{review-card,review-form}.tsx`, `src/components/contact/contact-form.tsx`, `src/app/[locale]/(site)/{packages/(list),packages/[slug],portfolio/(list),portfolio/[slug],gallery,reviews,quote,quote/[reference],book,contact}/page.tsx`, `src/server/emails/{quote,booking}-emails.ts`, `src/app/admin/(panel)/quotes/[reference]/pdf/route.ts`

Pattern for every server component that printed `t(\`Categories.${slug}.name\`)`:

```ts
const serviceName = await getServiceNames(locale);   // from @/server/queries/services
…
serviceName(pkg.category)
```

- [ ] **Step 1: Home tiles** — `category-tiles.tsx`

Replace `categorySlugs.map(...)` with the active services and their localized text:

```tsx
export async function CategoryTiles() {
  const locale = (await getLocale()) as Locale;          // next-intl/server
  const [t, services, images] = await Promise.all([
    getTranslations(),
    getServices(),
    getServiceTileImages(),
  ]);
  const tiles = services.filter((service) => service.active);
  …
        {tiles.map((service) => {
          const name = localize(service.name, service.nameFr, locale);
          const description = localize(service.description, service.descriptionFr, locale);
          const image = images[service.slug] ?? null;
          return (
            <li key={service.slug}>
              <Link href={{ pathname: "/packages", query: { category: service.slug } }} …>
                …{name}… {description}…
```
Update the comment and the TODO to say "Admin → Services". (`getServiceTileImages` returns `Record<string, TileImage | null>` after Task 9; until then the cast compiles because Task 9 lands before the build check.)

- [ ] **Step 2: Packages**

- `packages/(list)/page.tsx`: 
  ```ts
  const [t, packages, services] = await Promise.all([getTranslations(), getActivePackages(), getActiveServiceOptions(locale)]);
  const activeSlug = typeof rawCategory === "string" && services.some((s) => s.slug === rawCategory) ? rawCategory : null;
  const visible = activeSlug ? packages.filter((pkg) => pkg.category === activeSlug) : packages;
  ```
  Pass `services` to `<CategoryFilter services={services} active={activeSlug} … />`; pass `serviceName` (a `(slug) => string`) or the resolved name to each `PackageCard` (add prop `serviceName: string`).
- `category-filter.tsx`: props `{ services: ServiceOption[]; active: string | null; pathname: string }`; options = `[{ slug: null, label: t("Packages.all") }, ...services.map((s) => ({ slug: s.slug, label: s.name }))]`.
- `package-card.tsx`: render the `serviceName` prop instead of `t(\`Categories…\`)`; drop the categories import.
- `packages/[slug]/page.tsx`: `const categoryName = (await getServiceNames(locale))(pkg.category); const categorySlug = pkg.category;`.

- [ ] **Step 3: Portfolio, gallery, reviews**

- `portfolio/(list)/page.tsx`: `const services = await getActiveServiceOptions(locale);` filter chips from `services` (label `s.name`); if `filters.category` is not an active slug, treat it as `null` before filtering (`const category = services.some((s) => s.slug === filters.category) ? filters.category : null`). Project cards get `serviceName(project.category)` via a new `serviceName: string` prop on `project-card.tsx` (the card shows archived names too).
- `portfolio/[slug]/page.tsx`: both `generateMetadata` and the page use `(await getServiceNames(locale))(project.category)`.
- `gallery/page.tsx`: `const services = await getActiveServiceOptions(locale); const categories = galleryCategories(images, services.map((s) => s.slug));` chip label from a `Map` of `services`. Ignore a `filters.category` that is not active (same pattern as portfolio).
- `reviews/page.tsx`: chips from `getActiveServiceOptions(locale)`; ignore inactive `filters.category`; `review-card.tsx` gets a `serviceName: string | null` prop computed by the page with `getServiceNames`.
- `review-form.tsx`: new prop `services: ServiceOption[]`; options from it. The page passes `getActiveServiceOptions(locale)`.

- [ ] **Step 4: Quote and booking**

- `quote/page.tsx`: `const services = await getActiveServiceOptions(locale);` `initialCategory={categoryParam && services.some((s) => s.slug === categoryParam) ? categoryParam : undefined}`; pass `services`.
- `quote-form.tsx`: prop `services: ServiceOption[]`; `initialCategory?: string`; `startingCategory = initialCategory ?? startingPackage?.category ?? ""`; `const category = values.category || null;` (packages and add-ons already carry slugs); the `<select>` maps `services`.
- `book/page.tsx`: `category: chosen.category`; pass `services` to the wizard.
- `booking-wizard.tsx`: same as the quote form (`services` prop, `values.category || null`, select from `services`).
- `quote/[reference]/page.tsx`: `value: (await getServiceNames(locale))(quote.category)`.

- [ ] **Step 5: Contact form**

`contact/page.tsx` passes `services={await getActiveServiceOptions(locale)}`; `contact-form.tsx` renders:

```tsx
{services.map((service) => (
  <option key={service.slug} value={service.slug}>{service.name}</option>
))}
{otherEnquiryTypes.map((type) => (
  <option key={type} value={type}>{t(`types.${type}`)}</option>
))}
```

- [ ] **Step 6: Emails and PDF**

- `quote-emails.ts` / `booking-emails.ts`: replace the `tCategories` translation with `const category = (await getServiceNames(locale))(data.category);` and drop the `Categories` `getTranslations` call.
- `admin/(panel)/quotes/[reference]/pdf/route.ts:82`: `value: (await getServiceNames(locale))(quote.category)` (use the locale variable the route already has).

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck 2>&1 | grep -E "src/(components/(site|packages|portfolio|quote|booking|reviews|contact)|app/\[locale\]|server/emails)|pdf/route"`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add src/components src/app/[locale] src/server/emails "src/app/admin/(panel)/quotes/[reference]/pdf/route.ts"
git commit -m "feat: public site shows services from the database"
```

---

### Task 8: Admin screens show service names

**Files:**
- Modify: `src/app/admin/(panel)/{page.tsx,bookings/(list)/page.tsx,bookings/[reference]/page.tsx,packages/(list)/page.tsx,portfolio/(list)/page.tsx,quotes/(list)/page.tsx,quotes/[reference]/page.tsx,reviews/page.tsx,add-ons/(list)/page.tsx}`, `src/components/admin/{package-form,project-form,image-form}.tsx`

- [ ] **Step 1: Replace lookups**

Every `categoryLabel.get(slugFromCategory(x))` → `categoryLabel.get(x)` (the maps already come from `adminCategoryOptions()`, now DB-backed). Every `tCategories(\`${slugFromCategory(x)}.name\`)` → `serviceName(x)` with `const serviceName = await getServiceNames("en");` and remove the `getTranslations({ namespace: "Categories" })` call. In `admin/(panel)/page.tsx` replace the `category` helper with `serviceName`. In `add-ons/(list)/page.tsx` the row shows `addOn.services.map((s) => categoryLabel.get(s.slug)).join(", ")`.

- [ ] **Step 2: Form labels**

In `package-form.tsx`, `project-form.tsx`, `image-form.tsx` change the visible label "Category" to "Service" (the `name="category"` stays). Update the three e2e specs that use `getByLabel("Category")` in Task 11.

- [ ] **Step 3: Full typecheck (everything except service tiles)**

Run: `pnpm typecheck`
Expected: only errors in `service-tiles` files and `src/lib/service-tiles.ts` (fixed next task). If anything else fails, fix it now.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin src/components/admin
git commit -m "refactor: admin screens read service names from the database"
```

---

### Task 9: Admin → Services

**Files:**
- Create: `src/lib/validators/admin/service.ts`, `src/server/actions/admin/services.ts`, `src/components/admin/service-form.tsx`, `src/app/admin/(panel)/services/(list)/page.tsx`, `src/app/admin/(panel)/services/new/page.tsx`, `src/app/admin/(panel)/services/[slug]/page.tsx`, `src/app/admin/(panel)/services/[slug]/photo/page.tsx`
- Modify: `src/server/queries/service-tiles.ts`, `src/components/admin/admin-nav.tsx`, `src/app/admin/(panel)/service-tiles/page.tsx`, `src/app/admin/(panel)/service-tiles/[slug]/page.tsx`
- Delete: `src/lib/service-tiles.ts`, `src/server/actions/admin/service-tiles.ts`
- Test: `tests/unit/admin-service-schema.test.ts`; delete `tests/unit/service-tiles.test.ts`

- [ ] **Step 1: Failing schema test**

```ts
// tests/unit/admin-service-schema.test.ts
import { describe, expect, it } from "vitest";

import { serviceFormSchema } from "@/lib/validators/admin/service";

const valid = { slug: "graduations", name: "Graduations", nameFr: "", description: "Caps, gowns and families.", descriptionFr: "" };

describe("serviceFormSchema", () => {
  it("accepts a new service and blanks optional French", () => {
    const parsed = serviceFormSchema.parse(valid);
    expect(parsed).toMatchObject({ slug: "graduations", nameFr: null, descriptionFr: null });
  });

  it("lowercases and trims the slug, but rejects bad shapes", () => {
    expect(serviceFormSchema.parse({ ...valid, slug: " Graduations " }).slug).toBe("graduations");
    expect(serviceFormSchema.safeParse({ ...valid, slug: "grad uations" }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...valid, slug: "a".repeat(41) }).success).toBe(false);
  });

  it("lets edits omit the slug", () => {
    const { slug: _slug, ...edit } = valid;
    expect(serviceFormSchema.parse(edit).slug).toBeUndefined();
  });

  it("requires English name and description", () => {
    const result = serviceFormSchema.safeParse({ ...valid, name: " ", description: "" });
    expect(result.success).toBe(false);
  });
});
```

Run: `pnpm vitest run tests/unit/admin-service-schema.test.ts` → FAIL (module missing).

- [ ] **Step 2: Schema**

```ts
// src/lib/validators/admin/service.ts
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
```
Run the test → PASS.

- [ ] **Step 3: Tile query reads `Service.tileImageId`**

Rewrite `src/server/queries/service-tiles.ts` keeping `TileImage`, `tileImageSelect`, `defaultTileImage` (signature `(slug: string)`), and:

```ts
const cachedTileImages = unstable_cache(
  async (includeSamples: boolean) => {
    const services = await db.service.findMany({
      select: {
        slug: true,
        tileImage: { select: { ...tileImageSelect, consentToPublish: true, isSample: true } },
      },
    });
    return Object.fromEntries(
      services.map(({ slug, tileImage }) => {
        // A chosen photo whose consent is later withdrawn falls back to the default.
        const usable =
          tileImage && tileImage.consentToPublish && (includeSamples || !tileImage.isSample);
        const { consentToPublish: _c, isSample: _s, ...image } = tileImage ?? {};
        return [slug, usable ? (image as TileImage) : defaultTileImage(slug)];
      }),
    ) as Record<string, TileImage | null>;
  },
  ["home:service-tiles"],
  {
    tags: [CACHE_TAGS.services, CACHE_TAGS.gallery, CACHE_TAGS.portfolio],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

export const getServiceTileImages = () => cachedTileImages(shouldShowSampleContent());

/** Photos that may go on a tile (consent given), the service's own photos first. Uncached. */
export async function getServiceTileOptions(slug: string) {
  const [service, images] = await Promise.all([
    db.service.findUnique({ where: { slug }, select: { tileImageId: true } }),
    db.image.findMany({
      where: { consentToPublish: true, ...(shouldShowSampleContent() ? {} : { isSample: false }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, alt: true, category: true, ...tileImageSelect },
    }),
  ]);
  if (!service) return null;
  return {
    currentId: service.tileImageId,
    defaultImage: defaultTileImage(slug),
    sameCategory: images.filter((image) => image.category === slug),
    others: images.filter((image) => image.category !== slug),
  };
}
```
Drop `getServiceTilesForAdmin`, `readChoices` and the imports of `@/lib/categories` / `@/lib/service-tiles`.

Then:
```bash
git rm src/lib/service-tiles.ts src/server/actions/admin/service-tiles.ts tests/unit/service-tiles.test.ts
```

- [ ] **Step 4: Actions**

```ts
// src/server/actions/admin/services.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/action-result";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { canArchiveService, canDeleteService, moveSlug, usageTotal } from "@/lib/services";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { serviceFormSchema } from "@/lib/validators/admin/service";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";
import { getServiceUsage } from "@/server/queries/services";

import type { SaveResult } from "./packages";

// Service names show on packages, portfolio, gallery, reviews, quotes and the home page.
const refresh = () => {
  revalidateContent("services", "packages", "portfolio", "gallery", "reviews");
  revalidatePath("/admin", "layout");
};

/** Creates (no slug) or updates a service (Admin → Services). ADMIN only. */
export async function saveService(slug: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = serviceFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { slug: newSlug, ...data } = parsed.data;
  if (!slug && !newSlug) return { ok: false, fieldErrors: { slug: "Required." } };

  const before = slug ? await db.service.findUnique({ where: { slug } }) : null;
  if (slug && !before) return { ok: false, error: "server" };
  try {
    if (slug) {
      await db.service.update({ where: { slug }, data });
    } else {
      const last = await db.service.aggregate({ _max: { sortOrder: true } });
      await db.service.create({
        data: { ...data, slug: newSlug!, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { slug: "Another service already uses this slug." } };
    }
    console.error("[admin] saveService failed", error);
    return { ok: false, error: "server" };
  }

  await audit(actor, {
    action: slug ? "service.update" : "service.create",
    entityType: "Service",
    entityId: slug ?? newSlug!,
    summary: before
      ? auditSummary(
          `${data.name} (${slug})`,
          describeChanges(before, data, {
            name: { label: "name" },
            nameFr: { label: "French name" },
            description: { label: "description" },
            descriptionFr: { label: "French description" },
          }),
          "details updated",
        )
      : `Created ${data.name} (${newSlug})`,
  });
  refresh();
  redirect(`/admin/services?saved=${encodeURIComponent(slug ?? newSlug!)}`);
}

/** Moves a service one place up or down in the display order. */
export async function moveService(slug: string, direction: "up" | "down"): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const services = await db.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });
  const order = moveSlug(services.map((service) => service.slug), slug, direction);
  await db.$transaction(
    order.map((s, index) => db.service.update({ where: { slug: s }, data: { sortOrder: index } })),
  );
  await audit(actor, {
    action: "service.update",
    entityType: "Service",
    entityId: slug,
    summary: `${services.find((s) => s.slug === slug)?.name ?? slug}: moved ${direction}`,
  });
  refresh();
  return { ok: true };
}

/** Archives (hides from the site and new quotes/bookings) or restores a service. */
export async function setServiceArchived(slug: string, archived: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const services = await db.service.findMany({ select: { slug: true, name: true, archivedAt: true } });
  const service = services.find((s) => s.slug === slug);
  if (!service) return { ok: false, error: "This service no longer exists." };
  const rows = services.map((s) => ({ slug: s.slug, active: s.archivedAt === null }));
  if (archived && !canArchiveService(rows, slug)) {
    return { ok: false, error: "The site needs at least one active service." };
  }
  await db.service.update({ where: { slug }, data: { archivedAt: archived ? new Date() : null } });
  await audit(actor, {
    action: "service.update",
    entityType: "Service",
    entityId: slug,
    summary: `${service.name}: ${archived ? "archived" : "restored"}`,
  });
  refresh();
  return { ok: true };
}

/** Deletes a service nothing refers to; otherwise explains and points to Archive. */
export async function deleteService(slug: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const service = await db.service.findUnique({ where: { slug }, select: { name: true } });
  const usage = await getServiceUsage(slug);
  if (!service || !usage) return { ok: false, error: "This service no longer exists." };
  if (!canDeleteService(usage)) {
    return {
      ok: false,
      error: `Used by ${usageTotal(usage)} package, quote, booking, project, photo, review or add-on records, so it can't be deleted. Archive it instead.`,
    };
  }
  const active = await db.service.count({ where: { archivedAt: null, slug: { not: slug } } });
  if (active === 0) return { ok: false, error: "The site needs at least one active service." };
  try {
    await db.service.delete({ where: { slug } });
  } catch (error) {
    // Something started using it between the check and the delete.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, error: "This service is now in use. Archive it instead." };
    }
    throw error;
  }
  await audit(actor, {
    action: "service.delete",
    entityType: "Service",
    entityId: slug,
    summary: `Deleted ${service.name} (${slug})`,
  });
  refresh();
  return { ok: true };
}

const tileSchema = z.object({ slug: z.string().min(1).max(40), imageId: z.string().trim().max(64) });

/** Chooses the home-page tile photo for a service ("" = default launch photo). */
export async function setServiceTile(formData: FormData): Promise<void> {
  const actor = await requireRole("ADMIN");
  const parsed = tileSchema.safeParse({
    slug: formData.get("slug"),
    imageId: formData.get("imageId") ?? "",
  });
  if (!parsed.success) redirect("/admin/services");
  const { slug, imageId } = parsed.data;

  // Only photos the client agreed to publish may go on the home page (AGENTS.md §9).
  const image = imageId
    ? await db.image.findFirst({
        where: { id: imageId, consentToPublish: true },
        select: { id: true, alt: true },
      })
    : null;
  if (imageId && !image) redirect(`/admin/services/${slug}/photo?error=photo`);

  const service = await db.service.update({
    where: { slug },
    data: { tileImageId: image?.id ?? null },
    select: { name: true },
  });
  await audit(actor, {
    action: "service.update",
    entityType: "Service",
    entityId: slug,
    summary: image ? `${service.name} tile: photo "${image.alt}"` : `${service.name} tile: default photo`,
  });
  refresh();
  redirect(`/admin/services?saved=${encodeURIComponent(slug)}`);
}
```

- [ ] **Step 5: Form component**

Create `src/components/admin/service-form.tsx`, modelled on `add-on-form.tsx` (same imports, `a11y`, `hydrated`, error and pending handling, `idPrefix="service-"`). Defaults type and fields:

```tsx
export type ServiceFormDefaults = {
  slug: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
};

// Body inside <form onSubmit={onSubmit} noValidate data-hydrated={hydrated} className="max-w-3xl space-y-8">:
<div className="grid gap-4 sm:grid-cols-2">
  <Field name="name" idPrefix="service-" label="Name (English)" error={errors.name}>
    <input
      {...a11y("name")}
      defaultValue={defaults.name}
      // Suggest the slug from the name while creating, until the admin edits the slug.
      onChange={(event) => {
        if (!slug && !slugTouched) setSuggested(slugFromName(event.target.value));
      }}
      className={adminFieldClass}
    />
  </Field>
  <Field name="nameFr" idPrefix="service-" label="Name (French)" hint="Optional — English is shown when empty." error={errors.nameFr}>
    <input {...a11y("nameFr")} defaultValue={defaults.nameFr} className={adminFieldClass} />
  </Field>
  <Field name="description" idPrefix="service-" label="Description (English)" hint="One line under the name on the home page." error={errors.description}>
    <textarea {...a11y("description")} rows={2} defaultValue={defaults.description} className={adminFieldClass} />
  </Field>
  <Field name="descriptionFr" idPrefix="service-" label="Description (French)" hint="Optional — English is shown when empty." error={errors.descriptionFr}>
    <textarea {...a11y("descriptionFr")} rows={2} defaultValue={defaults.descriptionFr} className={adminFieldClass} />
  </Field>
  <Field
    name="slug"
    idPrefix="service-"
    label="Web address"
    error={errors.slug}
    hint={slug ? "Can't change — links and saved quotes use it." : "Used in links, e.g. /packages?category=graduations"}
  >
    {slug ? (
      <input id="service-slug" value={slug} readOnly className={adminFieldClass} />
    ) : (
      <input
        {...a11y("slug")}
        value={suggested}
        onChange={(event) => {
          setSlugTouched(true);
          setSuggested(event.target.value);
        }}
        className={adminFieldClass}
      />
    )}
  </Field>
</div>
```
Props: `{ slug: string | null; defaults: ServiceFormDefaults }`. State: `const [suggested, setSuggested] = useState(defaults.slug); const [slugTouched, setSlugTouched] = useState(false);`. Submit calls `saveService(slug, Object.fromEntries(new FormData(form)))`. Button text: "Save service" / "Saving…".

- [ ] **Step 6: Pages**

`services/(list)/page.tsx` — `requireAdminPage("ADMIN")`; header "Services" + intro "What the studio offers. Archived services are hidden from the site and from new quotes and bookings; past work keeps its service." + `New service` button (`/admin/services/new`). `saved` status banner like Add-ons ("Saved. The site shows it now."). Table (no Suspense, same note as add-ons) with columns **Order** (two small outline buttons "↑"/"↓" with `aria-label="Move {name} up/down"`, built as a tiny client component `MoveButtons` in the same folder calling `moveService.bind(null, slug, dir)` in a transition; disable at the ends), **Service** (thumbnail 64×48 of `tileImage ?? defaultTileImage(slug)` via `StoredImage`, name link to edit, slug in mono), **Status** (`ActionSwitch` checked = active, label `Active: {name}`, onText "Active", offText "Archived", action `setServiceArchived.bind(null, slug)` inverted: pass `async (next) => setServiceArchived(slug, !next)` — wrap in a server action file export `setServiceActive(slug, active)` instead of an inline closure, since client components can only receive server actions: add to `actions/admin/services.ts`:
```ts
export async function setServiceActive(slug: string, active: boolean) {
  return setServiceArchived(slug, !active);
}
```
), **In use** (`usageTotal(usage)` with a `title` listing the counts), **Actions** (Edit link, "Change photo" link to `/admin/services/{slug}/photo`, `ConfirmDeleteButton` with `deleteService.bind(null, slug)`; the action explains refusals).

`services/new/page.tsx` — back link "← All services", h1 "New service", `<ServiceForm slug={null} defaults={{ slug: "", name: "", nameFr: "", description: "", descriptionFr: "" }} />`.

`services/[slug]/page.tsx` — load `db.service.findUnique({ where: { slug } })`, `notFound()` if missing; h1 "Edit {name}"; if archived show a muted note "Archived — hidden from the site."; `<ServiceForm slug={slug} defaults={…nulls → ""} />`.

`services/[slug]/photo/page.tsx` — move the body of the current `service-tiles/[slug]/page.tsx` here. Changes: `getServiceTileOptions(slug)` returning `null` → `notFound()`; name from `db.service.findUnique`; back link and Cancel go to `/admin/services`; `setServiceTile` import from `@/server/actions/admin/services`; drop `isCategorySlug`.

Redirects:
```tsx
// service-tiles/page.tsx
import { redirect } from "next/navigation";
export default function ServiceTilesMoved() {
  redirect("/admin/services");
}

// service-tiles/[slug]/page.tsx
import { redirect } from "next/navigation";
type Props = { params: Promise<{ slug: string }> };
export default async function ServiceTileMoved({ params }: Props) {
  redirect(`/admin/services/${(await params).slug}/photo`);
}
```

- [ ] **Step 7: Nav**

In `admin-nav.tsx` replace the Service tiles item with, under **Catalogue** as the first item:
`{ href: "/admin/services", label: "Services", icon: LayoutGrid, adminOnly: true },`

- [ ] **Step 8: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm vitest run`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add -A src tests/unit
git commit -m "feat(admin): manage services — create, edit, reorder, archive, delete, tile photo"
```

---

### Task 10: Messages cleanup

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`
- Test: `tests/unit/messages.test.ts`

- [ ] **Step 1: Remove dead keys**

Delete the `Categories` object and, under `Contact.types`, the six service keys (keep `other`, `privacy`) in both files. Then confirm nothing references them:

Run: `grep -rn "Categories\.\|namespace: \"Categories\"\|types\.\(wedding\|corporate\|family\|gathering\|professional\|product\)" src`
Expected: no output.

- [ ] **Step 2: Run**

Run: `pnpm vitest run tests/unit/messages.test.ts`
Expected: PASS (EN/FR key parity). If the test asserts the `Categories` namespace exists, delete that assertion.

- [ ] **Step 3: Commit**

```bash
git add messages tests/unit/messages.test.ts
git commit -m "chore: drop service names from message files"
```

---

### Task 11: End-to-end tests

**Files:**
- Modify: e2e files listed below
- Create: `tests/e2e/admin-services.global.spec.ts`
- Delete: `tests/e2e/admin-service-tiles.global.spec.ts`

- [ ] **Step 1: Mechanical updates**

```bash
cd tests/e2e
sed -i -E "s/'(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)'/'\L\1'/g; s/\"(CORPORATE|WEDDING|FAMILY|GATHERING|PROFESSIONAL|PRODUCT)\"/\"\L\1\"/g; s/::\"Category\"//g" *.ts
sed -i 's/getByLabel("Category")/getByLabel("Service")/' admin-package-tiers.global.spec.ts admin-packages.spec.ts admin-portfolio.global.spec.ts
git rm admin-service-tiles.global.spec.ts
grep -n "Category\|service-tiles\|categories" *.ts
```
Fix whatever the last grep shows by hand (e.g. `"AddOn".categories` in SQL → join `"_AddOnToService"`; `/admin/service-tiles` → `/admin/services`).

- [ ] **Step 2: New spec**

```ts
// tests/e2e/admin-services.global.spec.ts
import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// "global" project: services change the public site for every test.
const SLUG = "e2e-graduations";

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Quote" where category = $1`, [SLUG]);
  await queryDb(`delete from "Service" where slug = $1`, [SLUG]);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("an admin adds, archives and deletes a service", async ({ page, context, baseURL }, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  // Create
  await page.goto("/admin/services/new");
  await page.getByLabel("Name (English)").fill("E2E Graduations");
  await page.getByLabel("Name (French)").fill("E2E Remises de diplômes");
  await page.getByLabel("Description (English)").fill("Caps, gowns and proud families.");
  await page.getByLabel("Web address").fill(SLUG);
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");

  // Shown on the site, in both languages
  await page.goto("/en");
  await expect(page.getByRole("link", { name: /E2E Graduations/ })).toBeVisible();
  await page.goto("/fr");
  await expect(page.getByRole("link", { name: /E2E Remises de diplômes/ })).toBeVisible();
  await page.goto("/en/packages");
  await expect(page.getByRole("link", { name: "E2E Graduations" })).toBeVisible();
  await page.goto("/en/quote");
  await expect(page.locator(`select[name="category"] option[value="${SLUG}"]`)).toHaveCount(1);

  // An old quote keeps the name after archiving
  const [quote] = await queryDb<{ reference: string }>(
    `update "Quote" set category = $1
       where id = (select id from "Quote" order by "createdAt" limit 1)
     returning reference`,
    [SLUG],
  );

  await page.goto("/admin/services");
  await page.getByRole("switch", { name: "Active: E2E Graduations" }).click();
  await expect(page.getByRole("switch", { name: "Active: E2E Graduations" })).toHaveAttribute("aria-checked", "false");

  await page.goto("/en");
  await expect(page.getByRole("link", { name: /E2E Graduations/ })).toHaveCount(0);
  await page.goto("/en/quote");
  await expect(page.locator(`select[name="category"] option[value="${SLUG}"]`)).toHaveCount(0);
  if (quote) {
    await page.goto(`/admin/quotes/${quote.reference}`);
    await expect(page.getByText("E2E Graduations")).toBeVisible();
  }

  // Delete is refused while a quote uses it, allowed once unused
  await page.goto("/admin/services");
  const row = page.getByRole("row").filter({ hasText: "E2E Graduations" });
  if (quote) {
    await row.getByRole("button", { name: "Delete E2E Graduations" }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect(row.getByRole("alert")).toContainText("Archive it instead");
    await queryDb(`delete from "Quote" where category = $1`, [SLUG]);
    await page.reload();
  }
  await row.getByRole("button", { name: "Delete E2E Graduations" }).click();
  await row.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("row").filter({ hasText: "E2E Graduations" })).toHaveCount(0);
});

test("services are admin-only and the old tiles page redirects", async ({ page, context, baseURL }, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "STAFF");
  await page.goto("/admin/services");
  await expect(page.getByRole("heading", { name: "Services" })).toHaveCount(0);

  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "ADMIN");
  await page.goto("/admin/service-tiles");
  await expect(page).toHaveURL(/\/admin\/services$/);
  const response = await page.goto("/admin/services/parties/photo");
  expect(response?.status()).toBe(404);
});
```
Note: deleting a quote that the test borrowed would destroy fixture data — the `update … returning` above **moves** an existing quote; change it to insert a throwaway quote instead if `booking-fixture.ts` offers a helper (check it first and prefer the helper). Restore with `afterEach` either way.

- [ ] **Step 3: Tile photo flow**

Add to the same spec the old tile test, adapted: open `/admin/services/corporate/photo`, pick a consented photo from another service, "Use this photo", home page tile `img src` contains it, then pick "First launch photo" and confirm it reverts. Use the code from the deleted `admin-service-tiles.global.spec.ts` with URLs changed to `/admin/services/...` and the status text "Saved. The site shows it now." (match whatever Task 9 Step 6 prints).

- [ ] **Step 4: Run**

Check ListAgents for other sessions first, then:
Run: `pnpm test:e2e`
Expected: all pass. Fix failures in the files you changed; if an unrelated spec fails, rerun it alone to rule out flakiness and report it.

- [ ] **Step 5: Commit**

```bash
git add -A tests/e2e
git commit -m "test(e2e): admin-managed services"
```

---

### Task 12: Docs and final verification

**Files:**
- Modify: `AGENTS.md`, `docs/loop/PROGRESS.md` (if it tracks features)

- [ ] **Step 1: AGENTS.md**

- §1 "Services / package categories": add above the table: "Services are admin-managed (`Service` table, Admin → Services). The six below are the launch set; slugs never change once created."
- §6.10 CRUD list: add "services (create, edit EN/FR, reorder, tile photo, archive; delete only when unused)".
- §7: replace `enum Category { … }` with the `Service` model from Task 2 and change every `category Category` / `Category[]` / `Category?` in the summary to `String` (FK to `Service.slug`); note "AddOn ↔ Service is many-to-many".
- §8.1 "category minimum" wording stays.

- [ ] **Step 2: Definition of done**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md docs/loop/PROGRESS.md
git commit -m "docs: services are admin-managed"
```

- [ ] **Step 4: Hand-off note**

Tell the user: before merging, take a Neon backup/branch of production; the migration runs in `vercel-build`.
