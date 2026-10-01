# Loop backlog — Cad Studio MVP

Derived from `AGENTS.md` §14. Do tasks top to bottom unless a dependency says otherwise.
Every task is done only when `pnpm lint && pnpm typecheck && pnpm test && pnpm build` passes.

Legend: `[ ]` todo · `[x]` done · `BLOCKED(Q#)` waiting on `OPEN_QUESTIONS.md`.

---

## M1 — Foundation · branch `feat/m1-foundation`

- [x] 1.1 Scaffold Next.js 15 (App Router, TS strict, pnpm), ESLint + Prettier, `lint`/`typecheck`/`format` scripts. (`test`, `test:e2e` added in 1.4; `db:*` in 1.7.) — §2, §3
- [x] 1.2 Tailwind v4 + shadcn/ui init. Put the palette tokens (`--ink`, `--paper`, `--accent`, `--accent-light`, `--muted`) in `globals.css` with light and dark themes. — §5
- [x] 1.3 Fonts via `next/font`: serif display for headings, Inter for body. — §5
- [x] 1.4 Vitest + Playwright setup, `test` + `test:e2e` scripts, with one passing smoke test each. Create the `tests/unit` and `tests/e2e` dirs. — §2, §4
- [x] 1.5 `src/config/site.ts`: name, contact, socials, `STUDIO_TIMEZONE`. Unknown values are `TODO(owner)`. — §4, §8.3, Q1, Q6
- [x] 1.6 `.env.example` with every variable from §11 (incl. `SHOW_SAMPLE_CONTENT`, `PRICING_CONFIRMED`, dummy `cadstudio.example` domain). Make sure `.gitignore` covers `.env*`. — §11
- [x] 1.7 Prisma + `db:migrate`/`db:seed`/`db:studio` scripts: `schema.prisma` with all models and enums from §7 (incl. `SiteSetting`, `PaymentMethod`, `*Fr` columns, `Customer.locale`), plus `src/lib/db.ts` singleton and the initial migration. — §7
- [x] 1.8 `prisma/seed.ts`: packages, add-ons, pricing rules (capacity 3, travel 40 km/$0.70), tax rates (with the accountant comment), `SiteSetting` (`CANCELLATION_POLICY`, `PAYMENT_INSTRUCTIONS` as `TODO(owner)` in EN/FR), fictional sample clients/portfolio projects/recommendations/reviews with `isSample = true` and placeholder images. — §7, §8.1, §8.2, §13
- [x] 1.9 Money and date helpers: `formatCAD`, `toCents`, `formatInStudioTz` + unit tests. — §9, §12
- [x] 1.10 Bilingual i18n with `next-intl`: `[locale]` routes (`en`, `fr`), middleware, message files for EN + FR (FR flagged `TODO(owner-fr): review`), `hreflang` alternates, locale-aware `formatCAD`/dates. — §4, §9
- [x] 1.11 Site layout: copy `assets/*.png` → `public/brand/`; header (black/white logo by theme, nav, Get a Quote / Book CTAs, EN/FR switcher), footer, theme toggle, skip link, "Pricing pending owner confirmation" banner unless `PRICING_CONFIRMED=true`. — §5, §13

## M2 — Content pages · branch `feat/m2-content`

- [x] 2.1 Home: hero with placeholder images, two CTAs, 6 category tiles. — §6.1
- [x] 2.2 Home: trust strip (stats as `TODO(owner)`), featured portfolio slot, owner intro, reviews carousel slot (approved + featured only), final CTA band. — §6.1, Q7
- [x] 2.3 Packages list: DB-driven, category filter tabs, cards with "from $X CAD", Customize quote and Book CTAs. Update the language-switcher e2e test to use `/en/packages` (path preservation). — §6.2
- [x] 2.4 Package detail `/packages/[slug]`: inclusions/exclusions, deliverables, sample images, FAQs, add-ons, terms summary. — §6.2
- [x] 2.5 About: owner profile from §6.8 facts only; everything else `TODO(owner)`. — §6.8, §13
- [x] 2.6 Contact: form (Zod, honeypot, Turnstile placeholder), Server Action, Resend email to admin. Service area text only — no street address, no map. — §6.9, §11
- [x] 2.7 Privacy and Terms pages covering PIPEDA, Law 25 and CASL (content marked for owner/legal review). — §9
- [x] 2.8 `generateMetadata` per page, `LocalBusiness` and `Service` JSON-LD, `sitemap.ts`, `robots.ts`. — §10

## M3 — Portfolio & Gallery · branch `feat/m3-portfolio-gallery`

- [x] 3.1 Cloudinary integration: image helper, `next/image` loader, blur placeholders, AVIF/WebP. — §2, §6.4, §10
- [x] 3.2 Portfolio list: cards with Local/Global badge; filters for category, reach and year. — §6.3
- [x] 3.3 Portfolio detail `/portfolio/[slug]`: story, approach, image set, optional quote, CTA. — §6.3
- [x] 3.4 Gallery grid: masonry/justified, lazy load, load more, category and tag filters. — §6.4
- [x] 3.5 Accessible lightbox: ←/→/Esc, swipe, focus trap, alt text on demand. Add the e2e test (scenario 6). — §6.4, §15
- [x] 3.6 `ImageGallery` JSON-LD; ISR tags for portfolio and gallery. — §10

## M4 — Quote engine · branch `feat/m4-quote`

- [x] 4.1 `src/lib/tax.ts` + tests for every tax regime. — §8.2
- [x] 4.2 `src/lib/pricing` `calculateQuote` with TDD: base, extra hours, extra shooters, add-on unit types, travel threshold, international flag, weekend, stat holiday, discounts, rounding, deposit. Coverage ≥ 90%. — §8.1
- [x] 4.3 Shared Zod quote input schema in `src/lib/validators`. — §6.5, §11
- [x] 4.4 `/quote` UI: multi-step form, live breakdown using the same function, guest-count hint, prefill from a package. — §6.5
- [x] 4.5 `createQuote` Server Action: server recomputes the price, `CAD-Q-YYYY-####` reference, 14-day expiry, rate limit, Turnstile. — §6.5, §11
- [x] 4.6 Quote emails (client summary + admin notification) with React Email. — §6.5
- [ ] 4.7 Result page with "Book this quote" CTA and the "Estimate only" notice. Add the e2e test (scenario 1). — §6.5, §15

## M5 — Booking · branch `feat/m5-booking`

- [ ] 5.1 `src/lib/booking` availability logic (blocked dates, past dates, lead days, daily capacity) with TDD, coverage ≥ 90%. — §8.3
- [ ] 5.2 Public availability endpoint returning `{date, status}` only. — §8.3
- [ ] 5.3 `/book` stepper: service → calendar (react-day-picker) → details → contact + consent → review with deposit amount + payment method choice (bank transfer / cash). — §6.6, §9
- [ ] 5.4 `createBooking` in a serializable transaction with capacity re-check and a `CAD-B-YYYY-####` reference. — §6.6, §8.3
- [ ] 5.5 Confirmation emails (client locale) with `.ics` attachment, deposit amount and "payment details will follow by email". — §6.6, §8.3
- [ ] 5.6 Signed reschedule/cancel links and request handling. — §6.6, §11
- [ ] 5.7 Vercel Cron job to expire `PENDING` bookings with no deposit `PENDING_HOLD_HOURS` after the payment request was sent. — §8.3
- [ ] 5.8 E2E tests: scenarios 2, 3 and 4. — §15

## M6 — Reviews · branch `feat/m6-reviews`

- [ ] 6.1 `/reviews`: customer reviews and recommendations sections, average rating, filter and sort. — §6.7
- [ ] 6.2 Submit-review form: always saved as `PENDING`, consent required, spam/profanity flag. — §6.7, §8.4
- [ ] 6.3 Verified-client tokens from completed bookings. — §6.7, §11
- [ ] 6.4 `AggregateRating` and `Review` JSON-LD for approved reviews only. — §6.7, §10

## M7 — Admin · branch `feat/m7-admin`

- [ ] 7.1 Auth.js v5 with `ADMIN`/`STAFF` roles, middleware, and a role check in every action. Add the e2e test (scenario 7). — §2, §11, §15
- [ ] 7.2 Dashboard: upcoming bookings, new quotes, pending reviews, revenue estimate. — §6.10
- [ ] 7.3 CRUD for packages, add-ons, pricing rules, tax rates and site settings (deposit %, cancellation policy, payment instructions); EN/FR fields side by side; `revalidateTag`. — §6.10, §7, §10
- [ ] 7.4 Portfolio and gallery admin: bulk upload, tags, reorder, required "Client consent to publish obtained" checkbox. — §6.10, §9
- [ ] 7.5 Review moderation: approve, reject, feature, logo permission. Add the e2e test (scenario 5). — §6.10, §8.4, §15
- [ ] 7.6 Bookings admin: list and calendar views, **Send payment request** (email prefilled from `PAYMENT_INSTRUCTIONS` + optional payment link, client locale), record deposit (method, amount, date) → `CONFIRMED`, flag bookings with no request after 24 h, status transitions, assign photographers, CSV export, `.ics`. — §6.6, §6.10
- [ ] 7.7 Quotes admin: list, convert to booking, adjust and re-send. — §6.10
- [ ] 7.8 Blocked dates and capacity management. — §6.10, §8.3
- [ ] 7.9 Audit log of admin changes. — §6.10

## M8 — Hardening · branch `feat/m8-hardening`

- [ ] 8.1 Upstash rate limiting on all public forms; real Turnstile wiring. — §11
- [ ] 8.2 WCAG 2.1 AA audit and fixes (contrast, focus, labels, announced errors, reduced motion). — §5, §9
- [ ] 8.3 SEO pass: metadata, OG images, noindex on admin, sitemap built from the DB. — §10
- [ ] 8.4 Performance pass: Lighthouse ≥ 90 on mobile, LCP < 2.5 s, CLS < 0.1. — §10
- [ ] 8.4b Pre-launch content check: list every `isSample`, `TODO(owner)` and `cadstudio.example` occurrence in the PR so the owner can replace them. — §13
- [ ] 8.5 Full e2e suite green (§15 scenarios 1–7, run in both `en` and `fr`); empty and skeleton states on every list page. — §12, §15
- [ ] 8.6 French completeness check: no missing FR keys, every `*Fr` seed field filled, list all `TODO(owner-fr)` items in the PR for review. — §9, Q12

## Out of scope for the loop

M9 Phase 2: Stripe deposits, PDF quotes, client portal, SMS/WhatsApp reminders. Requires explicit user go-ahead.
