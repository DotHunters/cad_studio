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
