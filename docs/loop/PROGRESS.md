# Loop progress log

Append-only. Newest entry at the bottom. One entry per tick that did something.

## Template

```
### YYYY-MM-DD HH:MM — <task id> <short title>
- Branch: feat/m<N>-<slug> @ <short sha>
- Done: <what changed, 1–3 bullets>
- Checks: lint ✅/❌ · typecheck ✅/❌ · test ✅/❌ · build ✅/❌
- PR: <url, or compare link if gh is unavailable>
- Blockers / notes: <Q# references, follow-ups>
- Next: <next task id>
```

---

### 2026-10-01 — setup
- Loop kit created: `.claude/loop.md`, `docs/loop/TASKS.md`, `docs/loop/OPEN_QUESTIONS.md`, `docs/loop/PROGRESS.md`. Renamed `AGENT.MD` → `AGENTS.md`.
- Note: `gh` CLI installed later; M1 PR: https://github.com/DotHunters/cad_studio/pull/1
- Next: 1.1

### 2026-10-01 — 1.1 Scaffold Next.js 15
- Branch: feat/m1-foundation
- Done: Next.js 15.5 (App Router, src/, TS strict, Turbopack) + Tailwind v4 scaffold; ESLint (next + prettier, `no-explicit-any`, `no-console`) + Prettier (tailwind plugin); scripts `lint`, `typecheck`, `format`, `format:check`; `.npmrc` hoists eslint/prettier plugins (needed for pnpm + FlatCompat); `.gitignore` allows `.env.example`; placeholder home page.
- Checks: lint ✅ · typecheck ✅ · test — (no runner until 1.4) · build ✅
- Notes: installed pnpm 10 globally (was missing). pnpm build-script allowlist in `package.json` → `pnpm.onlyBuiltDependencies`; add `@prisma/*`, `sharp`, etc. there when needed.
- Next: 1.2

### 2026-10-01 — 1.2 Tailwind + shadcn + palette
- Branch: feat/m1-foundation
- Done: shadcn/ui init (base-nova style, Base UI, lucide); brand palette as `--brand-*` tokens mapped onto shadcn semantic tokens for light + `.dark`; Tailwind colours `ink`, `paper`, `gold`, `gold-light`, `gold-text`; reduced-motion CSS; `.gitattributes` forces LF (Prettier vs Windows CRLF). Replaced shadcn's dependency on the third-party `cn` npm package with the standard `clsx` + `tailwind-merge` helper. Button `link` variant uses `gold-text` for contrast. AGENTS.md §5 updated with token names + contrast notes.
- Checks: lint ✅ · typecheck ✅ · test — (until 1.4) · build ✅ · format ✅
- PR: open at https://github.com/DotHunters/cad_studio/compare/main...feat/m1-foundation?expand=1 (no gh CLI)
- Notes: shadcn init also added Geist font to layout — replaced in 1.3.
- Next: 1.3

### 2026-10-01 — 1.3 Fonts
- Branch: feat/m1-foundation
- Done: `src/app/fonts.ts` — Inter (body, `--font-inter`) + Cormorant Garamond (headings, `--font-cormorant`, 400–700 + italic), latin + latin-ext for French; Tailwind `font-sans`/`font-heading` mapped with system fallbacks; h1–h4 use heading font. Removed shadcn's Geist.
- Checks: lint ✅ · typecheck ✅ · test — (until 1.4) · build ✅ · format ✅
- Next: 1.4

### 2026-10-01 — 1.4 Vitest + Playwright
- Branch: feat/m1-foundation
- Done: Vitest 5 (node env, `@/` paths, v8 coverage over `src/lib/**`) with `cn` unit tests; Playwright (desktop Chrome + Pixel 7 projects, builds and serves on port 3100) with home-page smoke test; scripts `test`, `test:watch`, `test:coverage`, `test:e2e`.
- Checks: lint ✅ · typecheck ✅ · test ✅ (2) · e2e ✅ (2) · build ✅ · format ✅
- Notes: Chromium installed locally via `pnpm exec playwright install chromium`. Full DoD now runnable.
- Next: 1.5

### 2026-10-01 — 1.5 Site config
- Branch: feat/m1-foundation
- Done: `src/config/site.ts` — name "Cad Studio", tagline, owner, Scarborough/ON service area (no street address), dummy `cadstudio.example` URL/emails, `STUDIO_TIMEZONE` with validated fallback to `America/Toronto`, locales `en`/`fr`, `Locale` type. Phone, socials, hours = `TODO(owner)`. 5 unit tests.
- Checks: lint ✅ · typecheck ✅ · test ✅ (7) · build ✅ · format ✅
- Next: 1.6

### 2026-10-01 — 1.6 .env.example
- Branch: feat/m1-foundation
- Done: `.env.example` with comments, grouped by concern; confirmed it's tracked (`!.env.example`) while `.env*` stays ignored. Spec deviations (AGENTS.md §11 updated): browser-read keys renamed `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`; added `UPSTASH_REDIS_REST_URL/TOKEN` (rate limiting), `LINK_TOKEN_SECRET` (signed links), `CRON_SECRET` (Vercel Cron) — all required by existing spec features.
- Checks: lint ✅ · typecheck ✅ · test ✅ · build ✅ · format ✅
- Next: 1.7 (Prisma) — needs a Postgres for `migrate dev`; will use local Docker or generate migration SQL offline if unavailable.
- Next: 1.7

### 2026-10-01 — 1.7 Prisma schema
- Branch: feat/m1-foundation
- Done: Prisma 7.10 (pinned stable; npm `latest` is an 8.0 RC) with `prisma.config.ts` (loads `.env.local`), `prisma-client` generator → `src/generated/prisma` (gitignored, `postinstall` generates), `@prisma/adapter-pg`. Full schema for all §7 models + relations, `*Fr` columns, FAQs, consent/sample flags, `ReferenceCounter`, indexes. `src/lib/db.ts` server-only singleton. Scripts `db:generate`, `db:migrate`, `db:deploy`, `db:seed`, `db:studio`. Initial migration `20261001000000_init` (14 tables) generated offline with `prisma migrate diff`.
- Checks: lint ✅ · typecheck ✅ · test ✅ · build ✅ · format ✅ · `prisma validate` ✅
- Blockers: resolved — owner installed local Postgres (`localhost:5432/cad_studio`); migration applied and seed loaded.
- Next: 1.8

### 2026-10-01 — 1.8 Seed
- Branch: feat/m1-foundation
- Done: `prisma/seed-data.ts` (6 packages EN+FR, 7 add-ons, 13 pricing rules in cents/whole %, 14 tax regions with accountant comment, `CANCELLATION_POLICY`/`PAYMENT_INSTRUCTIONS` TODO(owner) EN/FR, 4 fictional sample projects with 25 `placeholder/…` images, 4 `[SAMPLE]` reviews approved but `isSample`-gated). `prisma/seed.ts` idempotent upserts; site settings create-only so owner edits survive re-seeding. 14 unit tests on seed invariants.
- Checks: lint ✅ · typecheck ✅ · test ✅ (21) · build ✅ · format ✅ · **migrate deploy + seed ×2 verified against PGlite** (in-memory Postgres, scratchpad only — not added to project).
- Notes: placeholder image convention `publicId = "placeholder/<slug>-<n>"` → loader must render via placehold.co (task 3.1). French drafted by agent → `TODO(owner-fr): review`.
- Next: 1.9

### 2026-10-01 — 1.9 Money + date helpers
- Branch: feat/m1-foundation
- Done (TDD): `src/lib/money.ts` — `formatCAD(cents, locale, {suffix})` → "$1,250.00 CAD" / "1 250,00 $ CAD", rejects non-integer cents; `toCents(number|string)` rounds via decimal representation (1.005 → 101, 0.1+0.2 → 30), parses "$1,250.50", rejects >2 decimals/NaN/∞. `src/lib/dates.ts` — `formatInStudioTz(date, pattern, locale, tz)` (date-fns-tz, enCA/frCA), `studioDateKey()` for availability. 16 new tests (DST/EST, midnight boundary, French months).
- Checks: lint ✅ · typecheck ✅ · test ✅ (37) · build ✅ · format ✅
- Notes: one build failed with Next "Invariant: no direct app page entry found for /_not-found" — stale `.next` cache; `rm -rf .next` fixed it. Owner's local Postgres verified: schema up to date, seed counts match.
- Next: 1.10

### 2026-10-01 — 1.10 Bilingual i18n
- Branch: feat/m1-foundation
- Done: next-intl 4 — `src/i18n/{routing,navigation,request}.ts`, middleware (skips `api`, `admin`, `_next`, files), `localePrefix: "always"` so `/` → `/en` (or `/fr` by Accept-Language). App moved to `src/app/[locale]/(site)`; `[locale]/layout.tsx` owns `<html lang="en-CA|fr-CA">`, fonts, `NextIntlClientProvider`, metadata with `hreflang` alternates (en-CA, fr-CA, x-default). Localized 404 via `[...rest]` catch-all + global fallback 404. Typed messages (`AppConfig`) so bad keys/locales fail typecheck. `messages/en.json` + `fr.json` (FR flagged in `messages/README.md`).
- Checks: lint ✅ · typecheck ✅ · test ✅ (40, incl. EN/FR key parity + brand-name guard) · e2e ✅ (8) · build ✅ · format ✅
- Notes: admin stays English-only, outside `[locale]`. Locale-aware `formatCAD`/dates already take `Locale` (1.9).
- Next: 1.11

### 2026-10-01 — 1.11 Site layout — **M1 Foundation complete**
- Branch: feat/m1-foundation
- Done: logos → `public/brand/`; `Logo` (black/white by theme, gold variant); favicon `icon.png` + `apple-icon.png` from the logo's gold heart on an ink rounded square (default favicon removed). `SiteHeader` (sticky, nav, Book a Date / Get a Quote CTAs, EN↔FR switcher keeping the path, theme toggle), `MobileNav` (aria-expanded, Esc/route-change close), `SiteFooter` (gold logo, service area, nav, legal, dummy email), skip link, `next-themes` (class, system default), pricing banner. `src/lib/flags.ts`: `shouldShowPricingBanner` (unless `PRICING_CONFIRMED=true` or Vercel production) and `shouldShowSampleContent` (needs `SHOW_SAMPLE_CONTENT=true`, never Vercel production). Verified visually: desktop light/dark, 360px mobile.
- Checks: lint ✅ · typecheck ✅ · test ✅ (47) · e2e ✅ (18) · build ✅ · format ✅
- Notes: nav links point to pages built in M2+ (404 until then). Language-switcher e2e uses `/en` for now; 2.3 switches it to `/en/packages`.
- Next: M2 → 2.1 (branch `feat/m2-content` from `feat/m1-foundation` while PR #1 is unmerged)

### 2026-10-01 — Fix: French pages rendered English content (found during 2.1)
- Branch: feat/m1-foundation
- Bug: middleware matcher `.*\..*` was written as `"…|.*\..*"` in a TS string → regex `.*..*` (any 2+ chars), so the middleware skipped every path except `/`. `/fr` got `lang="fr-CA"` and French metadata (explicit locale) but all component text in English. The 1.10 e2e test only checked the title, so it passed.
- Fix: `"\."` in `src/middleware.ts`; `tests/unit/middleware.test.ts` asserts which paths are localized vs skipped; French smoke test now checks rendered content.
- Checks: lint ✅ · typecheck ✅ · test ✅ · e2e ✅ (18) · build ✅ · format ✅

### 2026-10-01 — 2.1 Home hero + category tiles
- Branch: feat/m2-content (stacked on feat/m1-foundation; PR #1 unmerged)
- Done: `HomeHero` (full-bleed cross-fading `HeroSlideshow`, 6 s interval, pause/play control per WCAG 2.2.2, starts paused under reduced motion; headline, subtitle, Get a Quote + Book a Date CTAs). `CategoryTiles` (6 tiles → `/packages?category=<slug>`). `src/lib/categories.ts` slug↔enum map; `src/lib/images.ts` placehold.co helper (blank by default — labels clashed with overlaid text in screenshots; text colour = background since placehold.co always prints something). `next.config` allows placehold.co, AVIF/WebP. EN + FR copy.
- Found + fixed on M1 (`0b0212f`): middleware matcher bug made every `/fr` page render English content — see entry above. M2 rebased onto it.
- Checks: lint ✅ · typecheck ✅ · test ✅ (66) · e2e ✅ (28) · build ✅ · format ✅ · visual check EN desktop + FR mobile
- PR: https://github.com/DotHunters/cad_studio/pull/2 (base feat/m1-foundation)
- Next: 2.2

### 2026-10-01 — 2.1 refinement: reference-site design pass + owner gold gradient
- Branch: feat/m2-content
- Owner shared chanthans.com as a design reference (ideas only — no copy/photos/branding taken) and a metallic gold gradient for buttons and lines.
- Done: `HeaderShell` — transparent header with white logo + light text over the home hero, solid after 24 px scroll; uppercase letter-spaced nav. Centred full-height hero: trust pill (owner facts only: 10+ years, event management, Toronto · Canada), serif headline with italic gold accent word (`t.rich`), pill CTAs (`Button size="cta"`), slide indicator dashes (clickable, `aria-current`), scroll cue. `SectionHeading` + `Accent` (eyebrow, gold rule, serif title, intro) — categories section uses it. Gradient: `--brand-gold-gradient`; `bg-gold-gradient` (exact, lines/accents only) and `bg-gold-button` (25% white tint so ink text is ≥5.1:1 — raw gradient measured 2.9:1 worst case) as the default `Button` variant, mobile-menu CTA and skip link. Gradient lines: active slide indicator, trust dot, section rule, footer hairline. AGENTS.md §5 documents the gradient, contrast rule and design patterns. Q14 (WhatsApp number) added.
- Checks: lint ✅ · typecheck ✅ · test ✅ (66) · e2e ✅ (36) · build ✅ · format ✅ · screenshots EN desktop light/dark, FR mobile
- Notes: Windows `.next` lock flakiness (build invariant / e2e "no production build") — retry clears it; loop.md now documents it. Untracked `README.md` belongs to the owner — not committed by the loop.
- Next: 2.2 (use SectionHeading + patterns from AGENTS.md §5)

### 2026-10-01 — 2.2 Home: intro, why-us, featured portfolio, reviews, final CTA
- Branch: feat/m2-content · PR #2 (retargeted to `main` after PR #1 was merged with a merge commit — no rebase needed)
- Done: `HomeIntro` (split statement + owner note, signature "I. Rukshan", About CTA), `WhyUs` dark band (3 reason cards from owner facts, stats strip shown only when ≥2 owner-confirmed stats — `siteConfig.stats`, events/countries TODO(owner); "Trusted by" consented client names; "Ready to plan your date?" bar), `FeaturedPortfolio` (3 featured projects, Local/Global + Sample badges, client name only with consent, "View all work"), `ReviewsCarousel` (approved+featured+consented, CSS scroll-snap, focusable, star ratings with text labels, average + count), `FinalCta`. Data: `src/server/queries/home.ts` with `unstable_cache` tagged `portfolio`/`reviews`, page `revalidate = 3600`. Helpers + tests: `localize()` (FR fallback), `averageRating()`, `storedImageSrc()` (placeholder ids → shaded blanks; real ids throw until 3.1). Headings use lining numerals (Cormorant's "10" read as "IO").
- Bug found + fixed: the sample flag was read inside `unstable_cache`, so a build without `SHOW_SAMPLE_CONTENT` cached sample-free results that a later run reused. Flag is now an argument (part of the cache key); reproduced the failing build→e2e sequence and it passes.
- Checks: lint ✅ · typecheck ✅ · test ✅ (76) · e2e ✅ (48) · build ✅ · format ✅ · full-page screenshot reviewed
- Notes: e2e webServer sets `SHOW_SAMPLE_CONTENT=true`. Owner's `.env.local` has no `SHOW_SAMPLE_CONTENT`, so samples are hidden in their local dev until they add `SHOW_SAMPLE_CONTENT=true`.
- Next: 2.3

### 2026-10-01 — 2.3 Packages list
- Branch: feat/m2-content · PR #2
- Done: `/[locale]/packages` — DB-driven via cached `getActivePackages()` (tag `packages`), `CategoryFilter` (link-based tabs, `?category=`, `aria-current`, works without JS; unknown/repeated values → All), `PackageCard` (category, localized name/summary/inclusions, "From $X CAD" via `formatCAD`, hours/photographers/edited images with ICU plurals, Customize quote → `/quote?package=slug`, Book → `/book?package=slug`), empty state, tax note, metadata + hreflang. Deferred 1.11 follow-ups done: language-switcher e2e now verifies `/en/packages → /fr/packages`; solid-header test uses `/en/packages`.
- Checks: lint ✅ · typecheck ✅ · test ✅ (76) · e2e ✅ (60) · build ✅ · format ✅ · screenshot reviewed
- Next: 2.4

### 2026-10-01 — 2.4 Package detail
- Branch: feat/m2-content · PR #2
- Done: `/[locale]/packages/[slug]` — breadcrumb (Packages › category › name), markdown description (`react-markdown`, no raw HTML), included/not included, add-ons linked to the package with unit prices (/ hour, / item), sample images (when present), link to portfolio filtered by category, FAQs as `<details>` (when present), sticky aside with "Starting at" price, deliverables (coverage, photographers, edited images, turnaround), Customize quote + Book CTAs, booking terms (deposit % from `PricingRule`, cancellation policy from `SiteSetting`), dark CTA band. 404 for unknown/inactive slugs. Metadata + hreflang. Queries `getPackageBySlug`, `getBookingTerms` (cached, tagged). `src/lib/content.ts`: `parseLocalizedText`, `parseFaqs`, `publishableText` (hides seeded "TODO(owner)" copy from public pages).
- Caught in review: drafted copy invented a payment policy ("balance due before delivery") — removed; only the DB deposit % is stated. Message test caught an empty translation key.
- Checks: lint ✅ · typecheck ✅ · test ✅ (82) · e2e ✅ (76) · build ✅ · format ✅ · screenshot reviewed
- Notes: seed has no package FAQs or package images, so those sections are hidden until the owner adds them in admin (7.3/7.4).
- Next: 2.5

### 2026-10-01 — 2.5 About
- Branch: feat/m2-content · PR #2
- Done: `/[locale]/about` — intro (Cad Studio = Collection Art Design, Scarborough, founded by I. Rukshan), owner profile (portrait placeholder, role, 10+ years, event management, base), dark "why event experience matters" band (3 client benefits per §6.8), areas served, contact/packages CTAs, metadata + hreflang. Only owner-provided facts; story/team/equipment left as a `TODO(owner)` code comment (not rendered). No pronouns for the owner (none stated).
- Bug found + fixed: ICU MessageFormat treats `'` before `<`/`{` as a quote, so French `l'<accent>…` and `d'<accent>…` rendered the raw tag — also affected the FR home final heading shipped in 2.2. Switched to typographic ’; unit test now forbids `'<` / `'{` in messages; e2e regression on `/fr`.
- Checks: lint ✅ · typecheck ✅ · test ✅ · e2e ✅ (88) · build ✅ · format ✅
- Next: 2.6

### 2026-10-01 — 2.6 Contact
- Branch: feat/m2-content · PR #2
- Done: `/[locale]/contact` — heading, email (dummy, TODO owner), service area (no address/map per owner), quote link; `ContactForm` (React Hook Form + Zod resolver, labels, inline translated errors with `aria-invalid`/`aria-describedby`, focus first error, loading spinner, success state + "send another", sonner toast for server/captcha errors, honeypot hidden from AT, PIPEDA purpose notice linking `/privacy`, "Privacy request" enquiry type for access/deletion). Shared `contactSchema` (Zod 4; error messages are translation keys). `submitContact` server action re-validates, fakes success on honeypot hits, verifies Turnstile when `TURNSTILE_SECRET_KEY` is set (widget in 8.1), emails admin via Resend with reply-to. `sendEmail` skips with a warning when `RESEND_API_KEY` is missing outside Vercel production, throws in production. `<Toaster>` mounted in the locale layout.
- Checks: lint ✅ · typecheck ✅ · test ✅ (88) · e2e ✅ (102) · build ✅ · format ✅
- Notes: no `RESEND_API_KEY` locally → enquiries are logged, not sent. Rate limiting is 8.1. Admin email is plain text; client-facing React Email templates come with quotes/bookings (4.6/5.5).
- Next: 2.7

### 2026-10-01 — 2.7 Privacy & Terms
- Branch: feat/m2-content · PR #2
- Done: `/[locale]/privacy` and `/[locale]/terms` rendered from `content/legal/{privacy,terms}.{en,fr}.md` (editable without code) via `LegalPage` (react-markdown with `skipHtml`, locale-aware internal links, styled headings/lists), "Last updated" date per doc, visible draft notice until `LEGAL_REVIEWED=true` (new flag + `.env.example`). Privacy covers PIPEDA (purposes, consent, safeguards, access/correction/deletion via the contact form's privacy request, 30-day response, OPC), Québec Law 25 (privacy officer, portability, CAI), CASL (unchecked opt-in, consent timestamp, unsubscribe, transactional exemption), photo/review consent, providers + cross-border note, essential cookies only. Terms reflect the spec's flows (estimates, booking confirmed on deposit, offline payment instructions, release of unpaid holds, reschedule/cancel link, copyright, review moderation, Ontario law).
- Unknowns are `<!-- TODO(owner/legal) -->` comments (never rendered) → new Q15 lists everything legal must decide.
- Checks: lint ✅ · typecheck ✅ · test ✅ (98; incl. EN/FR section parity, no visible TODOs, §9 coverage) · e2e ✅ (110) · build ✅ · format ✅
- Next: 2.8

### 2026-10-01 — 2.8 SEO — **M2 Content pages complete**
- Branch: feat/m2-content · PR #2
- Done: `pageMetadata()` helper (canonical, en-CA/fr-CA/x-default alternates, Open Graph with per-page title, og:locale + alternate, 1200×630 `public/brand/og-default.png` generated from the gold logo, Twitter large card) used by every page; layout keeps `metadataBase` + title template. JSON-LD via `<JsonLd>` (escapes `<`): `ProfessionalService` on home (service area only, no street address, founder), `Service` on package pages (offers only when `PRICING_CONFIRMED=true` — new `isPricingConfirmed` flag), `Person` on About. `sitemap.ts` (static pages + active packages from DB, fr-CA alternates, hourly revalidate) and `robots.ts` (disallow /admin, /api; previews fully blocked).
- Caught by test: the `<`→`<` escape in `serializeJsonLd` lost its backslash when written (same class as the middleware bug); fixed via `chr(92)`; added a "Tooling pitfalls" section to `.claude/loop.md`.
- Checks: lint ✅ · typecheck ✅ · test ✅ (108) · e2e ✅ (124) · build ✅ · format ✅
- Next: M3 → 3.1 (branch `feat/m3-portfolio-gallery`; stack on feat/m2-content while PR #2 is open)

### 2026-10-01 — PR housekeeping
- PR #1 (M1) and PR #2 (M2) were merged by the owner. PR #2 was merged at 2.3 (`da4e20d`); 2.4–2.8 were pushed afterwards, so opened **PR #3** (`feat/m2-content` → `main`) for those five commits.
- M3 branch `feat/m3-portfolio-gallery` is stacked on `feat/m2-content` until PR #3 merges.
- Lesson for the loop: once a milestone PR is merged, check `git log main..<branch>` before pushing more to that branch; open a follow-up PR if needed.

### 2026-10-01 — 3.1 Cloudinary image delivery
- Branch: feat/m3-portfolio-gallery (stacked on feat/m2-content / PR #3)
- Done: `src/lib/cloudinary.ts` — `cloudinaryUrl` (`f_auto` → AVIF/WebP, `q_auto`/`q_N`, `c_limit,w_N`, path-safe public ids, clear error without `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`), `cloudinaryLoader` for next/image, `solidBlurDataUrl`. `StoredImage` client component (Cloudinary loader for real ids; shaded blanks for seeded `placeholder/…` ids; blur-up placeholder for both; `alt` required). `storedImageSrc` now delivers real ids via Cloudinary (for OG/JSON-LD uses). New `Image.blurDataUrl` column (migration `20261001120000_image_blur_data_url`, generated by diffing against the previous schema — no shadow DB; applied to the local DB). Featured portfolio + package detail use `StoredImage`. `res.cloudinary.com` allowed in next.config.
- Checks: lint ✅ · typecheck ✅ · test ✅ (115) · e2e ✅ (126) · build ✅ · format ✅
- Notes: no Cloudinary account yet — only placeholder images render until the owner sets `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (+ API key/secret for uploads in 7.4). Blur data for real images is generated at upload (7.4).
- Next: 3.2

### 2026-10-01 — 3.2 Portfolio list
- Branch: feat/m3-portfolio-gallery · PR #4 (stacked on #3)
- Done: `/[locale]/portfolio` — published case studies (cached `getPublishedProjects`, sample flag in cache key, client names only with consent), filter groups for category / Local–Global / year (year only when >1 year exists) as links that keep the other filters (`src/lib/portfolio-filters.ts`: `parsePortfolioFilters`, `filterProjects`, `filterHref`, unit tested), live result count, empty state with "Clear filters", metadata. `ProjectCard` extracted and shared with the home page's featured section (now also shows the year). `/portfolio` added to the sitemap. Package pages' "See … in our portfolio" link now lands on a filtered view.
- PR #3/#4: Vercel preview deployments are Ready (owner connected Vercel); previews are behind Vercel Authentication, so content couldn't be checked from here.
- Checks: lint ✅ · typecheck ✅ · test ✅ (121) · e2e ✅ (136) · build ✅ · format ✅
- Next: 3.3

### 2026-10-01 — 3.3 Portfolio case study
- Branch: feat/m3-portfolio-gallery · PR #4 (PR #3 merged → #4 retargeted to `main`)
- Done: `/[locale]/portfolio/[slug]` — back link, category + Sample badge, title, lead image (priority), markdown story (`skipHtml`), client recommendation (approved, consented `RECOMMENDATION` whose company matches the consented client name), facts aside (client or "Private client", category, location, year, reach), remaining images grid with count, CTA to quote + category packages. 404 for unknown/unpublished/hidden-sample. `getProjectBySlug` cached with portfolio + reviews tags, sample flag in key. Case studies added to the sitemap.
- Checks: lint ✅ · typecheck ✅ · test ✅ · e2e ✅ (150) · build ✅ · format ✅
- Notes: image grid becomes lightbox-enabled in 3.5.
- Next: 3.4

### 2026-10-01 — 3.4 Gallery grid
- Branch: feat/m3-portfolio-gallery · PR #4
- Done: `/[locale]/gallery` — masonry via CSS columns (images keep real aspect ratio), first row `priority`, rest lazy-loaded, blur placeholders via `StoredImage`; category and tag filters (tag row only when >1 tag exists) as links; "Load more" via `?page=N` (12 per step, capped at 50 pages, works without JS); "Showing X of Y" status; empty state. Only `inGallery && consentToPublish` images (AGENTS.md §9), samples gated. `src/lib/gallery-filters.ts` (parse/filter/tags/paginate/href, unit tested); `getGalleryImages` cached with new `gallery` tag. Shared `FilterGroup` extracted from the portfolio page. `/gallery` in sitemap.
- Checks: lint ✅ · typecheck ✅ · test ✅ (128) · e2e ✅ (162) · build ✅ · format ✅ · screenshot reviewed
- Notes: CSS columns order items top-to-bottom per column; the lightbox (3.5) navigates in DOM order.
- Next: 3.5

### 2026-10-01 — 3.5 Accessible lightbox
- Branch: feat/m3-portfolio-gallery · PR #4
- Done: `LightboxGrid` client component — thumbnails are labelled buttons ("Open image N of M: <alt>", `aria-haspopup="dialog"`); native modal `<dialog>` (`showModal()` makes the page inert → focus contained; Escape closes natively), close button focused on open, focus returned to the opening thumbnail on close, ←/→ keys with wrap-around, prev/next buttons, swipe (touch/pen pointer, 50 px threshold), live "N / M" counter, "Show description" toggle (`aria-expanded`) revealing the alt text, solid black backdrop. Used by the gallery (masonry) and case-study image grids.
- Checks: lint ✅ · typecheck ✅ · test ✅ · e2e ✅ (178, incl. §15 scenario 6: keyboard open/navigate/close, focus return, focus containment, alt on demand, swipe) · build ✅ · format ✅ · screenshot reviewed
- Next: 3.6

### 2026-10-01 — 3.6 ImageGallery JSON-LD + cache tags — **M3 Portfolio & Gallery complete**
- Branch: feat/m3-portfolio-gallery · PR #4
- Done: `imageGalleryJsonLd()` (ImageObject per image with caption, size, credit and copyright holder; capped at 30) on `/gallery` and every case study. Cache tags consolidated in `src/server/cache.ts` (`CACHE_TAGS` packages/portfolio/gallery/reviews/settings, `CONTENT_REVALIDATE_SECONDS`, `revalidateContent(...kinds)` for admin mutations in M7); all queries import from it.
- Checks: lint ✅ · typecheck ✅ · test ✅ (130) · e2e ✅ (180) · build ✅ · format ✅
- Next: M4 → 4.1 (branch `feat/m4-quote`; stack on feat/m3-portfolio-gallery while PR #4 is open)

### 2026-10-01 — 4.1 Canadian sales tax
- Branch: feat/m4-quote (stacked on feat/m3-portfolio-gallery / PR #4)
- Done (TDD): `src/lib/tax.ts` — `parseRate` (Decimal string/Prisma Decimal → integer parts per 100,000; rejects >5 decimals, negatives, ≥100%), `calculateTax(subtotalCents, rate)` → `{ lines: [{code GST|PST|QST|HST, rate "9.975%", amountCents}], taxCents }` with each line on the pre-tax subtotal (QST not on GST) and half-up rounding to the cent, `findTaxRate` (case-insensitive, throws for unknown regions). 12 tests: ON HST, QC GST+QST, GST-only, Atlantic HST, INTL, rounding edges, invalid input. Coverage: 100% lines/branches.
- Checks: lint ✅ · typecheck ✅ · test ✅ (142) · format ✅ after a follow-up formatting commit (the first commit was pushed with format:check failing — always run `pnpm format` before committing)
- Next: 4.2

### 2026-10-01 — 4.2 Quote engine
- Branch: feat/m4-quote · PR #5 (stacked on #4)
- Done (TDD): `src/lib/pricing/calculate-quote.ts` — `calculateQuote(input, {rules, addOns, taxRates})` → itemized `lineItems` (base, extraHours, extraShooters, surcharge, discount, addOn, travel), subtotal, tax lines (via `calculateTax`), total, deposit, flags (custom travel quote, suggested photographers). Integer cents with half-up rounding; validation (duration 0–24 in half hours, 1–10 photographers, distance ≥ 0, real calendar date, known region, add-on offered for the category). `src/lib/pricing/holidays.ts` — Ontario statutory holidays incl. Easter-based Good Friday. 34 new tests (every §8.1 case: base, extra hours/shooters, each add-on unit, travel threshold/round trip/custom, weekend, stat holiday, non-stacking, off-season discount, each tax regime, rounding, deposit, guest hint, validation). Coverage: calculate-quote 100% lines / 95% branches; holidays + tax 100%.
- Interpretations recorded in AGENTS.md §8.1 and new Q16 for owner confirmation.
- Checks: lint ✅ · typecheck ✅ · test ✅ (176) · format ✅ (pure logic; no UI change)
- Next: 4.3

### 2026-10-01 — 4.3 Quote schema
- Branch: feat/m4-quote · PR #5
- Done (TDD): `src/lib/validators/quote.ts` — `quoteDetailsSchema` (category slug, optional package, real calendar date, HH:MM start, duration in half hours ≤ 24, 1–10 photographers, optional guest count ≤ 5000, province/territory or INTL, optional city, distance 0–20,000 km, international toggle forcing INTL + no distance, add-ons with whole quantities and zero-qty filtering; coerces form strings) for the live estimate without personal data; `quoteContactSchema` (name, email, optional phone, CASL opt-in defaulting to false, honeypot); `quoteRequestSchema` = both. Error messages are translation keys. 8 tests.
- Checks: lint ✅ · typecheck ✅ · test ✅ (184) · format ✅
- Next: 4.4

### 2026-10-01 — 4.4 /quote UI with live breakdown
- Branch: feat/m4-quote · PR #5 (stacked on #4)
- Done: `/[locale]/quote` — single form with sections (event, coverage, location, add-ons) + sticky live breakdown (spec allows this instead of steps). `?package=` prefills category/package/hours/photographers; `?category=` starts from the cheapest package. Every change runs the shared `quoteDetailsSchema` + `calculateQuote` in the browser; past dates (studio TZ) are ignored. `QuoteBreakdown` (translated line items, tax lines with rates, total in an `aria-live` region, deposit, custom-travel notice, "Estimate only" disclaimer), guest-count hint, international toggle. Server: cached `getPricingContext()` (packages, add-ons, parsed rules, tax rates as strings). `src/lib/pricing/rules.ts`: `parsePricingRules` (throws on missing/invalid rules), `resolvePackage` (chosen package or category's cheapest), unit tested. Province names EN/FR. `/quote` in sitemap.
- Found + fixed: e2e typed into the form before hydration (React Hook Form missed the change → flaky failures); form now exposes `data-hydrated` and tests wait for it. Verified with `--repeat-each=3` (54/54).
- Checks: lint ✅ · typecheck ✅ · test ✅ (190) · e2e ✅ (198; totals hand-computed: base, extra hours, add-on, weekend, travel, QC tax, international) · build ✅ · format ✅ · screenshot reviewed
- Next: 4.5 (contact fields + createQuote server action)

### 2026-10-01 — 4.5 createQuote server action
- Branch: feat/m4-quote · PR #5 (stacked on #4)
- Done: `src/server/actions/quote.ts` `createQuote` — re-validates with `quoteRequestSchema`, rejects past dates (studio TZ), Turnstile when configured, honeypot → fake success (nothing saved), re-prices from `getPricingContext()` (client price never sent), then in one transaction: atomic per-year counter (`ReferenceCounter` native upsert) → `CAD-Q-YYYY-####`, customer upsert by lower-cased email (records new marketing consent with timestamp, never silently withdraws it — CASL), quote row (event start converted from Toronto time to UTC, breakdown JSON incl. line items/tax/deposit/flags, status SENT, expiry = now + QUOTE_VALID_DAYS). Quote form gains a "Your details" section (name, email, phone, unchecked marketing opt-in, honeypot, privacy notice), client-side validation with inline translated errors (`aria-invalid`/`aria-describedby`, focus first error, toast), loading state and success state with reference + total. Helpers: `src/lib/references.ts` (format/parse/counter key) and `src/lib/pricing/engine-input.ts` (`toEngineInput`, shared by browser and server), both unit tested.
- e2e: submission saves a quote whose DB total equals the server's price (145092 cents), reference format, marketing opt-in false; inline errors; CASL checkbox unchecked. New `tests/e2e/db.ts` helper queries the DB. Note: e2e runs add test quotes/customers (`e2e-quote-…@example.com`) to the local DB.
- Checks: lint ✅ · typecheck ✅ · test ✅ (196) · e2e ✅ (204) · build ✅ · format ✅
- Next: 4.6 (quote emails)

### 2026-10-01 — 4.6 Quote emails
- Branch: feat/m4-quote · PR #5 (stacked on #4)
- Done: React Email template `src/lib/email/templates/quote-summary.tsx` (logo header, reference, event line, itemized breakdown, tax lines, total, deposit, custom-travel note, validity date, "Book this date" link to `/{locale}/quote/{reference}`, disclaimer, transactional footer; all copy passed in translated). `src/server/emails/quote-emails.ts` renders HTML + plain text in the client's locale and sends it, plus a plain-text English studio notification (reply-to = client) with the full breakdown. `sendEmail` accepts HTML. `createQuote` sends after the transaction commits; email failures are logged, never lose the saved quote. Line-item labels extracted to `src/lib/pricing/line-labels.ts` and shared by the live breakdown and both emails. Vitest compiles JSX via `oxc.jsx.runtime = "automatic"`.
- Checks: lint ✅ · typecheck ✅ · test ✅ (208; label mapping + template render HTML/plain text/conditional travel note) · e2e ✅ (204; server log confirms both emails are built per quote and skipped only for the missing RESEND_API_KEY) · build ✅ · format ✅ · email screenshot reviewed
- Next: 4.7 (result page `/quote/[reference]` + e2e scenario 1)

### 2026-10-02 — 4.7 Private quote page + scenario 1 — **M4 Quote engine complete**
- Branch: feat/m4-quote · PR #5 (stacked on #4)
- Done: `/[locale]/quote/[reference]?t=…` — references are sequential, so the page requires an HMAC signature (`src/lib/signing.ts`: `signValue`/`verifySignedValue`, purpose-prefixed `quote:<ref>`, timing-safe compare; `src/server/link-secret.ts`: `LINK_TOKEN_SECRET`, dev fallback only outside Vercel). Missing/invalid/swapped signatures → 404 (doesn't reveal existence); `noindex`. Shows event facts, stored breakdown (not re-priced), validity / expired notice, "Book this quote" → `/book?quote=REF&t=…` (hidden when expired), "Create a new quote". `createQuote` returns the token; the form redirects there after saving; the client email links there with the token.
- e2e: §15 scenario 1 (package page → Customize quote → prefilled → hours 10 + 3 photographers → $4,972.00 → submit → reference page with same total); signature checks (no token, bad token, neighbour reference with a valid token → 404); noindex; expired quote hides booking.
- Checks: lint ✅ · typecheck ✅ · test ✅ (212) · e2e ✅ (214) · build ✅ · format ✅
- Notes: the result page labels the deposit with the current DEPOSIT_PCT; the stored deposit amount is what was quoted.
- Next: M5 → 5.1 (branch `feat/m5-booking`; stack on feat/m4-quote while PRs #4/#5 are open)

### 2026-10-02 — 5.1 Availability logic
- Branch: feat/m5-booking (stacked on feat/m4-quote / PR #5)
- Done (TDD): `src/lib/booking/availability.ts` — `dayAvailability` (past / too-soon within MIN_LEAD_DAYS / blocked / open / full with remaining capacity; only PENDING + CONFIRMED bookings hold capacity; capacity from MAX_PHOTOGRAPHERS_PER_DAY, never negative), `publicStatus` (available / limited / full only — blocked, past and too-soon look "full" so no reason leaks), `canBook(date, photographers)`, `monthAvailability(year, month)` (leap years), `addDaysToKey`. All on studio-local "YYYY-MM-DD" keys. 14 tests, 100% lines/branches.
- Checks: lint ✅ · typecheck ✅ · test ✅ (222) · format ✅ (pure logic)
- Next: 5.2 (public availability endpoint)

### 2026-10-02 — 5.2 Public availability endpoint
- Branch: feat/m5-booking · PR #6 (stacked on #5 → #4)
- Done: `GET /api/availability?month=YYYY-MM` → `{ month, days: [{date, status}] }` (available/limited/full only; 400 for malformed or out-of-range months — current month to +18; 503 on failure; `s-maxage=60`). `getAvailabilityContext(start, end)` (not cached): rules from PricingRule, blocked dates, PENDING/CONFIRMED bookings in the studio-local range (Toronto day bounds → UTC), each mapped to its studio-local day. Pure helpers + tests: `parseMonthParam`, `monthBounds`, `parseBookingRules`.
- e2e (`availability-api.spec.ts`, serial, desktop project only via `testIgnore: /-api\.spec\.ts$/` on mobile): DB fixtures for a blocked day, a 2-of-3 booking (limited), an 11:30 PM Toronto booking (counts for that day, not the next UTC day) and a cancelled booking (ignored); response has only `date` + `status`; bad months → 400; fixtures cleaned up.
- Found while testing: raw SQL fixtures must convert to UTC explicitly — the local Postgres session time zone is Asia/Colombo, and casting `timestamptz` → `timestamp` used it. App writes go through Prisma (UTC) and are unaffected; noted for future raw SQL.
- Checks: lint ✅ · typecheck ✅ · test ✅ (227) · e2e ✅ (216) · build ✅ · format ✅
- Next: 5.3 (/book stepper)

### 2026-10-02 — 5.3a Booking schema (5.3 split into a/b)
- Branch: feat/m5-booking · PR #6
- Done (TDD): `src/lib/validators/booking.ts` — `bookingDetailsSchema` (category/package, real date, start + end on half-hour steps with end after start → derived `durationHours`, 1–10 photographers, guests, venue/city/province/distance or international → INTL, notes ≤ 2000, add-ons), `bookingContactSchema` (name/email/phone, deposit method BANK_TRANSFER | CASH, required terms + privacy consent, CASL opt-in default false, honeypot), `bookingRequestSchema` (+ optional `quoteReference`/`quoteToken`), `durationFromTimes`. 10 tests. Installed react-day-picker 10 (calendar for 5.3b).
- Checks: lint ✅ · typecheck ✅ · test ✅ (237) · format ✅
- Next: 5.3b

### 2026-10-02 — 5.3b Booking wizard UI
- Branch: feat/m5-booking · PR #6
- Done: `/[locale]/book` — `BookingWizard` (5 steps: service → date & time → event details → your details → review), step indicator (`aria-current="step"`), per-step validation with the shared schema (only that step's fields; inline translated errors; focus first error; heading focused on step change), Back keeps answers. `AvailabilityCalendar` (react-day-picker 10, `enCA`/`frCA`, fetches `/api/availability` per month, full/unknown days disabled while loading, limited days marked + legend, current month → +18 months, brand colours via `.cad-calendar.rdp-root`). Half-hour start/end selects. Contact step: bank transfer / cash, required terms + privacy consent (links), unticked CASL opt-in, honeypot. Review: summary + price — the quoted price while nothing price-relevant changed (`matchesQuote`, shared with 5.4), otherwise a fresh estimate with breakdown; deposit note. Prefill: `?package=` or signed `?quote=&t=` via `getBookableQuote` (valid signature, SENT, not expired; `addHoursToTime` → end time). Submit button is wired in 5.4.
- Also fixed: `/quote` (from 4.4) and `/book` were missing from the sitemap — the 4.4 `sed` silently matched nothing; SEO e2e now asserts both.
- Checks: lint ✅ · typecheck ✅ · test ✅ (250) · e2e ✅ (230 full run; 7 wizard tests) · build ✅ · format ✅ · screenshot reviewed (calendar recoloured after first look)
- Next: 5.4 (createBooking in a serializable transaction)

### 2026-10-02 — 5.4 createBooking (serializable) + confirmation page
- Branch: feat/m5-booking · PR #6
- Done: `src/server/booking/place-booking.ts` `placeBooking` — re-prices from DB (quoted price only if the signed quote is valid and `matchesQuote`), then a SERIALIZABLE transaction re-checks capacity for the studio-local day (blocked date, lead time, PENDING+CONFIRMED photographers), increments the `B-YYYY` counter → `CAD-B-YYYY-####`, upserts the customer (terms/privacy `consentAt`; CASL opt-in recorded, never withdrawn), creates a PENDING booking (price, breakdown, deposit, payment method, quote link) and marks the quote ACCEPTED (one booking per quote). Serialization failures (P2034/40001) retry up to 3× and then report "unavailable". `src/server/actions/booking.ts` `createBooking` (validation, honeypot, past-date, Turnstile, signed `booking:` token). Wizard submits and handles unavailable (back to the date step), validation (jumps to the step) and server errors. `/[locale]/book/[reference]?t=…` confirmation (signed, noindex): status, when, package, total, deposit, payment method, next steps for bank transfer vs cash.
- Schema: `Booking` gains `subtotalCents`, `taxCents`, `totalCents`, `breakdown` (migration `20261002000000_booking_price`) — the agreed price wasn't stored before.
- Tests: Vitest integration test against the real DB (`tests/integration/booking-concurrency.test.ts`, skipped without `DATABASE_URL`; `server-only` stubbed, `unstable_cache` passthrough, files run serially) — §15 scenario 3: two simultaneous requests for the last slot → exactly one succeeds (5/5 repeated runs), then the day is full; stored price/deposit/reference checked. e2e §15 scenario 2: book a quote → CAD-B reference, day goes available → limited, booking at the quoted price, quote ACCEPTED; wizard submit → confirmation page.
- Found while testing: per-worker `afterAll` cleanup deleted another test's booking mid-run → per-test emails + `afterEach` cleanup.
- Checks: lint ✅ · typecheck ✅ · test ✅ (252 incl. 2 integration) · e2e ✅ (232) · build ✅ · format ✅
- Next: 5.5 (booking emails + .ics)

### 2026-10-02 — 5.5 Booking emails + .ics
- Branch: feat/m5-booking · PR #6
- Done: `src/lib/ics.ts` — RFC 5545 VEVENT builder (UTC times, TEXT escaping, CRLF lines, 75-octet folding without splitting multi-byte characters, TENTATIVE while pending, SEQUENCE for future reschedules); 8 tests. React Email `booking-request.tsx` (reference, status, when, package, total, deposit, payment method, next steps for bank transfer vs cash, calendar note, "View your booking" signed link). `src/server/emails/booking-emails.ts` sends it in the client's locale + a plain-text studio notification (reply-to client; reminds the studio to send the payment request), both with `CAD-B-….ics` attached. `sendEmail` supports attachments. `createBooking` sends after the booking is saved (best-effort, logged on failure).
- Test fixes: §15 scenario 2 now uses a different Wednesday per Playwright project (desktop and mobile raced on one date's capacity); the blur-placeholder test holds `/_next/image` responses so the pre-load state is observable (was timing-dependent) — verified with `--repeat-each=3`.
- Checks: lint ✅ · typecheck ✅ · test ✅ (262) · e2e ✅ (232; server log shows client + studio booking emails built per booking) · build ✅ · format ✅
- Next: 5.6 (signed reschedule/cancel links)

### 2026-10-02 — 5.6 Reschedule / cancel requests
- Branch: feat/m5-booking · PR #6
- Done: clients request changes from the signed booking page; nothing changes automatically (cancellation/refund policy is owner-defined, Q15). New `BookingChangeRequest` model (type RESCHEDULE|CANCEL, preferred date, message, status OPEN|RESOLVED; migration `20261002010000_booking_change_requests`) for admin (M7). `src/lib/validators/change-request.ts`: `changeRequestSchema` (reschedule needs a preferred date or a note) + `canRequestChange` (PENDING/CONFIRMED, upcoming, < 3 open requests) — unit tested. `requestBookingChange` server action verifies the `booking:` signature, checks eligibility, stores the request and emails the studio (reply-to client). `ChangeRequestForm` on `/book/[reference]` (only when changeable); booking email mentions the link.
- e2e: reschedule recorded (DB row), cancellation request leaves the booking PENDING, 4th open request refused, no form for cancelled bookings, unsigned/bad links 404. Fixtures use per-project `CAD-B-9999-…` references and per-test emails.
- Notes: one full run lost its web server (Playwright reused a leftover server that then stopped) and one hit a transient ECONNRESET; reruns pass. `--repeat-each` on the booking scenario must use `--workers=1` (parallel repeats legitimately compete for the same date's capacity).
- Checks: lint ✅ · typecheck ✅ · test ✅ (267) · e2e ✅ (242 on rerun) · build ✅ · format ✅
- Next: 5.7 (cron to release unpaid holds)

### 2026-10-02 — 5.7 Release unpaid holds (cron)
- Branch: feat/m5-booking · PR #6
- Done: `src/lib/booking/holds.ts` (`isHoldExpired`: PENDING, no deposit, payment request ≥ PENDING_HOLD_HOURS ago; never for bookings without a payment request; `overdueCutoff`; `needsPaymentRequest` for the admin 24 h warning) — 7 tests. `GET /api/cron/release-holds` (timing-safe `Bearer $CRON_SECRET`, 401 otherwise) cancels overdue holds with the condition re-checked in the update (a just-recorded deposit wins), emails each client a localized "hold released" note, returns `{ released }`; idempotent. `vercel.json` schedules it daily at 13:00 UTC (Hobby-safe; hourly on Pro — noted in AGENTS.md §8.3). Playwright web server gets `CRON_SECRET=e2e-cron-secret`.
- e2e (`cron-api.spec.ts`): no/wrong secret → 401; of four fixtures only the unpaid, 49-h-old request is released; second run releases nothing.
- Checks: lint ✅ · typecheck ✅ · test ✅ (273) · e2e ✅ (244) · build ✅ · format ✅
- Next: 5.8 (remaining e2e: scenario 4 blocked date not selectable)

### 2026-10-02 — 5.8 Booking scenarios — **M5 Booking complete**
- Branch: feat/m5-booking · PR #6 (stacked on #5 → #4)
- Done: §15 scenario 4 e2e (`book-blocked.spec.ts`): a date blocked in the DB is disabled in the booking calendar (navigates to next month if needed), can't be selected, and shows as "full" in the public API; serial file, per-project dates. Scenario 2 (book a quote → CAD-B, capacity decreases) was added in 5.4/5.5; scenario 3 (concurrent last slot) is the DB integration test from 5.4. Added the parallel-DB-test rules to `.claude/loop.md` (third time this bit).
- Checks: lint ✅ · typecheck ✅ · test ✅ (273 incl. integration) · e2e ✅ (248) · build ✅ · format ✅
- Next: M6 Reviews → 6.1 (branch `feat/m6-reviews`; stack on feat/m5-booking while PRs #4–#6 are open)

### 2026-10-02 — 6.1 Reviews page
- Branch: feat/m6-reviews (stacked on feat/m5-booking / PR #6)
- Done: `/[locale]/reviews` — average rating + count, client reviews and recommendations sections, category filter + newest/highest sort as links (`src/lib/review-display.ts`: `customerDisplayName` "Alex Martin" → "Alex M.", `parseReviewFilters`, `applyReviewFilters`, `reviewsHref`; unit tested), empty states, metadata, sitemap. Cached `getPublishedReviews` (APPROVED + consent, samples gated). Shared `ReviewCard` (stars with text label, verified badge, category + month, Sample badge) now also used by the home carousel, which showed full customer names before (against §6.7).
- Bugs found by tests: (1) `unstable_cache` returns JSON, so `createdAt` was a string on cache hits → sort crashed; dates are revived in the query wrapper (pitfall added to loop.md). (2) French ratings rendered "4.7" — ICU needs `{rating, number}`; fixed for ratings, hours and km everywhere (incl. the home carousel and quote lines) + a unit test forbidding bare numeric placeholders.
- Checks: lint ✅ · typecheck ✅ · test ✅ (287) · e2e ✅ (258) · build ✅ · format ✅
- Next: 6.2 (submit-review form)

### 2026-10-02 — 6.2 Submit-review form
- Branch: feat/m6-reviews · PR #7 (stacked on #6)
- Done: "Share your experience" section on `/reviews` — `ReviewForm` (accessible star rating as a radio group, name with "first name + last initial" hint, optional service, review text, publish consent, "on behalf of a company" toggle → recommendation with title + company and no rating, honeypot, success state). `submitReview` server action (input typed `unknown`, validated server-side) always stores PENDING, sets `flagged` via `flagForModeration` (links, shouting, 7+ repeated characters, small EN/FR profanity list with word boundaries), stores locale, notifies the studio. No email is collected (Review has no email field — data minimisation). `src/lib/validators/review.ts` + 17 unit tests.
- Bugs found by tests: (1) Zod skips `superRefine` when base fields fail, so the rating/company errors only appeared on a second submit → `reviewFieldErrors` re-applies them so all errors show at once; (2) duplicate message key `ReviewForm.title` (section heading vs. "Your title" field) — the second silently overwrote the first; heading is now `ReviewForm.heading`.
- e2e: pending + not public (§15 scenario 5, first half; approval is 7.5), spam flagged, validation shows all errors, recommendation requires a company.
- Checks: lint ✅ · typecheck ✅ · test ✅ (304) · e2e ✅ (266) · build ✅ · format ✅
- Next: 6.3 (verified-client tokens)

### 2026-10-02 — 6.3 Verified-client review links
- Branch: feat/m6-reviews · PR #7 (stacked on #6)
- Done: expiring signed links (`signExpiring`/`verifyExpiring` in `src/lib/signing.ts`; the signature covers purpose `review:<reference>` and the expiry, so the expiry can't be extended). `src/server/review-links.ts`: `reviewInviteUrl(reference, locale)` (90 days; emailed from admin in 7.6) and `getVerifiedBooking` — valid only when the link is unexpired, the booking exists, is COMPLETED and has no verified review yet. `/reviews?booking=…&exp=…&t=…` shows a "Verified client" notice and preselects the booking's service; invalid/expired/used links show a friendly note and still allow an unverified review. `submitReview` re-verifies server-side and saves `verified = true`, `bookingId` and the booking's category (still PENDING for moderation). `ReviewForm` gained a `data-hydrated` marker for e2e.
- e2e: verified via signed link (+ second use rejected), expired and tampered links unverified, non-completed booking rejected.
- Checks: lint ✅ · typecheck ✅ · test ✅ (306) · e2e ✅ (272) · build ✅ · format ✅
- Next: 6.4 (AggregateRating/Review JSON-LD)

### 2026-10-02 — 6.4 Review structured data — **M6 Reviews complete**
- Branch: feat/m6-reviews · PR #7 (stacked on #6)
- Done: `reviewsJsonLd` in `src/lib/seo/json-ld.ts` → `ProfessionalService` with `AggregateRating` (average, count, best/worst) and up to 20 newest `Review`s (author as first name + last initial, date, body, rating) on `/reviews`. Built from approved reviews only (the query already filters APPROVED + consent); **sample reviews are always excluded**, as are unrated recommendations, so search engines never see invented ratings. No markup at all until there's a real rated review.
- e2e: with sample-only data the reviews page shows the average but emits no rating markup. A "real approved review appears in JSON-LD" e2e needs cache revalidation from the admin approve action — add it with 7.5 (§15 scenario 5, second half).
- Checks: lint ✅ · typecheck ✅ · test ✅ (309) · e2e (seo + reviews) ✅ · build ✅ · format ✅
- Next: M7 Admin (7.1 Auth.js), new branch `feat/m7-admin` stacked on `feat/m6-reviews`

### 2026-10-02 — 7.1 Admin auth
- Branch: feat/m7-admin · PR #8 (stacked on #7 — M3–M6 PRs not merged yet)
- Done: Auth.js v5 (`next-auth@5.0.0-beta.32`, `@auth/prisma-adapter`) in `src/auth.ts` — email magic link (Resend provider, 15-min single-use links, sent through `sendEmail`; printed to the server log when no email key in dev/test), database sessions (7 days). Migration `20261003000000_admin_auth` adds `User` (role `ADMIN`/`STAFF`, `isActive`), `Account`, `Session`, `VerificationToken`. **No sign-up**: only existing active users get a link; unknown addresses see the same "check your email" page and nothing is sent (no account discovery). `pnpm db:seed` creates the first ADMIN from `SEED_ADMIN_EMAIL` (Q17).
- Access: middleware redirects to `/admin/sign-in?callbackUrl=…` without a session cookie (cheap, edge); `(panel)/layout.tsx` and every page call `requireAdminPage(role)`; actions call `requireRole(role)` (throws `ForbiddenError`). Pure rules in `src/lib/auth/roles.ts` (`hasRole` — ADMIN ⊇ STAFF, `adminGuardRedirect`, `safeCallbackUrl` against open redirects) + 17 unit tests. Deactivating a user ends access on the next request. Admin root layout is English-only, `noindex`.
- e2e (scenario 7 + more): redirect with callback, forged cookie rejected, noindex, links only for known users (same page for strangers), real magic-link callback with an Auth.js-hashed token (single use), staff session + sign out deletes the session, deactivated user loses access.
- Not yet: rate limiting / Turnstile on the sign-in form (8.3); dashboard content (7.2).
- Checks: lint ✅ · typecheck ✅ · test ✅ (327) · e2e ✅ (288) · build ✅ · format ✅
- Next: 7.2 Dashboard

### 2026-10-02 — 7.2 Admin dashboard
- Branch: feat/m7-admin · PR #8 (stacked on #7)
- Done: `/admin` shows stat cards (upcoming pending+confirmed bookings, quotes in the last 7 days, pending reviews with flagged count, revenue estimate for the current studio-local month — confirmed/completed vs pending, before tax, unpriced bookings counted not guessed), a "Needs attention" box (PENDING bookings with no payment request after 24 h — §8.3 — and open reschedule/cancel requests), the next 8 bookings and the 5 latest quotes. Pure helpers `studioMonthRange` (Toronto month incl. DST and year rollover) and `revenueEstimate` in `src/lib/admin/dashboard.ts` + 7 unit tests; live (uncached) query in `src/server/queries/admin-dashboard.ts`.
- Lists don't link anywhere yet — the bookings/quotes/reviews admin pages arrive in 7.5–7.7.
- e2e: signed-in admin sees a flagged unrequested booking in "Needs attention" and in upcoming bookings, plus all stat cards.
- Checks: lint ✅ · typecheck ✅ · test ✅ (334) · e2e ✅ (290) · build ✅ · format ✅
- Next: 7.3 CRUD for packages, add-ons, pricing rules, tax rates, site settings

### 2026-10-02 — 7.3a Admin packages
- Branch: feat/m7-admin · PR #8 (stacked on #7)
- Split 7.3 into 7.3a packages · 7.3b add-ons · 7.3c pricing rules + tax rates · 7.3d site settings.
- Done: admin nav (`AdminNav`, current section marked; catalogue links only for ADMIN). `/admin/packages` list (name, slug, category, price, hours, active/hidden, order) + "Saved" notice; `/admin/packages/new` and `/admin/packages/[id]` with `PackageForm` — English and French side by side for name/summary/description/inclusions/exclusions (one per line), FAQ rows (EN/FR), price typed in dollars (stored as cents), hours, photographers, edited images, turnaround, active, sort order. `savePackage` server action: ADMIN only (`requireRole`), Zod (`src/lib/validators/admin/package.ts`, plain-English errors, 5 unit tests), duplicate slug → field error, `revalidateContent("packages")` so the site, quote engine and booking terms update at once. No delete — hiding keeps quotes/bookings intact.
- Bug caught in review before testing: a `Field` component declared inside the form's render would remount inputs on every error and wipe what was typed; hoisted to module level and covered by an e2e check.
- e2e: create (EN/FR + FAQ) → public EN/FR detail pages show it → hide → public 404; validation errors keep typed values; STAFF has no Packages link and is bounced to `/admin?error=forbidden`. `packages.spec.ts` counts now ignore "E2E Package" cards so parallel runs can't collide. New helper `tests/e2e/admin-session.ts`.
- Flake: `review-verified` failed once under full-suite load waiting for hydration; passed alone and on a full rerun — hydration wait raised to 15 s.
- Checks: lint ✅ · typecheck ✅ · test ✅ (339) · e2e ✅ (296) · build ✅ · format ✅
- Next: 7.3b Add-ons

### 2026-10-02 — 7.3b Admin add-ons
- Branch: feat/m7-admin · PR #8 (stacked on #7)
- Done: `/admin/add-ons` list (name, code, price + unit, services, active, order), create/edit with `AddOnForm` — code (set once; read-only on edit because saved quotes store add-ons by code), EN/FR name, price in dollars, unit (flat / per hour × duration / per item × quantity), services it's offered for (at least one), active, order. `saveAddOn` action: ADMIN only, Zod (`src/lib/validators/admin/add-on.ts`, 4 unit tests), duplicate code → field error, revalidates the packages tag (quote form, engine and package pages). Shared admin form pieces extracted: `src/lib/validators/admin/fields.ts` and `src/components/admin/form-field.tsx`. Nav gains "Add-ons" (ADMIN only).
- Gotcha handled: `Object.fromEntries(FormData)` keeps only one value per name — the form sends `getAll("categories")`.
- e2e: validation, create → quote form offers it for weddings but not family, code read-only on edit, hide → gone from quotes.
- Checks: lint ✅ · typecheck ✅ · test ✅ (343) · e2e ✅ (298) · build ✅ · format ✅
- Next: 7.3c Pricing rules and tax rates

### 2026-10-02 — 7.3c Admin pricing rules and tax rates
- Branch: feat/m7-admin · PR #8 (stacked on #7)
- Done: `/admin/pricing` (ADMIN only, nav "Pricing"). **Rules form** driven by `RULE_DEFINITIONS` (`src/lib/admin/pricing-rules.ts`): every quote/booking knob with label, help text and unit — extra hour/photographer rates, free travel km, $/km, custom-travel threshold, weekend/stat-holiday surcharge, off-season discount + months, deposit %, quote validity, guest hint, photographers/day, minimum notice, unpaid hold hours. Money typed in dollars → stored as cents; percentages and counts must be whole numbers (the engine's integer-cent rounding assumes whole percentages). **Sales tax table**: GST / PST-QST / HST % and label per province, typed as percentages ("9.975") and converted to the stored fractions with string/integer math (`src/lib/admin/tax-rates.ts`, no float drift); existing provinces only. Actions in `src/server/actions/admin/pricing.ts` (transactions, revalidate packages + settings tags). 19 unit tests, including "what the form saves is exactly what `parsePricingRules` reads".
- Bugs found by the e2e: (1) `OFF_SEASON_DISCOUNT_PCT` isn't seeded, so its empty field blocked every save → optional rules have a `fallback` (0 = off); (2) admin-add-ons spec used a non-existent package slug (`family`), so its "not offered for family" check passed vacuously → uses `family-event` and asserts a family add-on is listed.
- e2e (`admin-pricing.spec.ts`, chromium only + serial because settings are global; restores values afterwards): validation, saving the guest hint changes the quote form's suggestion, tax validation + saving Nunavut stores `0.05500`.
- Checks: lint ✅ · typecheck ✅ · test ✅ (362) · e2e ✅ (300 + 2 skipped by design) · build ✅ · format ✅
- Next: 7.3d Site settings

### 2026-10-02 — 7.3d Site settings (7.3 complete)
- Branch: feat/m7-admin · PR #8 (stacked on #7)
- Done: `/admin/settings` (ADMIN only, nav "Settings") edits the bilingual `SiteSetting` texts — cancellation policy (package pages, booking emails) and payment instructions (sent with payment requests in 7.6, never on the site). English and French side by side, both required; warns while text is still a `TODO(…)` placeholder (placeholders are never shown to clients). Definitions + parsing in `src/lib/admin/site-settings.ts` (5 unit tests), `saveSiteSettings` action revalidates the settings tag.
- **Fix (separate commit):** `pnpm db:seed` overwrote packages, add-ons, pricing rules and tax rates on every run — now that admins edit them (and the owner is told to run the seed to create the first admin), those are create-only like site settings.
- e2e (`admin-settings.spec.ts`, chromium only, restores afterwards): placeholder warning, both languages required, save persists `{ en, fr }`. Only payment instructions are changed because `package-detail.spec.ts` relies on the placeholder policy staying hidden.
- Flake: `home.spec` "blur-up placeholder" failed once in a slow full run (3.3 min vs ~1.6); passed 6/6 alone. Timing-based (holds images 3 s); watch it.
- Checks: lint ✅ · typecheck ✅ · test ✅ (367) · e2e ✅ (300 + 3 skipped by design; 1 flake, rerun green) · build ✅ · format ✅
- Next: 7.4 Portfolio and gallery admin

