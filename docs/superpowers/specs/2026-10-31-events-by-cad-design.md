# Events by CAD — design

Date: 2026-10-31 · Status: approved (brainstorm) · Owner input: "events by cad — event management, decoration, catering, lights & sound"

## Goal

Present CAD's full-service event offering (event management, décor, catering, lights & sound) as a sub-brand inside the CAD Studio Photography site, and collect event enquiries. Showcase + enquiry only: no prices, packages, quote engine or booking for these services.

## Decisions

| Topic | Decision |
|---|---|
| Scope | New `/events` page + home teaser + nav link. No pricing/booking. |
| Enquiry | Dedicated event form, email only (admin notification + client confirmation). Not stored in DB. |
| Branding | Sub-brand "Events by CAD" inside the site, same visual system. Positioned as one team for planning, décor, catering, AV and photography/video. |
| Content storage | Static copy in `messages/en.json` / `messages/fr.json` (`Events` namespace). Not admin-editable. |
| Photos | Placeholders until the owner supplies event photos (`TODO(owner): event photos`). |
| Approach | New page, schema, server action and form modelled on contact; contact code untouched. |

## 1. Page `/[locale]/events`

File: `src/app/[locale]/(site)/events/page.tsx` (Server Component).

Sections, top to bottom:

1. **Hero** — eyebrow "Events by CAD", serif headline with one gold `<Accent>` word, short intro, pill CTA "Plan your event" (`Button size="cta"`) linking to `#enquire`. Placeholder image marked `{/* TODO(owner): event photos */}`.
2. **Services grid** — `SectionHeading` + 4 cards with lucide icons:
   - Event management — planning, coordination, run-of-show.
   - Décor — theme, staging, florals/table styling.
   - Catering — menus and service.
   - Lights & sound — lighting, PA, DJ/AV setup.
   Card copy describes the service generically. Details the owner has not confirmed (e.g. in-house vs partner catering, owned vs hired AV) are marked `TODO(owner): confirm` and not claimed.
3. **"One team" band** — dark band: we plan, decorate, cater, run the AV and photograph/film it. Links to `/packages` and `/portfolio`. Stats come only from `siteConfig.stats` (no new numbers).
4. **Process strip** — five steps: consult → plan → set up → event day → wrap-up. Marked `TODO(owner): confirm`.
5. **Enquiry** — split image + form, anchor `id="enquire"`, same layout pattern as `/contact`.

SEO: `generateMetadata` with title `Events | CAD Studio Photography`, description, Open Graph, `hreflang` alternates; add `/events` to `src/app/sitemap.ts`; emit `Service` JSON-LD via `json-ld.tsx`.

Motion ≤ 300 ms, respects `prefers-reduced-motion`. Verified at 360 / 768 / 1280 / 1920 px, light and dark.

## 2. Navigation and home

- `src/components/site/nav-items.ts`: add `{ key: "events", href: "/events" }` after `packages`; add `Nav.events` to both message files.
- New `src/components/site/events-teaser.tsx`: compact band on the home page after the category tiles — eyebrow "Events by CAD", one-line pitch, 4 service chips (icon + name), CTA to `/events`.

## 3. Enquiry form and action

### Schema — `src/lib/validators/event-enquiry.ts`

Shared Zod schema (client + server):

| Field | Rule |
|---|---|
| `name` | required, trimmed, 2–100 chars |
| `email` | required, email |
| `phone` | optional, ≤ 30 chars |
| `eventType` | enum: `wedding`, `corporate`, `birthday`, `cultural`, `other` |
| `eventDate` | optional ISO date; if present, must be today or later (studio time zone) |
| `guestCount` | optional integer 1–5000 |
| `city` | required, ≤ 100 chars |
| `services` | array, at least one of `management`, `decor`, `catering`, `av`, `photo`, `video` |
| `budget` | optional enum of preset ranges: `under5k`, `5to10k`, `10to25k`, `over25k` (CAD) |
| `message` | required, 10–5000 chars |
| `website` | honeypot, must be empty |

Error messages are keys translated in the form, matching `contact.ts`.

### Action — `src/server/actions/event-enquiry.ts`

`submitEventEnquiry(input, turnstileToken?)` returns `{ ok: true } | { ok: false, error: "validation", fieldErrors } | { ok: false, error: "captcha" | "rateLimited" | "server" }`.

Order, same as `submitContact`:

1. Zod parse. Honeypot filled → fake `{ ok: true }`.
2. `isRateLimited("eventEnquiry")`.
3. `verifyTurnstile(token, ip)`.
4. Send admin email (`adminNotifyAddress()`, `replyTo` = client): subject `[CAD Studio Photography] New event enquiry from {name}`, plain-text body with all fields (labels in English).
5. Send client confirmation in the client's locale (transactional; allowed under CASL without opt-in).
6. Email failure → log via the project logger and return `{ ok: false, error: "server" }`. The admin email is the critical one; if only the client confirmation fails, still return `{ ok: true }`.

No DB writes.

### Form — `src/components/events/event-enquiry-form.tsx`

Client component, React Hook Form + Zod resolver. Services as a checkbox group (fieldset + legend), budget and event type as selects, date input, Turnstile widget, honeypot. States: loading (disabled submit), success panel replacing the form, inline field errors announced via `aria-describedby`, server/captcha/rate-limit toast. On `server` error the toast tells the client to email `cadstudio01@gmail.com` (from `siteConfig.contact.email`).

### Email template

`src/lib/email/templates/event-enquiry-received.tsx` — React Email, localized (en/fr): thanks, summary of submitted services/date/city, "we'll reply within …" left as `TODO(owner): response time`; until confirmed, omit the time claim.

## 4. i18n and content rules

- All copy in the `Events` namespace (page, teaser, form labels, errors, email) in `messages/en.json` and `messages/fr.json`.
- French copy drafted by the agent, marked `TODO(owner-fr): review`.
- Canadian English spelling. No invented vendors, prices, capacities, clients or numbers (AGENTS.md §13).

## 5. Tests

- Unit `tests/unit/event-enquiry-schema.test.ts`: valid input passes; empty `services` fails; past `eventDate` fails; `guestCount` out of range fails; honeypot filled fails on `website`.
- Unit `tests/unit/event-enquiry-action.test.ts` (mock email, rate limit, Turnstile, headers — follow existing contact tests): honeypot → fake success; rate limited → `rateLimited`; captcha fail → `captcha`; admin email throws → `server`; client email throws → still `ok`.
- E2e `tests/e2e/events.spec.ts`: `/en/events` shows 4 service cards; header nav link reaches the page; filling and submitting the form shows the success state; `/fr/events` renders.
- Definition of done: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## 6. Docs

Update AGENTS.md:

- §1 required features: add "Events by CAD — showcase + event enquiry".
- §4 directory structure: `events/page.tsx`, `components/events/`.
- §6: new **6.11 Events by CAD** with the acceptance criteria above.
- §16 open questions: catering in-house or partners; décor and AV owned or hired; event photos; enquiry response time; service area for event services (same as photography?).

Mirror the new questions in `docs/loop/OPEN_QUESTIONS.md`.

## Out of scope

Pricing, packages, quote engine, booking/capacity for event services; storing enquiries or an admin enquiries list; admin-editable events content; separate domain or visual identity.
