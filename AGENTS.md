# AGENTS.md — Cad Studio Website

> Instructions for AI coding agents (Claude Code, Cursor, Copilot, Codex, etc.) building and maintaining the Cad Studio website.
> Read this file fully before writing code. When this file and a user instruction conflict, the user instruction wins; update this file afterwards if the change is permanent.

---

## 1. Project overview

**Client:** Cad Studio — professional photography studio based in Canada.
**Owner / Lead photographer:** I. Rukshan — 10+ years of photography experience, plus event management experience.
**Clients:** Local Canadian clients through to international/global clients.

**Goal of the site:** Turn visitors into booked clients. Every page should make it easy to (1) see the work, (2) understand packages and price, (3) get a quote, and (4) book a date.

### Services / package categories
| Slug | Name |
|---|---|
| `corporate` | Corporate Events (conferences, launches, galas, headshots on site) |
| `wedding` | Weddings (engagement, ceremony, reception) |
| `family` | Family Events (birthdays, anniversaries, baby showers, milestones) |
| `gathering` | Gatherings (community, cultural, religious, social events) |
| `professional` | Professional Photoshoots (portraits, headshots, branding, model portfolios) |
| `product` | Product Photography (e-commerce, catalogue, lifestyle, flat-lay) |

### Required features (MVP)
1. **Packages** — browse all packages with full details, inclusions, starting prices.
2. **Booking** — pick an available date/time for an event and submit a booking request.
3. **Portfolio** — curated case studies (per client/project), filterable by category and by Local vs Global.
4. **Gallery** — large, fast, filterable image grid with lightbox.
5. **Quote generator** — instant price estimate from event type, duration, number of photographers, add-ons, location, etc.
6. **Reviews & recommendations** — customer reviews (with star ratings) and client recommendations/testimonials (longer, from businesses/notable clients), moderated by admin.
7. **About** — owner profile (I. Rukshan, 10+ years, event management background).
8. **Contact** — form, email, phone, service area map.
9. **Admin dashboard** — manage packages, pricing rules, availability, bookings, quotes, portfolio, gallery, reviews.

---

## 2. Tech stack (default — do not change without asking)

| Concern | Choice |
|---|---|
| Framework | **Next.js 15 (App Router)**, React Server Components by default |
| Language | **TypeScript** (`strict: true`) |
| Styling | **Tailwind CSS v4** + `shadcn/ui` components |
| Database | **PostgreSQL** via **Prisma ORM** |
| Auth (admin only) | **Auth.js (NextAuth v5)** — email magic link or credentials; roles `ADMIN`, `STAFF` |
| Images | **Cloudinary** (or S3 + `next/image`) — never commit client photos to the repo |
| Email | **Resend** + React Email templates |
| Payments (phase 2) | **Stripe** — booking deposits in CAD |
| Validation | **Zod** (shared between client and server) |
| Forms | React Hook Form + Zod resolver |
| Dates | `date-fns` + `date-fns-tz`; store UTC, display in studio time zone |
| Calendar UI | `react-day-picker` |
| Testing | **Vitest** (unit), **Playwright** (e2e) |
| Lint/format | ESLint (next config) + Prettier |
| Hosting | Vercel (app) + managed Postgres (Neon / Supabase), region **Canada** where available |

Package manager: **pnpm**.

---

## 3. Commands

```bash
pnpm install          # install deps
pnpm dev              # local dev server at http://localhost:3000
pnpm build            # production build — must pass before any PR
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest unit tests
pnpm test:e2e         # Playwright e2e
pnpm db:migrate       # prisma migrate dev
pnpm db:seed          # seed packages, pricing, sample content
pnpm db:studio        # Prisma Studio
```

**Definition of done for every task:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

---

## 4. Directory structure

```
/
├── AGENTS.md
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/                   # logo, favicons, og images only (no client photos)
├── src/
│   ├── app/
│   │   ├── [locale]/(site)/              # locale = en | fr
│   │   │   ├── page.tsx                  # Home
│   │   │   ├── packages/page.tsx         # All packages
│   │   │   ├── packages/[slug]/page.tsx  # Package detail
│   │   │   ├── portfolio/page.tsx
│   │   │   ├── portfolio/[slug]/page.tsx # Case study
│   │   │   ├── gallery/page.tsx
│   │   │   ├── quote/page.tsx            # Quote generator
│   │   │   ├── book/page.tsx             # Booking flow
│   │   │   ├── reviews/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── contact/page.tsx
│   │   │   ├── privacy/page.tsx
│   │   │   └── terms/page.tsx
│   │   ├── admin/                        # protected
│   │   │   ├── page.tsx                  # dashboard
│   │   │   ├── bookings/ quotes/ packages/ pricing/
│   │   │   ├── availability/ portfolio/ gallery/ reviews/
│   │   ├── api/                          # route handlers (webhooks, uploads)
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── ui/          # shadcn primitives
│   │   ├── site/        # header, footer, hero, cards
│   │   ├── booking/     # calendar, booking form, stepper
│   │   ├── quote/       # quote form, price breakdown
│   │   └── gallery/     # masonry grid, lightbox, filters
│   ├── lib/
│   │   ├── pricing/     # quote engine (pure functions, fully unit tested)
│   │   ├── booking/     # availability logic
│   │   ├── tax.ts       # Canadian sales tax by province
│   │   ├── db.ts        # Prisma client singleton
│   │   ├── email/       # React Email templates + send helpers
│   │   └── validators/  # Zod schemas
│   ├── server/actions/  # Server Actions (createBooking, createQuote, submitReview…)
│   └── config/site.ts   # name, contact, socials, studio timezone
└── tests/
    ├── unit/
    └── e2e/
```

---

## 5. Brand & design

- **Name:** always "Cad Studio" (owner confirmed, matches logo; capital C only, singular). Never "CAD Studios", "CAD Studio" or "Cad Studios". Tagline: "Collection Art Design".
- **Logo:** owner-supplied source files in `assets/` — `gold.png` (primary), `black.png` (light backgrounds), `white.png` (dark backgrounds); transparent PNG, 2014×814. Logo wordmark reads "Cad ♡ Studio" with tagline "· COLLECTION ART DESIGN ·" (CAD = Collection Art Design). Copy to `public/brand/` (`logo-gold.png`, `logo-black.png`, `logo-white.png`) and render via `next/image` with `alt="Cad Studio"`. Header: black logo in light theme, white logo in dark theme; gold for hero/footer/OG. Derive favicon from the camera-heart mark. Ask the owner for an SVG version for crispness. Logo gold gradient: `#C79856` → `#FAD983`.
- **Tone:** confident, warm, premium, never salesy. Short sentences. Canadian English spelling (colour, centre, cheque) in copy; code identifiers stay US English.
- **Visual direction:** editorial and photo-first. Images are the hero — UI chrome is minimal.
  - Palette (CSS variables in `globals.css`, prefixed `--brand-*` so they don't clash with shadcn's semantic `--accent`/`--muted`; shadcn tokens are mapped onto them):
    - `--brand-ink` near-black `#111111` → Tailwind `ink`
    - `--brand-paper` off-white `#FAF8F5` → `paper`
    - `--brand-gold` warm gold `#C79856` (matched to logo) → `gold`, also shadcn `--primary` with ink text (7.2:1). CTAs/highlights only — **2.5:1 as text on paper, never use for text in light mode**
    - `--brand-gold-light` `#FAD983` (logo highlight; gradients, dark-theme accents) → `gold-light`
    - `--brand-gold-text` `#8A6430` (gold for text/links on light backgrounds, 5.0:1) → `text-gold-text` (auto-switches to `#C79856` in dark mode)
    - `--brand-muted` `#6B6B6B` → shadcn `--muted-foreground` (5.0:1 on paper)
    - Dark theme via `.dark` class on `<html>`.
  - Typography: serif display (e.g. *Cormorant Garamond* / *Playfair Display*) for headings, clean sans (*Inter*) for body, via `next/font`.
  - Generous white space, full-bleed imagery, subtle motion (fade/slide ≤ 300 ms; respect `prefers-reduced-motion`).
- Support **light and dark** themes.
- Mobile-first. Test at 360 px, 768 px, 1280 px, 1920 px.

---

## 6. Pages & acceptance criteria

### 6.1 Home `/`
- Full-bleed hero (rotating 3–5 best images) + headline + two CTAs: **Get a Quote**, **Book a Date**.
- Service category tiles (6) linking to packages.
- "Trusted locally and globally" strip — client logos (with permission) + stats (years, events, countries).
- Featured portfolio (3–6 case studies).
- Owner intro snippet → About.
- Reviews carousel (approved, featured only) with average rating.
- Final CTA band.

### 6.2 Packages `/packages`, `/packages/[slug]`
- Filter tabs by category.
- Each card: name, category, "from $X CAD", hours included, photographers included, key inclusions, CTA buttons **Customize quote** (prefills quote form) and **Book**.
- Detail page: full inclusions/exclusions, deliverables (no. of edited images, turnaround, online gallery, prints/album), sample images, FAQs, add-ons available, terms summary.
- Packages are DB-driven (admin-editable). No hardcoded prices in components.

### 6.3 Portfolio `/portfolio`, `/portfolio/[slug]`
- Case-study cards: cover image, title, client (or "Private client"), category, location (city, country), **Local / Global** badge.
- Filters: category, Local/Global, year.
- Detail page: story/brief, challenge & approach, image set, optional client recommendation quote, CTA.

### 6.4 Gallery `/gallery`
- Masonry/justified grid, lazy loaded, infinite scroll or "load more".
- Filters by category and tags.
- Accessible lightbox: keyboard (←, →, Esc), swipe on mobile, focus trap, alt text shown on demand.
- Use responsive images (`next/image`, Cloudinary transformations, AVIF/WebP, blur placeholders).
- Right-click/save deterrence is optional and must not break accessibility; watermarking is done at upload time, not in the browser.

### 6.5 Quote generator `/quote`
- Multi-step form (or single form with live summary on desktop):
  1. Event type (category) and optional base package
  2. Event date + start time
  3. Duration (hours)
  4. Number of photographers
  5. Guest count (informational; may suggest more photographers)
  6. Location: province + city, distance from studio (km) or "outside Canada"
  7. Add-ons (see pricing)
  8. Contact details
- **Live price breakdown** updates as the user edits (computed client-side with the same pure function used on the server).
- On submit: server recomputes the price (never trust the client total), saves a `Quote` with a reference `CAD-Q-YYYY-####`, emails the client a summary (+ PDF in phase 2), notifies admin.
- Quote valid for **14 days** (configurable).
- CTA on result: **Book this quote** → booking flow prefilled.
- Show clearly: "Estimate only. Final price confirmed by Cad Studio."

### 6.6 Booking `/book`
- Step 1: choose service/package (or arrive from a quote).
- Step 2: calendar showing availability — fully booked and blocked dates disabled; partially booked dates show remaining slots.
- Step 3: event details (venue, start/end time, guest count, notes).
- Step 4: contact details + consent checkboxes (terms, privacy, optional marketing).
- Step 5: review & submit → status `PENDING`. Client chooses deposit payment method: **bank transfer** or **cash**.
- **Payment (MVP, offline, admin-driven):** no online checkout on the site. The automatic confirmation email shows the deposit amount and says payment details will follow by email. Admin then uses **Send payment request** on the booking: an email (client's locale) prefilled from the admin-editable `SiteSetting` `PAYMENT_INSTRUCTIONS` (bank details — never hardcoded), with an optional **payment link** URL field the admin pastes in. Sets `paymentRequestedAt`. Admin records the deposit (method, amount, date) → status `CONFIRMED`. (Phase 2: Stripe deposit → `CONFIRMED` automatically.)
- Booking reference `CAD-B-YYYY-####`. Confirmation email to client + admin.
- Prevent double booking with a DB transaction and capacity check (see §8).
- Clients can request reschedule/cancel via a signed link in the email (no client accounts needed in MVP).

### 6.7 Reviews `/reviews`
- Two sections:
  - **Customer reviews** — name (first name + last initial by default), rating 1–5, event type, date, text, optional photo.
  - **Client recommendations** — longer testimonials from businesses/organizations, with person's name, title, company, optional logo.
- Average rating + count, filter by category, sort by newest/highest.
- **Submit a review** form: allowed for anyone, but reviews linked to a completed booking (via email link with token) get a "Verified client" badge.
- All submissions are `PENDING` until an admin approves. Never auto-publish.
- Emit `schema.org` `AggregateRating` + `Review` JSON-LD for approved reviews only.

### 6.8 About `/about`
- Owner profile: **I. Rukshan**, founder & lead photographer, **10+ years** in photography, **event management experience** (planning, coordination, run-of-show — explain how this benefits clients).
- Studio story, approach, team (if any), equipment highlights, areas served (Canada-wide + travel worldwide).
- Use only facts provided by the owner. Placeholder text must be marked `{/* TODO(owner): confirm */}`.

### 6.9 Contact `/contact`
- Form (name, email, phone, enquiry type, message) with spam protection (honeypot + Cloudflare Turnstile).
- Email, phone, socials, business hours, service area ("Based in Scarborough, Toronto — serving the GTA, Canada-wide and worldwide"). **No public street address and no map embed** (owner decision).

### 6.10 Admin `/admin`
- Dashboard: upcoming bookings, new quotes, pending reviews, monthly revenue estimate.
- CRUD: packages, add-ons, pricing rules, tax rates, portfolio projects, gallery images (bulk upload, tagging, reorder), reviews (approve/reject/feature), blocked dates & capacity.
- Bookings: list + calendar view, status changes (`PENDING → CONFIRMED → COMPLETED` / `CANCELLED`), assign photographers, export CSV, `.ics` download.
- Quotes: list, convert to booking, adjust and re-send.
- Audit log of admin changes.

---

## 7. Data model (Prisma, summary)

```prisma
enum Category { CORPORATE WEDDING FAMILY GATHERING PROFESSIONAL PRODUCT }
enum BookingStatus { PENDING CONFIRMED COMPLETED CANCELLED }
enum QuoteStatus { DRAFT SENT ACCEPTED EXPIRED }
enum ReviewStatus { PENDING APPROVED REJECTED }
enum ReviewType { CUSTOMER RECOMMENDATION }
enum Reach { LOCAL GLOBAL }
enum Role { ADMIN STAFF }
enum PaymentMethod { BANK_TRANSFER CASH PAYMENT_LINK STRIPE }   // PAYMENT_LINK = external link sent by admin; STRIPE = phase 2

model Package {
  id               String   @id @default(cuid())
  slug             String   @unique
  name             String
  category         Category
  summary          String
  description      String   // markdown
  basePriceCents   Int      // CAD cents
  includedHours    Int
  includedShooters Int      @default(1)
  editedImages     Int?
  turnaroundDays   Int?
  inclusions       String[]
  exclusions       String[]
  isActive         Boolean  @default(true)
  sortOrder        Int      @default(0)
  images           Image[]
  addOns           AddOn[]
}

model AddOn {
  id          String  @id @default(cuid())
  code        String  @unique   // e.g. VIDEO, DRONE, ALBUM, RUSH
  name        String
  priceCents  Int
  unit        String            // "flat" | "per_hour" | "per_item"
  categories  Category[]
  isActive    Boolean @default(true)
  packages    Package[]
}

model PricingRule {            // admin-editable knobs for the quote engine
  key   String @id             // e.g. EXTRA_HOUR_RATE, EXTRA_SHOOTER_HOURLY
  value Json
}

model SiteSetting {            // admin-editable content/config, e.g. CANCELLATION_POLICY, PAYMENT_INSTRUCTIONS
  key   String @id
  value Json                   // localized text stored as { en, fr }
}

model TaxRate {
  province String @id          // ON, BC, QC, ... + "INTL"
  gst      Decimal
  pst      Decimal
  hst      Decimal
  label    String
}

model Quote {
  id            String   @id @default(cuid())
  reference     String   @unique
  category      Category
  packageId     String?
  eventDate     DateTime
  durationHours Decimal
  photographers Int
  guestCount    Int?
  province      String
  city          String?
  distanceKm    Int?
  isInternational Boolean @default(false)
  addOns        Json      // [{code, qty}]
  breakdown     Json      // line items as computed by the engine
  subtotalCents Int
  taxCents      Int
  totalCents    Int
  status        QuoteStatus @default(SENT)
  expiresAt     DateTime
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  booking       Booking?
  createdAt     DateTime @default(now())
}

model Booking {
  id            String   @id @default(cuid())
  reference     String   @unique
  category      Category
  packageId     String?
  quoteId       String?  @unique
  startAt       DateTime // UTC
  endAt         DateTime // UTC
  photographers Int
  venue         String?
  notes         String?
  status        BookingStatus @default(PENDING)
  depositCents  Int?
  paymentMethod PaymentMethod?
  paymentRequestedAt DateTime?  // admin sent payment request email
  paymentLinkUrl     String?    // optional link included in that email
  depositPaidAt DateTime?   // set by admin when payment received
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  createdAt     DateTime @default(now())
}

model BlockedDate { id String @id @default(cuid()) date DateTime @db.Date reason String? }

model Customer {
  id              String @id @default(cuid())
  name            String
  email           String @unique
  phone           String?
  locale          String  @default("en")   // "en" | "fr" — used for emails
  marketingOptIn  Boolean @default(false)
  consentAt       DateTime?
  quotes          Quote[]
  bookings        Booking[]
}

model PortfolioProject {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  clientName  String?  // null => "Private client"
  category    Category
  reach       Reach
  city        String?
  country     String
  year        Int
  story       String   // markdown
  coverId     String?
  images      Image[]
  featured    Boolean  @default(false)
  isSample    Boolean  @default(false)
  publishedAt DateTime?
}

model Image {
  id         String @id @default(cuid())
  publicId   String @unique   // Cloudinary id
  width      Int
  height     Int
  alt        String           // REQUIRED, descriptive
  category   Category?
  tags       String[]
  inGallery  Boolean @default(true)
  sortOrder  Int @default(0)
  projectId  String?
  packageId  String?
}

model Review {
  id          String   @id @default(cuid())
  type        ReviewType
  authorName  String
  authorTitle String?   // recommendations
  company     String?   // recommendations
  rating      Int?      // 1–5, required for CUSTOMER
  category    Category?
  body        String
  verified    Boolean  @default(false)
  bookingId   String?
  status      ReviewStatus @default(PENDING)
  featured    Boolean  @default(false)
  consentToPublish Boolean
  isSample    Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

All money is stored as **integer cents in CAD**. Never use floats for money.

**Bilingual content:** translatable DB text (package name/summary/description/inclusions/exclusions, add-on name, portfolio title/story, image alt, FAQs) has French companion columns with an `Fr` suffix (e.g. `nameFr`, `descriptionFr`, `altFr`). They are nullable; when empty, fall back to English. Admin forms edit both languages side by side.

---

## 8. Business logic

### 8.1 Quote engine (`src/lib/pricing/`)
Pure, deterministic, side-effect free: `calculateQuote(input, rules, taxRates) => QuoteResult`. Same function runs in the browser (live preview) and on the server (source of truth).

**Formula**
```
base          = package.basePrice  (or category minimum if no package)
extraHours    = max(0, duration - package.includedHours) × EXTRA_HOUR_RATE
extraShooters = max(0, photographers - package.includedShooters) × duration × EXTRA_SHOOTER_HOURLY
addOns        = Σ addOn.price × qty   (per_hour add-ons × duration)
travel        = distanceKm > FREE_TRAVEL_KM ? (distanceKm - FREE_TRAVEL_KM) × 2 × TRAVEL_PER_KM : 0
                international / >300 km → flag "custom travel quote" (no auto price)
surcharges    = weekend/holiday % (WEEKEND_SURCHARGE_PCT, STAT_HOLIDAY_SURCHARGE_PCT) on (base + extraHours + extraShooters)
               + rush delivery if selected
discounts     = multi-day / off-season % if configured
subtotal      = base + extraHours + extraShooters + addOns + travel + surcharges − discounts
tax           = by province (see 8.2)
total         = subtotal + tax
deposit       = round(total × DEPOSIT_PCT)
```
Return an itemized `lineItems[]` so the UI can render the breakdown. Round each line to whole cents using banker-safe integer math.

**All prices, rules, deposit % and the cancellation policy are owner-managed from the admin dashboard** (`Package`, `AddOn`, `PricingRule`, `SiteSetting`). Seeds are only starting values; nothing pricing-related may be hardcoded.

**Seed values (starting values — owner edits in admin):**

| Key | Placeholder |
|---|---|
| Package base prices | Corporate $1,200 (4 h) · Wedding $2,800 (8 h, 2 shooters) · Family $600 (2 h) · Gathering $750 (3 h) · Professional $350 (1 h) · Product $400 (10 products) |
| `EXTRA_HOUR_RATE` | $200/h |
| `EXTRA_SHOOTER_HOURLY` | $120/h |
| `FREE_TRAVEL_KM` | 40 km (owner confirmed; measured from Scarborough, ON) |
| `TRAVEL_PER_KM` | $0.70 (owner confirmed) |
| `WEEKEND_SURCHARGE_PCT` | 10% |
| `STAT_HOLIDAY_SURCHARGE_PCT` | 25% |
| `DEPOSIT_PCT` | 30% |
| `QUOTE_VALID_DAYS` | 14 |
| Add-ons | Videographer $150/h · Drone $300 flat · Photo booth $450 flat · Printed album $450 · Rush 72 h delivery $250 · Extra product image $25/item · Additional edited images pack $150 |

Guest-count hint: suggest +1 photographer per ~100 guests (UI hint only, not forced).

**Must have unit tests** for: base only, extra hours, extra shooters, each add-on unit type, travel threshold, weekend, stat holiday, each tax regime, international flag, rounding.

### 8.2 Canadian sales tax (`src/lib/tax.ts`)
Rates live in the `TaxRate` table (admin-editable) and are seeded with current rates. **Agents must not hardcode tax rates in components.** Seed:

| Province | Tax |
|---|---|
| AB, NT, NU, YT | GST 5% |
| BC, MB, SK | GST 5% (+ PST where applicable to the service — owner/accountant to confirm) |
| QC | GST 5% + QST 9.975% |
| ON | HST 13% |
| NS | HST 14% |
| NB, NL, PE | HST 15% |
| INTL (outside Canada) | 0% (verify place-of-supply rules) |

Add a comment in the seed file: `// Verify current rates and service applicability with the studio's accountant before launch.`

### 8.3 Availability & booking
- Studio is in **Scarborough, Toronto, ON**. Time zone in `config/site.ts`: `America/Toronto` (confirmed). Default tax province for the studio: ON.
- `MAX_PHOTOGRAPHERS_PER_DAY` (rule, default **3**, owner confirmed) defines daily capacity.
- A date is **unavailable** if it's in `BlockedDate`, in the past, within `MIN_LEAD_DAYS` (default 3), or the sum of photographers on `PENDING`+`CONFIRMED` bookings that day ≥ capacity.
- `createBooking` runs inside a **serializable transaction**: re-check capacity, then insert. Return a friendly error if the slot was taken.
- `PENDING` bookings expire `PENDING_HOLD_HOURS` (default 48) **after the payment request was sent** if no deposit is recorded — use a cron (Vercel Cron) to release them. Bookings with no payment request after 24 h are highlighted on the admin dashboard (never auto-expired).
- Generate `.ics` attachment for confirmation emails.
- Public availability endpoint returns only `{date, status: available|limited|full}` — never other clients' details.

### 8.4 Reviews
- Moderation required; reject profanity/spam automatically to `PENDING` with a flag.
- Store explicit `consentToPublish`.
- Recommendations from companies may display logos only with written permission (admin checkbox).

---

## 9. Canadian compliance (mandatory)

- **Privacy (PIPEDA; Québec Law 25 for QC residents):** privacy policy page; collect only needed data; state purpose at collection; allow deletion requests via contact form; store data in Canada where possible.
- **Anti-spam (CASL):** marketing opt-in checkbox **unchecked by default**; store consent timestamp; every marketing email has unsubscribe. Transactional emails (quote, booking) are allowed without opt-in.
- **Accessibility:** WCAG 2.1 AA (aligns with AODA in Ontario) — alt text on every image, keyboard navigable, visible focus, contrast ≥ 4.5:1, form labels and error messages announced.
- **Currency:** display as `$1,250.00 CAD` using `Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })`.
- **Language:** **bilingual at launch — English (`en-CA`) and French (`fr-CA`)** via `next-intl` with locale-prefixed routes (`/en/...`, `/fr/...`), a language switcher in the header, `hreflang` alternates, and localized emails (client's chosen locale stored on `Customer`). French copy drafted by agents must be marked `TODO(owner-fr): review` until a fluent speaker approves it.
- **Photo rights & model releases:** gallery/portfolio uploads require an admin checkbox "Client consent to publish obtained".
- Cookie banner only if non-essential cookies/analytics are added (prefer privacy-friendly analytics like Plausible).

---

## 10. SEO & performance

- Per-page `generateMetadata` (title, description, Open Graph, Twitter cards). Title pattern: `{Page} | Cad Studio — Photography in Canada`.
- JSON-LD: `LocalBusiness`/`ProfessionalService` (home), `Service` (packages), `AggregateRating` (reviews), `Person` (owner on About), `ImageGallery`.
- `sitemap.ts` and `robots.ts` generated from DB content; admin routes `noindex`.
- Targets: Lighthouse ≥ 90 on all categories (mobile), LCP < 2.5 s, CLS < 0.1.
- Images: always `next/image` with `sizes`, priority only on hero, blur placeholders, AVIF/WebP.
- ISR / `revalidateTag` for packages, portfolio, gallery, reviews when admin edits them.

---

## 11. Security

- All mutations via Server Actions or route handlers validated with Zod on the server.
- Rate-limit public forms (quote, booking, review, contact) — e.g. Upstash Ratelimit.
- Cloudflare Turnstile on public forms.
- Admin routes protected by middleware + role check in every action.
- Signed, expiring tokens for reschedule/cancel/review links.
- Secrets only in env vars; never commit `.env*`. Keep `.env.example` updated.
- Stripe webhooks verified with signing secret; idempotent handlers.

### Environment variables (`.env.example`)
See `.env.example` (source of truth, with comments). Summary:
```
DATABASE_URL=
AUTH_SECRET=
AUTH_RESEND_KEY=
RESEND_API_KEY=
EMAIL_FROM="Cad Studio <bookings@cadstudio.example>"   # dummy domain until owner provides one
ADMIN_NOTIFY_EMAIL=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=   # public: used by the client-side image loader
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=      # public: rendered in the browser widget
TURNSTILE_SECRET_KEY=
UPSTASH_REDIS_REST_URL=              # rate limiting
UPSTASH_REDIS_REST_TOKEN=
LINK_TOKEN_SECRET=                   # signs reschedule/cancel/review links
CRON_SECRET=                         # authorizes Vercel Cron requests
STRIPE_SECRET_KEY=                   # phase 2
STRIPE_WEBHOOK_SECRET=               # phase 2
NEXT_PUBLIC_SITE_URL=
STUDIO_TIMEZONE=America/Toronto
SHOW_SAMPLE_CONTENT=true             # false in production
PRICING_CONFIRMED=false
```

---

## 12. Coding conventions

- Server Components by default; add `"use client"` only for interactivity (calendar, quote form, lightbox).
- Business logic lives in `src/lib/**` as pure functions — components stay thin.
- Named exports; one component per file; `PascalCase` components, `camelCase` functions, `kebab-case` filenames for routes.
- No `any`. No unused exports. No `console.log` in committed code (use a logger).
- Money helpers: `formatCAD(cents)`, `toCents()`. Dates: `formatInStudioTz()`.
- Every form: loading state, success state, inline field errors, server error toast.
- Every list page: empty state and skeleton loading state.
- Write tests alongside features; quote engine and availability logic need ≥ 90% coverage.
- Conventional Commits (`feat:`, `fix:`, `chore:` …). Small, focused PRs.

---

## 13. Content rules for agents (important)

- **Do not invent facts** about Cad Studio, I. Rukshan, past clients, awards, or numbers. Use clearly marked placeholders: `TODO(owner): …`.
- **Do not fabricate reviews or testimonials** and present them as real. Seed data for reviews must be obviously sample (e.g. author "Sample Client", body prefixed "[SAMPLE]"), `isSample = true`, and gated by `SHOW_SAMPLE_CONTENT` so it never appears in production.
- **Dummy clients (owner-approved for development):** seed fictional sample clients for portfolio projects, client logos and recommendations so pages look complete. Rules: clearly fictional names (e.g. "Maple & Co. Events (Sample)", "Northwind Corp (Sample)") — never real companies or people; `isSample = true` on `PortfolioProject` and `Review`; placeholder images only; sample content renders only when `SHOW_SAMPLE_CONTENT=true` (default `true` in dev/preview, `false` in production) and shows a small "Sample" badge. Owner replaces them with real clients before launch.
- **Dummy domain:** use `cadstudio.example` (reserved, non-routable) for site URL and email addresses until the owner provides a real domain.
- Do not use stock photos of real identifiable people as "portfolio". Use neutral placeholders (e.g. `https://placehold.co`) until the owner uploads real work.
- Client names/logos appear only when `consentToPublish` is true.
- Prices in the seed are placeholders — show a "Pricing pending owner confirmation" banner in non-production environments until `PRICING_CONFIRMED=true`.

---

## 14. Build order (milestones)

1. **Foundation** — scaffold Next.js + Tailwind + shadcn, Prisma schema, seed, layout (header/footer), theme, `config/site.ts`.
2. **Content pages** — Home, About, Contact, Packages list/detail (DB-driven).
3. **Portfolio & Gallery** — Cloudinary integration, grid, filters, lightbox, case-study pages.
4. **Quote engine** — `lib/pricing` + tests → `/quote` UI with live breakdown → save + email.
5. **Booking** — availability logic + tests → `/book` flow → transaction-safe create → emails + `.ics`.
6. **Reviews** — public list, submission, verified tokens, JSON-LD.
7. **Admin** — auth, dashboard, CRUD screens, moderation, calendar, CSV export.
8. **Hardening** — a11y audit, SEO, rate limiting, Turnstile, Lighthouse, e2e tests for quote → book path.
9. **Phase 2** — Stripe deposits, PDF quotes, client portal for gallery delivery, WhatsApp/SMS reminders. (French moved into MVP — bilingual at launch.)

At the end of each milestone: update the checklist below and summarize what changed.

### Progress checklist
- [ ] 1 Foundation
- [ ] 2 Content pages
- [ ] 3 Portfolio & Gallery
- [ ] 4 Quote engine
- [ ] 5 Booking
- [ ] 6 Reviews
- [ ] 7 Admin
- [ ] 8 Hardening
- [ ] 9 Phase 2

---

## 15. Key e2e scenarios (Playwright)

1. Visitor opens a package → "Customize quote" → form prefilled → changes hours/photographers → total updates → submits → sees reference `CAD-Q-…`.
2. Visitor clicks "Book this quote" → selects available date → submits → sees `CAD-B-…`; that date's capacity decreases.
3. Two concurrent bookings for the last slot → exactly one succeeds.
4. Blocked date is not selectable.
5. Review submitted → not visible publicly → admin approves → visible with correct average.
6. Gallery lightbox fully operable by keyboard.
7. Admin route redirects unauthenticated users to sign-in.

---

## 16. Open questions for the owner (ask before finalizing)

Live tracker: `docs/loop/OPEN_QUESTIONS.md`. Answered so far: studio in Scarborough, ON (`America/Toronto`); prices/deposit/cancellation policy managed in admin; travel 40 km free + $0.70/km; capacity 3 photographers/day; logo file exists; bilingual EN/FR at launch; deposits by bank transfer or cash (offline).

Also answered: brand name is **"Cad Studio"**; no public street address; dummy domain and dummy (clearly sample) clients for now; PST in BC/MB/SK unknown → GST only until confirmed; admin emails bank details or a payment link manually; agents write the French, a tester reviews it before launch.

Still open:
- Real domain and business email.
- Real past clients that can be named publicly; stats.
- SVG logo versions (nice-to-have).
- PST applicability in BC/MB/SK (accountant).