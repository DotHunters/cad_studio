# Dynamic services — design

**Date:** 2026-10-06 · **Status:** approved by owner's developer · **Branch:** `feat/dynamic-services`

## Problem

The six services (corporate, wedding, family, gathering, professional, product) are a Prisma
`Category` enum. Their names and descriptions live in `messages/en.json` / `fr.json`
(`Categories.<slug>.*`), and the slug list is hardcoded in `src/lib/categories.ts` and
`src/lib/validators/contact.ts`. The owner cannot add, rename, reorder or remove a service
without a code change and a deploy.

## Goal

Admins manage services from the dashboard: create, edit (EN/FR name and description), reorder,
pick the home-tile photo, archive/restore, and delete when unused. The public site, forms,
emails and PDFs read services from the database.

## Decisions

- **Delete semantics: archive.** Archiving hides a service from the public site and from new
  quotes, bookings, reviews and enquiries; existing records keep showing its name. Hard delete
  is allowed only when no row references the service.
- **Keys: slug.** `Service.slug` is the primary key and other tables reference it. The slug is
  set at creation and never changes, so URLs (`?category=wedding`), the pricing engine and saved
  line items keep working. Display names change freely.

## 1. Data model and migration

```prisma
model Service {
  slug          String    @id          // ^[a-z0-9]+(-[a-z0-9]+)*$, max 40, locked after creation
  name          String
  nameFr        String?
  description   String
  descriptionFr String?
  sortOrder     Int       @default(0)
  archivedAt    DateTime?               // null = active
  tileImageId   String?                 // home tile photo; null = first launch photo of the service
  tileImage     Image?    @relation("ServiceTile", fields: [tileImageId], references: [id], onDelete: SetNull)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  // back-relations: packages, addOns, quotes, bookings, projects, images, reviews
}
```

- `Package.category`, `Quote.category`, `Booking.category`, `PortfolioProject.category` become
  `String` foreign keys to `Service.slug`; `Image.category` and `Review.category` become optional
  `String?` foreign keys. All with `onDelete: Restrict`, `onUpdate: Cascade`. Column names stay
  `category`.
- `AddOn.categories Category[]` becomes an implicit many-to-many relation `services Service[]`.
  Queries map it back to `categories: string[]`, so `src/lib/pricing/**` is unchanged.
- One migration, in one transaction:
  1. Create `Service`; insert the six current services with `sortOrder` 0–5 and EN/FR names and
     descriptions copied from `messages/en.json` / `fr.json`.
  2. For each category column: `ALTER COLUMN ... TYPE TEXT USING lower("category"::text)`, then
     add the foreign key and an index.
  3. Create the add-on join table and fill it from `unnest(lower(categories))`; drop
     `AddOn.categories`.
  4. Copy `SiteSetting['SERVICE_TILE_IMAGES']` (slug → image id) into `Service.tileImageId`
     where the image still exists; delete the setting.
  5. Drop the `Category` enum.
- Seed (`prisma/seed.ts`) upserts the six services before anything that references them.

## 2. Admin → Services

Replaces Admin → Showcase → Service tiles (`/admin/service-tiles` redirects to `/admin/services`).

- **List** — services in `sortOrder` with move up/down, status (Active / Archived), tile photo
  thumbnail and usage counts (packages, quotes, bookings, portfolio projects).
- **Create / edit** — EN and FR name and description side by side; tile photo picker (reused
  from Service tiles, photos of this service first). Slug is suggested from the English name and
  editable only on create; must match the slug pattern and be unique.
- **Archive / restore** — refused when it would leave no active service.
- **Delete** — enabled only when every usage count is zero (packages, add-on links, quotes,
  bookings, projects, images, reviews); otherwise the button is disabled with the reason and
  points to Archive. The server re-checks inside the action.
- `ADMIN` role required; every change written to the audit log; `revalidateTag("services")`
  (plus `packages`, `gallery`, `portfolio`) on save.

## 3. Public site

- `src/server/queries/services.ts`: cached `getServices()` (tag `services`) returning all
  services ordered by `sortOrder`, each with `active`. `src/lib/services.ts`: pure helpers —
  `serviceName(service, locale)` / `serviceDescription(...)` (French falls back to English),
  `activeServices(list)`, `isValidServiceSlug(slug)`, `slugFromName(name)`.
- `src/lib/categories.ts`, `categorySlugs`, `categoryFromSlug`, `slugFromCategory` and the
  `Categories.<slug>.name/description` message keys are removed. Every caller uses the service
  list instead; client components (quote form, booking wizard, review form, packages filter,
  contact form) receive `{ slug, name }[]` as props.
- **Active services** appear in home tiles, packages filter, quote/booking/review service
  pickers and contact enquiry types (`services + "other" + "privacy"`).
- **Archived services** are hidden from all of those. Their packages are excluded from
  `/packages`, quote and booking options and the sitemap; their package detail pages return 404.
  Portfolio projects and gallery images of an archived service stay visible and show its name,
  but filter chips list active services only. Existing quotes, bookings, reviews, emails, PDFs
  and admin screens show the name of any service, archived or not.
- **Validation** — Zod schemas accept any slug-shaped string; server actions then require the
  service to exist and be active for new quotes, bookings, reviews and contact enquiries
  (friendly field error otherwise). Unknown or archived `?category=` filters are ignored.
- Launch photo config (`scripts/photos.config.mjs`) keeps its category strings; they must name
  existing service slugs.

## 4. Testing

- **Unit** — slug pattern and `slugFromName`; name/description fallback; delete guard (usage
  counts); archive guard (last active service); add-on relation mapping; service-tile choice
  helpers adapted to `tileImageId`.
- **E2E** — admin creates "Graduations" → appears on home tiles, packages filter, quote and
  booking pickers; archive it → gone from those, an existing quote still shows the name; delete
  blocked while in use, allowed when unused; French names shown under `/fr`.
- Existing unit and e2e tests updated from enum values to slugs.
- Done = `pnpm lint && pnpm typecheck && pnpm test && pnpm build` and `pnpm test:e2e` pass.

## 5. Docs and rollout

- Update AGENTS.md §1 (services are admin-managed; six seeded), §6.10 (Services screen) and §7
  (`Service` model replaces the enum).
- The migration runs on deploy via `vercel-build`. Take a Neon backup (branch) of production
  before merging.

## Out of scope

- Per-service pricing behaviour beyond what packages and add-ons already express.
- Renaming slugs or redirecting old slugs.
- Per-service icons.
