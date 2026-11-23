# Seasonal offers — design

Date: 2026-11-23 · Status: approved (brainstorm) · Owner input: flyer "Christmas & Season Photoshoot & Family Photoshoot" (Mini $250 / Classic $400 / Premium $650, event coverage $750, add-ons). Owner wants seasonal bookings on the home page right after the hero, hidden when none are open.

## Goal

Let the owner run seasonal photo offers (Christmas first, others later) from admin, show them prominently on the home page, and let clients book them through the existing booking flow.

## Decisions

| Topic | Decision |
|---|---|
| Model | One admin-managed `Service` with slug `seasonal`. Offers are normal `Package`s in it. No new entity. |
| New data | `Package.regularPriceCents Int?` (strike-through price) and `Package.offerEndsAt DateTime?` (last day the offer is live). |
| Pricing | `regularPriceCents` is display only. Quotes and bookings charge `basePriceCents`. |
| Season headline | Service `name`/`description` (EN/FR). Rename the service each season. Tile photo = hero image. No new settings. |
| Home | New section directly after the hero. Not rendered when no live seasonal package. |
| Landing page | `/[locale]/seasonal`, flyer style. 404 when nothing live. |
| Booking | Existing wizard and availability. `/book?package=<slug>`. |

## 1. Data

Prisma migration adds to `Package`:

- `regularPriceCents Int?` — must be greater than `basePriceCents` when set.
- `offerEndsAt DateTime?` — stored UTC, entered in admin as a date and treated as end of that day in the studio time zone (`America/Toronto`).

Seed (flyer content, owner-supplied, so not invented):

- Service `seasonal`: EN "Christmas & Season Photoshoots", FR with `TODO(owner-fr): review`. Description from flyer.
- Packages (each `includedShooters` 1):
  - Mini Session — regular $350, offer $250, 1–1.5 h (`includedHours` 1), 15 edited photos.
  - Classic Session — regular $550, offer $400, 2–3 h, 35 edited photos.
  - Premium Session — regular $850, offer $650, 4–5 h, 60 edited photos, inclusion "20 high-end retouched photos".
  - Event Coverage — $750, no regular price, 7–8 h, basic colour correction, fast delivery; summary: church event, corporate party, year-end party.
  - Summary of the first three: "per couple shoot, family shoot, small event". Indoor/outdoor and couples/children/families welcome go in the description.
- Add-ons linked to the `seasonal` service: 10 × 15 inch printed frame $85 (`per_item`), professional reels video $350 (`flat`), high-end photo retouching $20/photo (`per_item`).
- Seed `offerEndsAt` is left null; the owner sets it in admin.
- Package hour values are integers in the schema; "1–1.5 h" stores 1 and the range is written in the summary. Owner may refine.

## 2. Live rule

`isOfferLive(pkg, now)` in `src/lib/seasonal/offer.ts` (pure, unit tested): true when `offerEndsAt` is null or `now` is before the end of the `offerEndsAt` day in studio time.

A seasonal package is shown and bookable when `isActive`, its service is not archived, and `isOfferLive`. Applies to:

- home section, `/seasonal`, `/packages` list and detail (also for non-seasonal packages that set `offerEndsAt`);
- `place-booking` and quote server actions: an expired package is rejected with the existing "unavailable" error, so old links and open tabs cannot book it.

The package queries stay cached (existing tags). `isOfferLive` is applied after the cached read, on every render, so expiry is not delayed by cache revalidation. Pages that call it are rendered dynamically.

## 3. Home section

File: `src/components/site/seasonal-booking-strip.tsx` (Server Component), placed in the home page directly after the hero, before the service tiles.

- Loads live packages of service `seasonal`. None → returns `null`.
- Content: eyebrow "Limited seasonal offer", `SectionHeading` with the service name (accent word), service description as intro, one card per package (name, summary, exact offer price, struck-through regular price with OFFER badge, hours, edited images, **Book** pill button → `/book?package=<slug>`), and a link "See all seasonal offers" → `/seasonal`. Optional "Offer ends {date}" line when `offerEndsAt` is set.
- Prices via `formatCAD`; layout mobile first, cards stack at 360 px, row at 1280 px. Motion ≤ 300 ms, reduced-motion respected.

## 4. `/seasonal` page

File: `src/app/[locale]/(site)/seasonal/page.tsx`.

Sections: header (service name, description, hero image from tile), package cards (same card component as home, with full inclusions), add-ons strip (seasonal add-ons with prices), ribbon "Limited booking slots. Book your date and confirm your preferred time." with **Book a Date** and **Get a Quote** CTAs, contact line from `siteConfig` (phone, Instagram, Facebook). No live package → `notFound()`.

SEO: `generateMetadata`, `hreflang` alternates, `Service` JSON-LD with offers, entry in `sitemap.ts` only while live. Nav item **Seasonal** added only while live; the site layout runs the live query once and passes a boolean to the header.

## 5. Admin

Existing Packages form (`package-form.tsx`, validators, `packages.ts` action, package import) gains two fields: **Regular price (CAD)** and **Offer ends on**. Package list shows an "Expired" badge when past `offerEndsAt`. Services, add-ons and bookings screens are unchanged. Cache tags for packages and services are revalidated as today.

## 6. Booking

No change to the wizard, availability, deposit or hold rules. `?package=<slug>` prefill already works. Seasonal bookings count against daily photographer capacity like any other.

## 7. Testing

- Unit: `isOfferLive` (null, later today, ended yesterday, time-zone boundary); package validator (regular > offer price, date parsing); booking and quote actions reject an expired package.
- E2E (Playwright): home strip visible with a live seasonal package and absent with none; Book opens the wizard with the package preselected; `/seasonal` 404s with none live.
- French copy marked `TODO(owner-fr): review`. Checked at 360 / 768 / 1280 / 1920 px, light and dark. Definition of done: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Out of scope

Per-campaign slot caps (calendar capacity already limits), separate campaign entity, automatic season theming, online payment.

## Assumptions to confirm

- A single `seasonal` service renamed each season, rather than one service per season.
- Regular price is display only; clients are charged the offer price.
