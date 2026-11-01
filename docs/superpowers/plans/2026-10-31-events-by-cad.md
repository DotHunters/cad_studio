# Events by CAD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Events by CAD" showcase page (`/[locale]/events`) for event management, décor, catering and lights & sound, with a dedicated event enquiry form that emails the studio and the client, plus a nav link and a home-page teaser.

**Architecture:** Static, translated page (copy in `messages/*.json`, `Events` namespace) built from existing site components (`SectionHeading`, `StoredImage` placeholders, dark band like `WhyUs`). The enquiry form mirrors the contact form: shared Zod schema → client form (React Hook Form) → server action (honeypot → Zod → rate limit → Turnstile) → `sendEventEnquiryEmails` (admin notification must succeed; client confirmation is best effort). Nothing is stored in the database.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, next-intl, Tailwind v4 + shadcn `Button`, Zod v4, React Hook Form, React Email + Resend (`sendEmail`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-events-by-cad-design.md`

---

## Ground rules for the implementer

- **Work in a separate git worktree.** Another Claude session is editing `messages/*.json`, `src/app/[locale]/(site)/page.tsx` and others in the main working tree. Never commit from the main tree for this feature.
- Error messages in Zod schemas are **translation keys** (e.g. `"required"`), rendered by the form via `t("form.errors.<key>")`.
- French strings use the typographic apostrophe `’`, never `'` (enforced by `tests/unit/messages.test.ts`). No French string may be identical to its English counterpart unless listed in that test's `sameInFrench` set — this plan avoids identical strings.
- French copy is agent-drafted: it is flagged `TODO(owner-fr): review` in `docs/loop/OPEN_QUESTIONS.md` (JSON can't carry comments).
- No invented facts (AGENTS.md §13): no vendor names, prices, capacities, response times or new numbers.
- The project logs with `console.error` / `console.warn` (no logger module exists); follow that.
- Definition of done: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/validators/event-enquiry.ts` | create | Shared Zod schema + option constants |
| `tests/unit/event-enquiry-schema.test.ts` | create | Schema tests |
| `src/lib/rate-limit.ts` | modify | Add `eventEnquiry` bucket |
| `tests/unit/rate-limit.test.ts` | modify | Expect the new bucket |
| `messages/en.json`, `messages/fr.json` | modify | `Nav.events` + `Events` namespace |
| `src/lib/email/templates/event-enquiry-received.tsx` | create | Client confirmation email (React Email) |
| `tests/unit/event-enquiry-email.test.ts` | create | Template render test |
| `src/server/emails/event-enquiry-emails.ts` | create | Compose + send admin and client emails |
| `tests/unit/event-enquiry-emails.test.ts` | create | Admin-must-succeed / client-best-effort tests |
| `src/server/actions/event-enquiry.ts` | create | Server action |
| `tests/unit/event-enquiry-action.test.ts` | create | Action tests (mocked deps) |
| `src/components/events/event-services.ts` | create | Service key → icon map shared by page and teaser |
| `src/components/events/event-enquiry-form.tsx` | create | Client form |
| `src/lib/seo/json-ld.ts` | modify | `eventServicesJsonLd` |
| `tests/unit/events-json-ld.test.ts` | create | JSON-LD test |
| `src/app/[locale]/(site)/events/page.tsx` | create | The page |
| `src/components/site/events-teaser.tsx` | create | Home teaser band |
| `src/app/[locale]/(site)/page.tsx` | modify | Render teaser after `CategoryTiles` |
| `src/components/site/nav-items.ts` | modify | Add `events` nav item |
| `src/app/sitemap.ts` | modify | Add `/events` |
| `tests/e2e/events.spec.ts` | create | E2e |
| `tests/e2e/seo-audit.spec.ts`, `tests/e2e/a11y.spec.ts`, `tests/e2e/french-pages.spec.ts` | modify | Add `/events` to page lists |
| `AGENTS.md`, `docs/loop/OPEN_QUESTIONS.md` | modify | Docs |

---

### Task 0: Worktree

- [ ] **Step 1: Create the worktree on a new branch from the commit that added this plan**

Run (Git Bash, from the repo root):

```bash
BASE=$(git log --format=%h -1 -- docs/superpowers/plans/2026-10-31-events-by-cad.md)
git worktree add ../cad_studio-events -b feat/events "$BASE"
cd ../cad_studio-events
cp ../cad_studio/.env .env 2>/dev/null || true
pnpm install
```

Expected: worktree created; `git log --oneline -2` shows the plan commit and `ffa4a77 docs: Events by CAD design spec`. All later paths are relative to `../cad_studio-events`.

- [ ] **Step 2: Baseline**

Run: `pnpm test`
Expected: all existing unit tests pass. If anything fails before you touch code, stop and report.

---

### Task 1: Enquiry schema

**Files:**
- Create: `src/lib/validators/event-enquiry.ts`
- Test: `tests/unit/event-enquiry-schema.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/event-enquiry-schema.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EVENT_BUDGETS,
  EVENT_ENQUIRY_SERVICES,
  EVENT_TYPES,
  eventEnquirySchema,
} from "@/lib/validators/event-enquiry";

const valid = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  eventType: "corporate",
  eventDate: "2026-12-05",
  guestCount: "150",
  city: "Toronto",
  services: ["management", "av"],
  budget: "",
  message: "Annual gala for our team, looking for décor and sound.",
  website: "",
};

function errorsFor(input: unknown) {
  const result = eventEnquirySchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe("eventEnquirySchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2026-11-01 noon in Toronto.
    vi.setSystemTime(new Date("2026-11-01T16:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("exposes the option lists the form renders", () => {
    expect(EVENT_TYPES).toEqual(["wedding", "corporate", "birthday", "cultural", "other"]);
    expect(EVENT_ENQUIRY_SERVICES).toEqual([
      "management",
      "decor",
      "catering",
      "av",
      "photo",
      "video",
    ]);
    expect(EVENT_BUDGETS).toEqual(["under5k", "5to10k", "10to25k", "over25k"]);
  });

  it("accepts a valid enquiry and normalizes optional fields", () => {
    const result = eventEnquirySchema.parse({ ...valid, name: "  Alex Martin  " });
    expect(result.name).toBe("Alex Martin");
    expect(result.phone).toBeUndefined();
    expect(result.budget).toBeUndefined();
    expect(result.guestCount).toBe(150);
    expect(result.eventDate).toBe("2026-12-05");
  });

  it("treats empty date and guest count as not given", () => {
    const result = eventEnquirySchema.parse({ ...valid, eventDate: "", guestCount: "" });
    expect(result.eventDate).toBeUndefined();
    expect(result.guestCount).toBeUndefined();
  });

  it("requires at least one service", () => {
    expect(errorsFor({ ...valid, services: [] })).toEqual({ services: "chooseService" });
    expect(errorsFor({ ...valid, services: ["fireworks"] })).toHaveProperty("services");
  });

  it("rejects a past event date but allows today", () => {
    expect(errorsFor({ ...valid, eventDate: "2026-10-31" })).toEqual({ eventDate: "pastDate" });
    expect(eventEnquirySchema.safeParse({ ...valid, eventDate: "2026-11-01" }).success).toBe(true);
    expect(errorsFor({ ...valid, eventDate: "next June" })).toEqual({ eventDate: "invalidDate" });
  });

  it("checks the guest count range", () => {
    expect(errorsFor({ ...valid, guestCount: "0" })).toEqual({ guestCount: "invalidGuests" });
    expect(errorsFor({ ...valid, guestCount: "5001" })).toEqual({ guestCount: "invalidGuests" });
    expect(errorsFor({ ...valid, guestCount: "12.5" })).toEqual({ guestCount: "invalidGuests" });
  });

  it("returns translation keys for required fields", () => {
    expect(errorsFor({ ...valid, name: " " })).toEqual({ name: "required" });
    expect(errorsFor({ ...valid, email: "nope" })).toEqual({ email: "invalidEmail" });
    expect(errorsFor({ ...valid, eventType: "" })).toEqual({ eventType: "required" });
    expect(errorsFor({ ...valid, city: "" })).toEqual({ city: "required" });
    expect(errorsFor({ ...valid, message: "Hi" })).toEqual({ message: "messageTooShort" });
    expect(errorsFor({ ...valid, phone: "call me" })).toEqual({ phone: "invalidPhone" });
    expect(errorsFor({ ...valid, budget: "a lot" })).toHaveProperty("budget");
  });

  it("rejects submissions that filled the honeypot", () => {
    expect(errorsFor({ ...valid, website: "http://spam.example" })).toEqual({ website: "spam" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/event-enquiry-schema.test.ts`
Expected: FAIL — cannot resolve `@/lib/validators/event-enquiry`.

- [ ] **Step 3: Implement the schema**

`src/lib/validators/event-enquiry.ts`:

```ts
import * as z from "zod";

import { studioDateKey } from "@/lib/dates";

/**
 * "Events by CAD" enquiry schema, shared by the client form and the server action.
 * Error messages are keys under `Events.form.errors` in the message files.
 */
export const EVENT_TYPES = ["wedding", "corporate", "birthday", "cultural", "other"] as const;
export const EVENT_ENQUIRY_SERVICES = [
  "management",
  "decor",
  "catering",
  "av",
  "photo",
  "video",
] as const;
export const EVENT_BUDGETS = ["under5k", "5to10k", "10to25k", "over25k"] as const;

const PHONE = /^[+\d][\d\s().-]{6,19}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const emptyToUndefined = (value: string | undefined) => (value ? value : undefined);

export const eventEnquirySchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(254, "tooLong").pipe(z.email("invalidEmail")),
  phone: z
    .string()
    .trim()
    .optional()
    .transform(emptyToUndefined)
    .refine((value) => value === undefined || PHONE.test(value), "invalidPhone"),
  eventType: z.enum(EVENT_TYPES, "required"),
  eventDate: z
    .string()
    .trim()
    .optional()
    .transform(emptyToUndefined)
    .refine((value) => value === undefined || ISO_DATE.test(value), "invalidDate")
    // Same-day enquiries are allowed; compared as studio-local calendar dates.
    .refine(
      (value) => value === undefined || !ISO_DATE.test(value) || value >= studioDateKey(new Date()),
      "pastDate",
    ),
  guestCount: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine(
      (value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 5000),
      "invalidGuests",
    ),
  city: z.string().trim().min(1, "required").max(100, "tooLong"),
  services: z.array(z.enum(EVENT_ENQUIRY_SERVICES)).min(1, "chooseService"),
  budget: z
    .union([z.literal(""), z.enum(EVENT_BUDGETS)])
    .optional()
    .transform((value) => (value ? value : undefined)),
  message: z.string().trim().min(10, "messageTooShort").max(5000, "tooLong"),
  // Honeypot: hidden from people, filled by bots. Must stay empty.
  website: z.string().max(0, "spam").optional(),
});

export type EventEnquiryInput = z.input<typeof eventEnquirySchema>;
export type EventEnquiryData = z.output<typeof eventEnquirySchema>;
```

Note: if Zod reports the `eventDate` issue for `"next June"` twice (both refines run), `errorsFor` keeps the last one. If the test for `invalidDate` fails with `pastDate`, the second refine's `!ISO_DATE.test(value)` guard is missing — check it is there.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/event-enquiry-schema.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validators/event-enquiry.ts tests/unit/event-enquiry-schema.test.ts
git commit -m "feat(events): event enquiry schema"
```

---

### Task 2: Rate-limit bucket

**Files:**
- Modify: `src/lib/rate-limit.ts` (the `RATE_LIMITS` object)
- Modify: `tests/unit/rate-limit.test.ts:22-24`

- [ ] **Step 1: Update the test expectation**

In `tests/unit/rate-limit.test.ts` replace

```ts
      ["booking", "changeRequest", "contact", "quote", "review", "signIn"].sort(),
```

with

```ts
      ["booking", "changeRequest", "contact", "eventEnquiry", "quote", "review", "signIn"].sort(),
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/rate-limit.test.ts`
Expected: FAIL — arrays differ (`eventEnquiry` missing).

- [ ] **Step 3: Add the bucket**

In `src/lib/rate-limit.ts`, after the `contact` line add:

```ts
  eventEnquiry: { limit: 5, window: "10 m" },
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run tests/unit/rate-limit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts tests/unit/rate-limit.test.ts
git commit -m "feat(events): rate-limit bucket for event enquiries"
```

---

### Task 3: Messages (EN + FR)

**Files:**
- Modify: `messages/en.json`, `messages/fr.json`

- [ ] **Step 1: Add `Nav.events`**

In `messages/en.json`, inside `"Nav"`, after `"packages": "Packages",` add `"events": "Events",`.
In `messages/fr.json`, inside `"Nav"`, after the `"packages"` entry add `"events": "Événements",`.

- [ ] **Step 2: Add the `Events` namespace to `messages/en.json`**

Add as a new top-level key (after `"Contact"`):

```json
"Events": {
  "metaTitle": "Events",
  "metaDescription": "Events by CAD: event management, décor, catering, lights and sound, with photography and video by CAD Studio Photography. Toronto, Canada-wide and Sri Lanka.",
  "eyebrow": "Events by CAD",
  "title": "Your event, <accent>handled</accent>",
  "intro": "One team to plan, style, cater, light and capture your event — so you can enjoy it.",
  "cta": "Plan your event",
  "servicesEyebrow": "What we do",
  "servicesTitle": "Everything your event <accent>needs</accent>",
  "servicesIntro": "Choose one service or let us handle the whole day.",
  "services": {
    "management": {
      "title": "Event management",
      "body": "Planning, vendor coordination and a clear run-of-show, with someone in charge on the day."
    },
    "decor": {
      "title": "Décor",
      "body": "Themes, staging, table styling and the details that make the room feel like yours."
    },
    "catering": {
      "title": "Catering",
      "body": "Menus planned around your guests, your traditions and your event."
    },
    "av": {
      "title": "Lights & sound",
      "body": "Lighting, sound and stage set-up so every speech is heard and every moment looks right."
    }
  },
  "teamEyebrow": "One team",
  "teamTitle": "Plan it, style it, <accent>capture</accent> it",
  "teamBody": "Our founder brings event management experience to every booking. When the same team runs your event and photographs it, nothing falls between the cracks.",
  "teamPackages": "See photography packages",
  "teamPortfolio": "View our work",
  "processEyebrow": "How it works",
  "processTitle": "From first call to <accent>last dance</accent>",
  "steps": {
    "consult": { "title": "Consult", "body": "Tell us about your event, guests and budget." },
    "plan": { "title": "Plan", "body": "We shape the plan, timeline and vendors with you." },
    "setup": { "title": "Set up", "body": "Décor, lights and sound go in before guests arrive." },
    "day": { "title": "Event day", "body": "We run the schedule while you host." },
    "wrap": { "title": "Wrap-up", "body": "Tear-down, then your photos and video." }
  },
  "enquireEyebrow": "Plan your event",
  "enquireTitle": "Tell us about your <accent>event</accent>",
  "enquireIntro": "Share a few details and we’ll get back to you to talk it through.",
  "teaserTitle": "More than <accent>photography</accent>",
  "teaserBody": "Event management, décor, catering, lights and sound — from the team behind the camera.",
  "teaserCta": "Explore event services",
  "form": {
    "name": "Name",
    "email": "Email",
    "phone": "Phone (optional)",
    "eventType": "Type of event",
    "selectType": "Choose one…",
    "eventTypes": {
      "wedding": "Wedding",
      "corporate": "Corporate event",
      "birthday": "Birthday or family celebration",
      "cultural": "Cultural or community event",
      "other": "Something else"
    },
    "eventDate": "Event date (optional)",
    "guestCount": "Number of guests (optional)",
    "city": "City",
    "services": "What do you need?",
    "serviceOptions": {
      "management": "Event management",
      "decor": "Décor",
      "catering": "Catering",
      "av": "Lights & sound",
      "photo": "Photography",
      "video": "Videography"
    },
    "budget": "Budget (optional)",
    "budgetNone": "Not sure yet",
    "budgets": {
      "under5k": "Under $5,000",
      "5to10k": "$5,000–$10,000",
      "10to25k": "$10,000–$25,000",
      "over25k": "Over $25,000"
    },
    "message": "Tell us about your event",
    "honeypot": "Leave this field empty",
    "privacyNotice": "We use these details only to reply to your enquiry. See our <privacy>privacy policy</privacy>.",
    "submit": "Send enquiry",
    "sending": "Sending…",
    "successTitle": "Thank you — enquiry sent",
    "successBody": "We’ve emailed you a copy and will be in touch soon.",
    "sendAnother": "Send another enquiry",
    "serverError": "Something went wrong and your enquiry wasn’t sent. Please try again or email us at {email}.",
    "captchaError": "We couldn’t verify you’re human. Please try again.",
    "errors": {
      "required": "This field is required.",
      "invalidEmail": "Enter a valid email address.",
      "invalidPhone": "Enter a valid phone number.",
      "invalidDate": "Enter a valid date.",
      "pastDate": "Choose today or a future date.",
      "invalidGuests": "Enter a whole number between 1 and 5,000.",
      "chooseService": "Choose at least one service.",
      "messageTooShort": "Please write at least 10 characters.",
      "tooLong": "This is too long.",
      "spam": "Please leave this field empty."
    }
  },
  "email": {
    "subject": "We received your event enquiry",
    "preview": "Thanks for telling us about your event",
    "heading": "Your enquiry is in",
    "greeting": "Hi {name},",
    "intro": "Thank you for contacting Events by CAD. Here is a copy of what you sent; we’ll reply by email.",
    "eventTypeLabel": "Event",
    "dateLabel": "Date",
    "cityLabel": "City",
    "servicesLabel": "Services",
    "dateNotSet": "To be decided",
    "footer": "CAD Studio Photography · Toronto"
  }
}
```

- [ ] **Step 3: Add the `Events` namespace to `messages/fr.json`**

Same position, same keys:

```json
"Events": {
  "metaTitle": "Événements",
  "metaDescription": "Événements par CAD : gestion d’événements, décoration, traiteur, éclairage et sonorisation, avec photo et vidéo par CAD Studio Photography. Toronto, partout au Canada et au Sri Lanka.",
  "eyebrow": "Événements par CAD",
  "title": "Votre événement, <accent>entre bonnes mains</accent>",
  "intro": "Une seule équipe pour planifier, décorer, nourrir, éclairer et immortaliser votre événement — pour que vous en profitiez.",
  "cta": "Planifier votre événement",
  "servicesEyebrow": "Nos services",
  "servicesTitle": "Tout ce dont votre événement a <accent>besoin</accent>",
  "servicesIntro": "Choisissez un service ou confiez-nous toute la journée.",
  "services": {
    "management": {
      "title": "Gestion d’événements",
      "body": "Planification, coordination des fournisseurs et déroulement clair, avec une personne responsable le jour J."
    },
    "decor": {
      "title": "Décoration",
      "body": "Thèmes, mise en scène, décoration des tables et les détails qui rendent la salle unique."
    },
    "catering": {
      "title": "Traiteur",
      "body": "Des menus pensés pour vos invités, vos traditions et votre événement."
    },
    "av": {
      "title": "Éclairage et son",
      "body": "Éclairage, sonorisation et scène pour que chaque discours soit entendu et chaque moment bien mis en valeur."
    }
  },
  "teamEyebrow": "Une seule équipe",
  "teamTitle": "Planifier, décorer, <accent>immortaliser</accent>",
  "teamBody": "Notre fondateur apporte son expérience en gestion d’événements à chaque réservation. Quand la même équipe organise et photographie votre événement, rien n’est laissé au hasard.",
  "teamPackages": "Voir les forfaits photo",
  "teamPortfolio": "Voir nos réalisations",
  "processEyebrow": "Comment ça marche",
  "processTitle": "Du premier appel à la <accent>dernière danse</accent>",
  "steps": {
    "consult": { "title": "Consultation", "body": "Parlez-nous de votre événement, de vos invités et de votre budget." },
    "plan": { "title": "Planification", "body": "Nous établissons avec vous le plan, l’horaire et les fournisseurs." },
    "setup": { "title": "Installation", "body": "Décor, éclairage et son sont prêts avant l’arrivée des invités." },
    "day": { "title": "Le jour J", "body": "Nous gérons l’horaire pendant que vous recevez." },
    "wrap": { "title": "Après l’événement", "body": "Démontage, puis vos photos et votre vidéo." }
  },
  "enquireEyebrow": "Planifier votre événement",
  "enquireTitle": "Parlez-nous de votre <accent>événement</accent>",
  "enquireIntro": "Donnez-nous quelques détails et nous vous recontacterons pour en discuter.",
  "teaserTitle": "Bien plus que la <accent>photographie</accent>",
  "teaserBody": "Gestion d’événements, décoration, traiteur, éclairage et son — par l’équipe derrière l’objectif.",
  "teaserCta": "Découvrir nos services d’événements",
  "form": {
    "name": "Nom",
    "email": "Courriel",
    "phone": "Téléphone (facultatif)",
    "eventType": "Type d’événement",
    "selectType": "Choisissez…",
    "eventTypes": {
      "wedding": "Mariage",
      "corporate": "Événement d’entreprise",
      "birthday": "Anniversaire ou fête de famille",
      "cultural": "Événement culturel ou communautaire",
      "other": "Autre chose"
    },
    "eventDate": "Date de l’événement (facultatif)",
    "guestCount": "Nombre d’invités (facultatif)",
    "city": "Ville",
    "services": "De quoi avez-vous besoin?",
    "serviceOptions": {
      "management": "Gestion d’événements",
      "decor": "Décoration",
      "catering": "Traiteur",
      "av": "Éclairage et son",
      "photo": "Photographie",
      "video": "Vidéographie"
    },
    "budget": "Budget (facultatif)",
    "budgetNone": "Je ne sais pas encore",
    "budgets": {
      "under5k": "Moins de 5 000 $",
      "5to10k": "5 000 $ à 10 000 $",
      "10to25k": "10 000 $ à 25 000 $",
      "over25k": "Plus de 25 000 $"
    },
    "message": "Parlez-nous de votre événement",
    "honeypot": "Laissez ce champ vide",
    "privacyNotice": "Nous utilisons ces renseignements uniquement pour répondre à votre demande. Consultez notre <privacy>politique de confidentialité</privacy>.",
    "submit": "Envoyer la demande",
    "sending": "Envoi…",
    "successTitle": "Merci — demande envoyée",
    "successBody": "Nous vous avons envoyé une copie par courriel et vous recontacterons bientôt.",
    "sendAnother": "Envoyer une autre demande",
    "serverError": "Un problème est survenu et votre demande n’a pas été envoyée. Réessayez ou écrivez-nous à {email}.",
    "captchaError": "Nous n’avons pas pu vérifier que vous êtes une personne. Veuillez réessayer.",
    "errors": {
      "required": "Ce champ est obligatoire.",
      "invalidEmail": "Entrez une adresse courriel valide.",
      "invalidPhone": "Entrez un numéro de téléphone valide.",
      "invalidDate": "Entrez une date valide.",
      "pastDate": "Choisissez aujourd’hui ou une date future.",
      "invalidGuests": "Entrez un nombre entier entre 1 et 5 000.",
      "chooseService": "Choisissez au moins un service.",
      "messageTooShort": "Veuillez écrire au moins 10 caractères.",
      "tooLong": "C’est trop long.",
      "spam": "Veuillez laisser ce champ vide."
    }
  },
  "email": {
    "subject": "Nous avons reçu votre demande d’événement",
    "preview": "Merci de nous avoir parlé de votre événement",
    "heading": "Votre demande est reçue",
    "greeting": "Bonjour {name},",
    "intro": "Merci d’avoir contacté Événements par CAD. Voici une copie de votre demande; nous vous répondrons par courriel.",
    "eventTypeLabel": "Événement",
    "dateLabel": "Date",
    "cityLabel": "Ville",
    "servicesLabel": "Services",
    "dateNotSet": "À déterminer",
    "footer": "CAD Studio Photography · Toronto"
  }
}
```

`Events.email.dateLabel` ("Date"), `Events.email.servicesLabel` ("Services") and `Events.email.footer` are identical in both languages on purpose.

- [ ] **Step 4: Allow the intentional identical strings**

In `tests/unit/messages.test.ts`, add to the `sameInFrench` set (after `"Reviews.eventOn",`):

```ts
      "Events.email.dateLabel",
      "Events.email.servicesLabel",
      "Events.email.footer",
```

- [ ] **Step 5: Run the messages test**

Run: `pnpm vitest run tests/unit/messages.test.ts`
Expected: PASS. If "untranslated" lists other keys, translate them rather than extending the set. If an apostrophe test fails, replace `'` with `’` in the reported string.

- [ ] **Step 6: Commit**

```bash
git add messages/en.json messages/fr.json tests/unit/messages.test.ts
git commit -m "feat(events): EN/FR copy for Events by CAD"
```

---

### Task 4: Client confirmation email template

**Files:**
- Create: `src/lib/email/templates/event-enquiry-received.tsx`
- Test: `tests/unit/event-enquiry-email.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/event-enquiry-email.test.ts`:

```ts
import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { EventEnquiryReceivedEmail } from "@/lib/email/templates/event-enquiry-received";

const props = {
  lang: "en-CA",
  logoUrl: "https://cadstudio.example/brand/logo-gold.png",
  preview: "Thanks for telling us about your event",
  heading: "Your enquiry is in",
  greeting: "Hi Alex,",
  intro: "Thank you for contacting Events by CAD.",
  facts: [
    { label: "Event", value: "Corporate event" },
    { label: "Services", value: "Event management, Lights & sound" },
  ],
  message: "Annual gala\nfor 150 guests.",
  footer: "CAD Studio Photography · Toronto",
};

describe("EventEnquiryReceivedEmail", () => {
  it("renders the greeting, facts and the client's message", async () => {
    const html = await render(createElement(EventEnquiryReceivedEmail, props));
    expect(html).toContain("Hi Alex,");
    expect(html).toContain("Corporate event");
    expect(html).toContain("Lights &amp; sound");
    expect(html).toContain("Annual gala");
    expect(html).toContain('lang="en-CA"');
  });

  it("has a plain-text version", async () => {
    const text = await render(createElement(EventEnquiryReceivedEmail, props), {
      plainText: true,
    });
    expect(text).toContain("Event management, Lights & sound");
    expect(text).toContain("for 150 guests.");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/event-enquiry-email.test.ts`
Expected: FAIL — cannot resolve the template module.

- [ ] **Step 3: Implement the template**

`src/lib/email/templates/event-enquiry-received.tsx`:

```tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** All copy is passed in already translated, so the template stays locale-agnostic. */
export type EventEnquiryReceivedEmailProps = {
  lang: string;
  logoUrl: string;
  preview: string;
  heading: string;
  greeting: string;
  intro: string;
  facts: Array<{ label: string; value: string }>;
  /** The client's own message, echoed back (line breaks kept). */
  message: string;
  footer: string;
};

const ink = "#111111";
const paper = "#faf8f5";
const muted = "#6b6b6b";
const line = "#e5e0d8";

/** Client-facing copy of an "Events by CAD" enquiry. Transactional (no CASL opt-in needed). */
export function EventEnquiryReceivedEmail(props: EventEnquiryReceivedEmailProps) {
  return (
    <Html lang={props.lang}>
      <Head />
      <Preview>{props.preview}</Preview>
      <Body
        style={{
          backgroundColor: paper,
          color: ink,
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
        }}
      >
        <Container style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
          <Section
            style={{ backgroundColor: ink, borderRadius: 12, padding: "24px", textAlign: "center" }}
          >
            <Img
              src={props.logoUrl}
              alt="CAD Studio Photography"
              width={180}
              style={{ margin: "0 auto" }}
            />
          </Section>

          <Heading
            as="h1"
            style={{ fontFamily: "Georgia, serif", fontWeight: 400, fontSize: 28, marginTop: 32 }}
          >
            {props.heading}
          </Heading>
          <Text style={{ fontSize: 15 }}>{props.greeting}</Text>
          <Text style={{ fontSize: 15, color: muted }}>{props.intro}</Text>

          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${line}`,
              borderRadius: 12,
              padding: "16px 24px",
            }}
          >
            {props.facts.map((fact) => (
              <Text key={fact.label} style={{ fontSize: 14, margin: "8px 0" }}>
                <span style={{ color: muted }}>{fact.label}: </span>
                {fact.value}
              </Text>
            ))}
            <Hr style={{ borderColor: line }} />
            <Text style={{ fontSize: 14, whiteSpace: "pre-line" }}>{props.message}</Text>
          </Section>

          <Text style={{ fontSize: 12, color: muted, marginTop: 32, textAlign: "center" }}>
            {props.footer}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run tests/unit/event-enquiry-email.test.ts`
Expected: PASS. If the plain-text assertion on `"for 150 guests."` fails because of line wrapping, assert on `"150 guests"` instead.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates/event-enquiry-received.tsx tests/unit/event-enquiry-email.test.ts
git commit -m "feat(events): client confirmation email template"
```

---

### Task 5: Email composition (admin + client)

**Files:**
- Create: `src/server/emails/event-enquiry-emails.ts`
- Test: `tests/unit/event-enquiry-emails.test.ts`

Behaviour: admin email first — if it throws, the error propagates. Client confirmation second — if it throws, log and swallow.

- [ ] **Step 1: Write the failing test**

`tests/unit/event-enquiry-emails.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email/send", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  adminNotifyAddress: () => "studio@cadstudio.example",
}));
// Echo translation keys (with values) so assertions don't depend on copy.
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ namespace }: { namespace: string }) =>
    (key: string, values?: Record<string, string>) =>
      `${namespace}.${key}${values ? JSON.stringify(values) : ""}`,
}));

const { sendEventEnquiryEmails } = await import("@/server/emails/event-enquiry-emails");

const data = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: undefined,
  eventType: "corporate" as const,
  eventDate: "2026-12-05",
  guestCount: 150,
  city: "Toronto",
  services: ["management" as const, "av" as const],
  budget: "10to25k" as const,
  message: "Annual gala for our team.",
  website: undefined,
};

describe("sendEventEnquiryEmails", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("notifies the studio with every field, replying to the client", async () => {
    sendEmail.mockResolvedValue({ sent: true, id: "x" });
    await sendEventEnquiryEmails(data, "en");
    const admin = sendEmail.mock.calls[0][0];
    expect(admin.to).toBe("studio@cadstudio.example");
    expect(admin.replyTo).toBe("alex@example.com");
    expect(admin.subject).toBe("[CAD Studio Photography] New event enquiry from Alex Martin");
    for (const part of [
      "Event type: corporate",
      "Date: 2026-12-05",
      "Guests: 150",
      "City: Toronto",
      "Services: management, av",
      "Budget: 10to25k",
      "Phone: —",
      "Annual gala for our team.",
    ]) {
      expect(admin.text).toContain(part);
    }
  });

  it("sends the client a confirmation in their locale", async () => {
    sendEmail.mockResolvedValue({ sent: true, id: "x" });
    await sendEventEnquiryEmails(data, "fr");
    const client = sendEmail.mock.calls[1][0];
    expect(client.to).toBe("alex@example.com");
    expect(client.subject).toBe("Events.email.subject");
    expect(client.html).toContain('lang="fr-CA"');
    expect(client.text).toContain("Events.form.serviceOptions.management");
  });

  it("throws when the studio notification fails", async () => {
    sendEmail.mockRejectedValueOnce(new Error("Resend down"));
    await expect(sendEventEnquiryEmails(data, "en")).rejects.toThrow("Resend down");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("still succeeds when only the client confirmation fails", async () => {
    sendEmail
      .mockResolvedValueOnce({ sent: true, id: "x" })
      .mockRejectedValueOnce(new Error("bad address"));
    await expect(sendEventEnquiryEmails(data, "en")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/event-enquiry-emails.test.ts`
Expected: FAIL — cannot resolve `@/server/emails/event-enquiry-emails`.

- [ ] **Step 3: Implement**

`src/server/emails/event-enquiry-emails.ts`:

```ts
import "server-only";

import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { createElement } from "react";

import { type Locale, siteConfig } from "@/config/site";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { EventEnquiryReceivedEmail } from "@/lib/email/templates/event-enquiry-received";
import type { EventEnquiryData } from "@/lib/validators/event-enquiry";

/**
 * "Events by CAD" enquiry emails. The studio notification must go out (throws otherwise);
 * the client's copy is best effort so a bad client address doesn't fail the enquiry.
 */
export async function sendEventEnquiryEmails(data: EventEnquiryData, locale: Locale) {
  // Studio-facing: English labels, raw option keys (the studio reads English).
  await sendEmail({
    to: adminNotifyAddress(),
    replyTo: data.email,
    subject: `[${siteConfig.name}] New event enquiry from ${data.name}`,
    text: [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone ?? "—"}`,
      `Event type: ${data.eventType}`,
      `Date: ${data.eventDate ?? "—"}`,
      `Guests: ${data.guestCount ?? "—"}`,
      `City: ${data.city}`,
      `Services: ${data.services.join(", ")}`,
      `Budget: ${data.budget ?? "—"}`,
      `Language: ${locale}`,
      "",
      data.message,
    ].join("\n"),
  });

  try {
    const [t, tForm] = await Promise.all([
      getTranslations({ locale, namespace: "Events.email" }),
      getTranslations({ locale, namespace: "Events.form" }),
    ]);
    const element = createElement(EventEnquiryReceivedEmail, {
      lang: locale === "fr" ? "fr-CA" : "en-CA",
      logoUrl: new URL("/brand/logo-gold.png", siteConfig.url).toString(),
      preview: t("preview"),
      heading: t("heading"),
      greeting: t("greeting", { name: data.name }),
      intro: t("intro"),
      facts: [
        { label: t("eventTypeLabel"), value: tForm(`eventTypes.${data.eventType}`) },
        { label: t("dateLabel"), value: data.eventDate ?? t("dateNotSet") },
        { label: t("cityLabel"), value: data.city },
        {
          label: t("servicesLabel"),
          value: data.services.map((service) => tForm(`serviceOptions.${service}`)).join(", "),
        },
      ],
      message: data.message,
      footer: t("footer"),
    });
    await sendEmail({
      to: data.email,
      replyTo: siteConfig.contact.email,
      subject: t("subject"),
      html: await render(element),
      text: await render(element, { plainText: true }),
    });
  } catch (error) {
    console.error("[events] failed to send client confirmation", error);
  }
}
```

Note: the test mock echoes `namespace.key`, so with namespace `"Events.email"` the subject becomes `"Events.email.subject"` and service names `"Events.form.serviceOptions.management"` — matching the assertions. If `next-intl` types reject the nested namespace or the template-literal keys under `strict`, cast the key: `tForm(\`eventTypes.${data.eventType}\` as const)`; do not loosen types with `any`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run tests/unit/event-enquiry-emails.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/emails/event-enquiry-emails.ts tests/unit/event-enquiry-emails.test.ts
git commit -m "feat(events): studio and client enquiry emails"
```

---

### Task 6: Server action

**Files:**
- Create: `src/server/actions/event-enquiry.ts`
- Test: `tests/unit/event-enquiry-action.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/event-enquiry-action.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const isRateLimited = vi.fn();
const verifyTurnstile = vi.fn();
const sendEventEnquiryEmails = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/server/rate-limit", () => ({ isRateLimited: (...a: unknown[]) => isRateLimited(...a) }));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: (...a: unknown[]) => verifyTurnstile(...a),
}));
vi.mock("@/server/emails/event-enquiry-emails", () => ({
  sendEventEnquiryEmails: (...a: unknown[]) => sendEventEnquiryEmails(...a),
}));

const { submitEventEnquiry } = await import("@/server/actions/event-enquiry");

const valid = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  eventType: "corporate" as const,
  eventDate: "",
  guestCount: "",
  city: "Toronto",
  services: ["management" as const],
  budget: "" as const,
  message: "Annual gala for our team.",
  website: "",
};

describe("submitEventEnquiry", () => {
  beforeEach(() => {
    isRateLimited.mockReset().mockResolvedValue(false);
    verifyTurnstile.mockReset().mockResolvedValue(true);
    sendEventEnquiryEmails.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sends the emails in the visitor's locale", async () => {
    expect(await submitEventEnquiry(valid, "token")).toEqual({ ok: true });
    expect(verifyTurnstile).toHaveBeenCalledWith("token", "203.0.113.7");
    expect(isRateLimited).toHaveBeenCalledWith("eventEnquiry");
    const [data, locale] = sendEventEnquiryEmails.mock.calls[0];
    expect(locale).toBe("fr");
    expect(data).toMatchObject({ name: "Alex Martin", services: ["management"] });
  });

  it("fakes success for bots that fill the honeypot", async () => {
    expect(await submitEventEnquiry({ ...valid, website: "http://spam" })).toEqual({ ok: true });
    expect(sendEventEnquiryEmails).not.toHaveBeenCalled();
  });

  it("returns field errors as translation keys", async () => {
    expect(await submitEventEnquiry({ ...valid, services: [], city: "" })).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: { services: "chooseService", city: "required" },
    });
  });

  it("refuses when rate limited", async () => {
    isRateLimited.mockResolvedValue(true);
    expect(await submitEventEnquiry(valid)).toEqual({ ok: false, error: "rateLimited" });
    expect(sendEventEnquiryEmails).not.toHaveBeenCalled();
  });

  it("refuses when Turnstile fails", async () => {
    verifyTurnstile.mockResolvedValue(false);
    expect(await submitEventEnquiry(valid)).toEqual({ ok: false, error: "captcha" });
  });

  it("returns a server error when the studio email fails", async () => {
    sendEventEnquiryEmails.mockRejectedValue(new Error("Resend down"));
    expect(await submitEventEnquiry(valid)).toEqual({ ok: false, error: "server" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/event-enquiry-action.test.ts`
Expected: FAIL — cannot resolve `@/server/actions/event-enquiry`.

- [ ] **Step 3: Implement**

`src/server/actions/event-enquiry.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import type { Locale } from "@/config/site";
import { verifyTurnstile } from "@/lib/turnstile";
import { type EventEnquiryInput, eventEnquirySchema } from "@/lib/validators/event-enquiry";
import { sendEventEnquiryEmails } from "@/server/emails/event-enquiry-emails";
import { isRateLimited } from "@/server/rate-limit";

export type EventEnquiryResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation";
      fieldErrors: Partial<Record<keyof EventEnquiryInput, string>>;
    }
  | { ok: false; error: "captcha" | "rateLimited" | "server" };

/** "Events by CAD" enquiry. Always re-validated on the server; nothing is stored. */
export async function submitEventEnquiry(
  input: EventEnquiryInput,
  turnstileToken?: string,
): Promise<EventEnquiryResult> {
  const parsed = eventEnquirySchema.safeParse(input);
  if (!parsed.success) {
    // Bots that fill the honeypot get a fake success so they learn nothing.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) return { ok: true };
    const fieldErrors: Partial<Record<keyof EventEnquiryInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof EventEnquiryInput;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  if (await isRateLimited("eventEnquiry")) return { ok: false, error: "rateLimited" };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return { ok: false, error: "captcha" };
  }

  try {
    await sendEventEnquiryEmails(parsed.data, (await getLocale()) as Locale);
    return { ok: true };
  } catch (error) {
    console.error("[events] failed to send enquiry", error);
    return { ok: false, error: "server" };
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run tests/unit/event-enquiry-action.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/event-enquiry.ts tests/unit/event-enquiry-action.test.ts
git commit -m "feat(events): event enquiry server action"
```

---

### Task 7: JSON-LD

**Files:**
- Modify: `src/lib/seo/json-ld.ts` (add after `serviceJsonLd`)
- Test: `tests/unit/events-json-ld.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/events-json-ld.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { eventServicesJsonLd } from "@/lib/seo/json-ld";

describe("eventServicesJsonLd", () => {
  it("describes the event services without prices", () => {
    const data = eventServicesJsonLd({
      baseUrl: "https://cadstudio.example",
      locale: "fr",
      name: "Événements par CAD",
      description: "Gestion d’événements",
      services: ["Gestion d’événements", "Décoration"],
    });
    expect(data).toMatchObject({
      "@type": "Service",
      name: "Événements par CAD",
      serviceType: "Event management",
      url: "https://cadstudio.example/fr/events",
      provider: { "@type": "ProfessionalService", name: "CAD Studio Photography" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Gestion d’événements" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Décoration" } },
        ],
      },
    });
    expect(JSON.stringify(data)).not.toContain("price");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run tests/unit/events-json-ld.test.ts`
Expected: FAIL — `eventServicesJsonLd` is not exported.

- [ ] **Step 3: Implement**

In `src/lib/seo/json-ld.ts`, after the `serviceJsonLd` function add:

```ts
/** "Events by CAD" (event management, décor, catering, AV). No prices: none are published. */
export function eventServicesJsonLd({
  baseUrl,
  locale,
  name,
  description,
  services,
}: Base & { name: string; description: string; services: string[] }) {
  return {
    "@type": "Service",
    name,
    description,
    serviceType: "Event management",
    url: absolute(baseUrl, `/${locale}/events`),
    provider: businessRef(baseUrl),
    areaServed: ["Greater Toronto Area", "Canada", "Sri Lanka"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name,
      itemListElement: services.map((service) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: service },
      })),
    },
  } satisfies JsonLdObject;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm vitest run tests/unit/events-json-ld.test.ts tests/unit/json-ld.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/json-ld.ts tests/unit/events-json-ld.test.ts
git commit -m "feat(events): Service JSON-LD for event services"
```

---

### Task 8: Shared service icons + enquiry form

**Files:**
- Create: `src/components/events/event-services.ts`
- Create: `src/components/events/event-enquiry-form.tsx`

No unit test (UI); covered by e2e in Task 11.

- [ ] **Step 1: Service icon map**

`src/components/events/event-services.ts`:

```ts
import { ClipboardList, type LucideIcon, Sparkles, UtensilsCrossed, Speaker } from "lucide-react";

/** The four "Events by CAD" services shown on /events and the home teaser, in display order. */
export const EVENT_SHOWCASE: Array<{
  key: "management" | "decor" | "catering" | "av";
  icon: LucideIcon;
}> = [
  { key: "management", icon: ClipboardList },
  { key: "decor", icon: Sparkles },
  { key: "catering", icon: UtensilsCrossed },
  { key: "av", icon: Speaker },
];
```

- [ ] **Step 2: Enquiry form**

`src/components/events/event-enquiry-form.tsx`:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useTurnstile } from "@/components/site/turnstile";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  EVENT_BUDGETS,
  EVENT_ENQUIRY_SERVICES,
  EVENT_TYPES,
  type EventEnquiryInput,
  eventEnquirySchema,
} from "@/lib/validators/event-enquiry";
import { submitEventEnquiry } from "@/server/actions/event-enquiry";

const ERROR_KEYS = [
  "required",
  "invalidEmail",
  "invalidPhone",
  "invalidDate",
  "pastDate",
  "invalidGuests",
  "chooseService",
  "messageTooShort",
  "tooLong",
  "spam",
] as const;

function isErrorKey(key: string): key is (typeof ERROR_KEYS)[number] {
  return (ERROR_KEYS as readonly string[]).includes(key);
}

const fieldClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 mt-2 block w-full rounded-lg border px-4 py-3 text-base focus-visible:ring-3 focus-visible:outline-none aria-invalid:border-destructive";

const defaultValues: EventEnquiryInput = {
  name: "",
  email: "",
  phone: "",
  eventType: "" as EventEnquiryInput["eventType"],
  eventDate: "",
  guestCount: "",
  city: "",
  services: [],
  budget: "",
  message: "",
  website: "",
};

export function EventEnquiryForm() {
  const t = useTranslations("Events.form");
  const tCommon = useTranslations("Common");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const turnstile = useTurnstile("event_enquiry");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<EventEnquiryInput>({
    resolver: zodResolver(eventEnquirySchema),
    defaultValues,
    shouldFocusError: true,
  });

  const onSubmit = (values: EventEnquiryInput) =>
    startTransition(async () => {
      const result = await submitEventEnquiry(values, turnstile.token);
      turnstile.reset();
      if (result.ok) {
        setSent(true);
        reset(defaultValues);
        return;
      }
      if (result.error === "validation") {
        const fields = Object.entries(result.fieldErrors) as Array<
          [keyof EventEnquiryInput, string]
        >;
        for (const [field, message] of fields) setError(field, { message });
        if (fields[0]) setFocus(fields[0][0]);
        return;
      }
      toast.error(
        result.error === "captcha"
          ? t("captchaError")
          : result.error === "rateLimited"
            ? tCommon("tooManyRequests")
            : t("serverError", { email: siteConfig.contact.email }),
      );
    });

  if (sent) {
    return (
      <div role="status" className="bg-card rounded-xl border p-8 text-center">
        <CheckCircle2 className="text-gold-text mx-auto size-10" aria-hidden />
        <h3 className="mt-4 text-3xl">{t("successTitle")}</h3>
        <p className="text-muted-foreground mt-2">{t("successBody")}</p>
        <Button variant="outline" size="cta" className="mt-6" onClick={() => setSent(false)}>
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  const errorFor = (field: keyof EventEnquiryInput) => {
    const key = errors[field]?.message;
    if (!key) return null;
    return (
      <p id={`event-${field}-error`} className="text-destructive mt-1.5 text-sm">
        {isErrorKey(key) ? t(`errors.${key}`) : key}
      </p>
    );
  };
  const a11y = (field: keyof EventEnquiryInput) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `event-${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="event-name" className="text-sm font-medium">
            {t("name")}
          </label>
          <input
            id="event-name"
            autoComplete="name"
            className={fieldClass}
            {...a11y("name")}
            {...register("name")}
          />
          {errorFor("name")}
        </div>
        <div>
          <label htmlFor="event-email" className="text-sm font-medium">
            {t("email")}
          </label>
          <input
            id="event-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            {...a11y("email")}
            {...register("email")}
          />
          {errorFor("email")}
        </div>
        <div>
          <label htmlFor="event-phone" className="text-sm font-medium">
            {t("phone")}
          </label>
          <input
            id="event-phone"
            type="tel"
            autoComplete="tel"
            className={fieldClass}
            {...a11y("phone")}
            {...register("phone")}
          />
          {errorFor("phone")}
        </div>
        <div>
          <label htmlFor="event-eventType" className="text-sm font-medium">
            {t("eventType")}
          </label>
          <select
            id="event-eventType"
            className={cn(fieldClass, "appearance-auto")}
            {...a11y("eventType")}
            {...register("eventType")}
          >
            <option value="" disabled>
              {t("selectType")}
            </option>
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`eventTypes.${type}`)}
              </option>
            ))}
          </select>
          {errorFor("eventType")}
        </div>
        <div>
          <label htmlFor="event-eventDate" className="text-sm font-medium">
            {t("eventDate")}
          </label>
          <input
            id="event-eventDate"
            type="date"
            className={fieldClass}
            {...a11y("eventDate")}
            {...register("eventDate")}
          />
          {errorFor("eventDate")}
        </div>
        <div>
          <label htmlFor="event-guestCount" className="text-sm font-medium">
            {t("guestCount")}
          </label>
          <input
            id="event-guestCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={5000}
            className={fieldClass}
            {...a11y("guestCount")}
            {...register("guestCount")}
          />
          {errorFor("guestCount")}
        </div>
        <div>
          <label htmlFor="event-city" className="text-sm font-medium">
            {t("city")}
          </label>
          <input
            id="event-city"
            autoComplete="address-level2"
            className={fieldClass}
            {...a11y("city")}
            {...register("city")}
          />
          {errorFor("city")}
        </div>
        <div>
          <label htmlFor="event-budget" className="text-sm font-medium">
            {t("budget")}
          </label>
          <select
            id="event-budget"
            className={cn(fieldClass, "appearance-auto")}
            {...a11y("budget")}
            {...register("budget")}
          >
            <option value="">{t("budgetNone")}</option>
            {EVENT_BUDGETS.map((budget) => (
              <option key={budget} value={budget}>
                {t(`budgets.${budget}`)}
              </option>
            ))}
          </select>
          {errorFor("budget")}
        </div>
      </div>

      <fieldset aria-describedby={errors.services ? "event-services-error" : undefined}>
        <legend className="text-sm font-medium">{t("services")}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {EVENT_ENQUIRY_SERVICES.map((service) => (
            <label
              key={service}
              className="has-[:checked]:border-gold flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3"
            >
              <input
                type="checkbox"
                value={service}
                className="accent-gold size-4"
                {...register("services")}
              />
              {t(`serviceOptions.${service}`)}
            </label>
          ))}
        </div>
        {errorFor("services")}
      </fieldset>

      <div>
        <label htmlFor="event-message" className="text-sm font-medium">
          {t("message")}
        </label>
        <textarea
          id="event-message"
          rows={6}
          className={fieldClass}
          {...a11y("message")}
          {...register("message")}
        />
        {errorFor("message")}
      </div>

      {/* Honeypot: off-screen and skipped by assistive tech; bots tend to fill it. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="event-website">{t("honeypot")}</label>
        <input id="event-website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      {turnstile.element}

      <p className="text-muted-foreground text-sm">
        {t.rich("privacyNotice", {
          privacy: (chunks) => (
            <Link href="/privacy" className="text-gold-text underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <Button type="submit" size="cta" disabled={pending} className="w-full sm:w-auto">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {pending ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
```

Notes:
- Field ids are prefixed `event-` so they never collide with other forms.
- `useTurnstile` takes an action name string; Turnstile action names allow `[a-z0-9_-]`, so `"event_enquiry"`. If `src/components/site/turnstile.tsx` validates the action against a list, add `event_enquiry` there.
- `focusing a checkbox group` via `setFocus("services")` focuses the first checkbox registered under that name — acceptable.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: no errors. If `t(\`eventTypes.${type}\`)` errors under next-intl strict key typing, the `as const` tuples should already make the key a union literal; if not, see how `contact-form.tsx` does `t(\`types.${type}\`)` with `otherEnquiryTypes` and mirror it.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/event-services.ts src/components/events/event-enquiry-form.tsx
git commit -m "feat(events): event enquiry form"
```

---

### Task 9: The `/events` page

**Files:**
- Create: `src/app/[locale]/(site)/events/page.tsx`

- [ ] **Step 1: Write the page**

`src/app/[locale]/(site)/events/page.tsx`:

```tsx
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { EventEnquiryForm } from "@/components/events/event-enquiry-form";
import { EVENT_SHOWCASE } from "@/components/events/event-services";
import { JsonLd } from "@/components/site/json-ld";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { StoredImage } from "@/components/site/stored-image";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { Link } from "@/i18n/navigation";
import { eventServicesJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

const STEPS = ["consult", "plan", "setup", "day", "wrap"] as const;

// TODO(owner): event photos — placeholders render as brand-toned blanks until supplied.
const HERO_IMAGE = { publicId: "placeholder/events-hero", width: 1600, height: 1067 };
const ENQUIRE_IMAGE = { publicId: "placeholder/events-enquire", width: 1200, height: 1500 };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Events" });
  return pageMetadata({
    locale,
    path: "/events",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** "Events by CAD": event management, décor, catering, lights & sound. Showcase + enquiry. */
export default async function EventsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Events");
  const accent = (chunks: ReactNode) => <Accent>{chunks}</Accent>;

  return (
    <>
      <JsonLd
        data={eventServicesJsonLd({
          baseUrl: siteConfig.url,
          locale,
          name: t("eyebrow"),
          description: t("metaDescription"),
          services: EVENT_SHOWCASE.map(({ key }) => t(`services.${key}.title`)),
        })}
      />

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div>
          <SectionHeading
            as="h1"
            eyebrow={t("eyebrow")}
            title={t.rich("title", { accent })}
            intro={t("intro")}
          />
          <a href="#enquire" className={cn(buttonVariants({ size: "cta" }), "mt-8")}>
            {t("cta")}
          </a>
        </div>
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
          <StoredImage image={HERO_IMAGE} alt="" fill priority sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
      </section>

      {/* TODO(owner): confirm service copy (catering in-house or partners; décor/AV owned or hired). */}
      <section aria-labelledby="event-services-title" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <SectionHeading
          id="event-services-title"
          eyebrow={t("servicesEyebrow")}
          title={t.rich("servicesTitle", { accent })}
          intro={t("servicesIntro")}
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {EVENT_SHOWCASE.map(({ key, icon: Icon }) => (
            <li key={key} className="bg-card rounded-xl border p-7">
              <span className="border-gold/40 text-gold-text inline-flex size-11 items-center justify-center rounded-lg border">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 text-2xl">{t(`services.${key}.title`)}</h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t(`services.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="event-team-title" className="bg-ink text-paper">
        <div aria-hidden className="bg-gold-gradient h-px" />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <SectionHeading
            id="event-team-title"
            inverted
            align="center"
            eyebrow={t("teamEyebrow")}
            title={t.rich("teamTitle", { accent })}
            intro={t("teamBody")}
          />
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3">
            <Link
              href="/packages"
              className="text-gold-light inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {t("teamPackages")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/portfolio"
              className="text-gold-light inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              {t("teamPortfolio")}
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* TODO(owner): confirm the process steps. */}
      <section aria-labelledby="event-process-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          id="event-process-title"
          align="center"
          eyebrow={t("processEyebrow")}
          title={t.rich("processTitle", { accent })}
        />
        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <li key={step} className="border-t pt-5">
              <span className="font-heading text-gold-text text-3xl lining-nums">{index + 1}</span>
              <h3 className="mt-2 text-xl">{t(`steps.${step}.title`)}</h3>
              <p className="text-muted-foreground mt-2 text-sm">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="enquire"
        aria-labelledby="event-enquire-title"
        className="mx-auto max-w-7xl scroll-mt-20 px-4 pb-24 sm:px-6"
      >
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
          <div>
            <SectionHeading
              id="event-enquire-title"
              eyebrow={t("enquireEyebrow")}
              title={t.rich("enquireTitle", { accent })}
              intro={t("enquireIntro")}
            />
            <div className="relative mt-10 hidden aspect-[4/5] overflow-hidden rounded-2xl lg:block">
              <StoredImage image={ENQUIRE_IMAGE} alt="" fill sizes="40vw" />
            </div>
          </div>
          <div className="bg-card relative rounded-2xl border p-6 shadow-sm sm:p-10">
            <EventEnquiryForm />
          </div>
        </div>
      </section>
    </>
  );
}
```

Notes:
- `scroll-mt-20` keeps the anchor clear of the sticky header. Smooth scrolling (if any) is global CSS; do not add JS.
- Run `pnpm prettier --write "src/app/[locale]/(site)/events/page.tsx"` — some lines above exceed the print width.

- [ ] **Step 2: Typecheck + view**

Run: `pnpm typecheck`, then `pnpm dev` and open `http://localhost:3000/en/events` and `/fr/events`.
Expected: hero, 4 service cards, dark band, 5 steps, form. Check widths 360 / 768 / 1280 / 1920 px and dark theme.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(site)/events/page.tsx"
git commit -m "feat(events): Events by CAD page"
```

---

### Task 10: Nav, home teaser, sitemap

**Files:**
- Modify: `src/components/site/nav-items.ts`
- Create: `src/components/site/events-teaser.tsx`
- Modify: `src/app/[locale]/(site)/page.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Nav item**

In `src/components/site/nav-items.ts`, in `mainNav` after the packages line add:

```ts
  { key: "events", href: "/events" },
```

- [ ] **Step 2: Teaser component**

`src/components/site/events-teaser.tsx`:

```tsx
import { getTranslations } from "next-intl/server";

import { EVENT_SHOWCASE } from "@/components/events/event-services";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { Accent, SectionHeading } from "./section-heading";

/** Home band pointing to "Events by CAD" (/events). */
export async function EventsTeaser() {
  const t = await getTranslations("Events");

  return (
    <section aria-labelledby="events-teaser-title" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="bg-card grid items-center gap-10 rounded-2xl border p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SectionHeading
            id="events-teaser-title"
            eyebrow={t("eyebrow")}
            title={t.rich("teaserTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
            intro={t("teaserBody")}
          />
          <Link href="/events" className={cn(buttonVariants({ size: "cta" }), "mt-8")}>
            {t("teaserCta")}
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3">
          {EVENT_SHOWCASE.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-3 rounded-lg border px-4 py-4">
              <Icon className="text-gold-text size-5 shrink-0" aria-hidden />
              <span className="text-sm font-medium">{t(`services.${key}.title`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Render on home**

In `src/app/[locale]/(site)/page.tsx`: add `import { EventsTeaser } from "@/components/site/events-teaser";` (alphabetical, after `CategoryTiles`), and render `<EventsTeaser />` directly after `<CategoryTiles />`.

The main working tree has uncommitted edits to this file from another session; in the worktree you're editing the committed version — expect a trivial merge later.

- [ ] **Step 4: Sitemap**

In `src/app/sitemap.ts`, in `STATIC_PATHS` after `"/packages",` add `"/events",`.

- [ ] **Step 5: Header fit at 768 px**

Run `pnpm dev`, open `/en` at 768 px and 1024 px width (light theme, top of page and scrolled). The desktop nav now has 7 items.
Expected: one line, no overlap with logo or CTAs.
If it overflows at 768 px: in `src/components/site/site-header.tsx` change the nav's `hidden md:block` to `hidden lg:block`, and in `src/components/site/mobile-nav.tsx:34` change `md:hidden` to `lg:hidden`. Also check where the header CTAs switch (search `md:` in `site-header.tsx`) and keep them consistent. Then re-check 768 (hamburger) and 1024 (full nav).

- [ ] **Step 6: Run unit tests + typecheck**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/site/nav-items.ts src/components/site/events-teaser.tsx "src/app/[locale]/(site)/page.tsx" src/app/sitemap.ts src/components/site/site-header.tsx src/components/site/mobile-nav.tsx
git commit -m "feat(events): nav link, home teaser and sitemap entry"
```

(`git add` of an unchanged file is a no-op.)

---

### Task 11: E2e tests

**Files:**
- Create: `tests/e2e/events.spec.ts`
- Modify: `tests/e2e/seo-audit.spec.ts` (`PAGES`), `tests/e2e/a11y.spec.ts` (`PUBLIC_PAGES`), `tests/e2e/french-pages.spec.ts` (`PAGES`)

- [ ] **Step 1: Write the spec**

`tests/e2e/events.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("events page", () => {
  test("shows the four event services", async ({ page }) => {
    await page.goto("/en/events");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your event, handled");
    for (const name of ["Event management", "Décor", "Catering", "Lights & sound"]) {
      await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
    }
  });

  test("is linked from the header and the home page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/en");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Events" }).click();
    await expect(page).toHaveURL(/\/en\/events$/);
    await page.goto("/en");
    await page.getByRole("link", { name: "Explore event services" }).click();
    await expect(page).toHaveURL(/\/en\/events$/);
  });

  test("requires at least one service", async ({ page }) => {
    await page.goto("/en/events");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByLabel("Name")).toBeFocused();
    await expect(page.getByText("Choose at least one service.")).toBeVisible();
  });

  test("submits an enquiry and shows the success state", async ({ page }) => {
    await page.goto("/en/events");
    await page.getByLabel("Name").fill("Test Client");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Type of event").selectOption("corporate");
    await page.getByLabel("City").fill("Toronto");
    await page.getByRole("checkbox", { name: "Lights & sound" }).check();
    await page.getByLabel("Tell us about your event").fill("Annual gala for 150 guests in Toronto.");
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Thank you" })).toBeVisible();
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/events");
    await expect(page.getByRole("heading", { level: 3, name: "Traiteur" })).toBeVisible();
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page.getByText("Choisissez au moins un service.")).toBeVisible();
  });
});
```

Note: `getByLabel("Name")` must match only the event form's name field — the page has one form, so it does. If the header's mobile nav renders at 1280 px and the "Events" link is ambiguous, scope as written (navigation named "Main"; `Common.mainNav` is "Main" per `layout.spec.ts`).

- [ ] **Step 2: Add `/events` to the page lists**

- `tests/e2e/seo-audit.spec.ts` `PAGES`: add `"/events",` after `"/packages/wedding",`.
- `tests/e2e/a11y.spec.ts` `PUBLIC_PAGES`: add `"/en/events",` after `"/en/packages/wedding",`.
- `tests/e2e/french-pages.spec.ts` `PAGES`: add `"/fr/events",` in the matching position (open the file and follow its list order).

- [ ] **Step 3: Run e2e for the touched specs**

Start Postgres first if it isn't running (see the project's local-postgres notes), then:

Run: `pnpm test:e2e tests/e2e/events.spec.ts tests/e2e/seo-audit.spec.ts tests/e2e/a11y.spec.ts tests/e2e/french-pages.spec.ts tests/e2e/layout.spec.ts tests/e2e/home.spec.ts`
Expected: PASS. Fix axe violations at the source (contrast, labels) — never by excluding rules.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/events.spec.ts tests/e2e/seo-audit.spec.ts tests/e2e/a11y.spec.ts tests/e2e/french-pages.spec.ts
git commit -m "test(events): e2e for the events page and enquiry"
```

---

### Task 12: Docs

**Files:**
- Modify: `AGENTS.md`
- Modify: `docs/loop/OPEN_QUESTIONS.md`

- [ ] **Step 1: AGENTS.md**

1. §1 "Required features (MVP)": after item 8 (Contact) insert a new item and renumber Admin to 10:

```markdown
9. **Events by CAD** — showcase of event management, décor, catering and lights & sound, with an event enquiry form (emails only; no pricing or booking).
```

2. §4 directory tree: under `[locale]/(site)/` add `│   │   │   ├── events/page.tsx           # Events by CAD`; under `components/` add `│   │   ├── events/      # event services, enquiry form`.

3. §6: insert before `### 6.10 Admin`:

```markdown
### 6.11 Events by CAD `/events`
- Sub-brand inside the site ("Events by CAD"), same visual system; nav item **Events** and a home teaser after the service tiles.
- Sections: hero with **Plan your event** CTA → 4 services (event management, décor, catering, lights & sound) → dark "one team" band linking packages and portfolio → 5-step process → split image + enquiry form (`#enquire`).
- Enquiry form: name, email, phone?, event type, date? (today or later), guests? (1–5000), city, services (≥ 1 of management, décor, catering, lights & sound, photography, videography), budget range?, message. Honeypot + Turnstile + rate limit (`eventEnquiry`).
- Emails only, nothing stored: studio notification must succeed (else the client sees an error with the studio email); the client's localized copy is best effort.
- No prices, packages or booking for event services. Copy uses only owner-confirmed facts; open items in `docs/loop/OPEN_QUESTIONS.md`.
```

4. §16 "Still open": add

```markdown
- Events by CAD: catering in-house or partners; décor and AV equipment owned or hired; event photos; enquiry response time; service area for event services.
```

- [ ] **Step 2: OPEN_QUESTIONS.md**

Append rows (use the next free numbers after the last `Q` row; at time of writing the last is Q19):

```markdown
| Q20 | Events by CAD: is catering done in-house or through partners? Are décor and lights/sound equipment owned or hired? | Generic copy, no claims | events | OPEN | |
| Q21 | Events by CAD: photos for the /events hero and enquiry section | Brand-toned placeholders | events | OPEN | |
| Q22 | Events by CAD: promised reply time for enquiries, and service area for event services (same as photography?) | No reply time stated | events | OPEN | |
| Q23 | French copy for Events by CAD (`messages/fr.json` → `Events`, `Nav.events`). Should the sub-brand stay "Events by CAD" in French, or "Événements par CAD" (current draft)? | Agent draft — TODO(owner-fr): review | events | OPEN | |
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md docs/loop/OPEN_QUESTIONS.md
git commit -m "docs: Events by CAD in AGENTS.md and open questions"
```

---

### Task 13: Definition of done

- [ ] **Step 1: Full check**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: all pass. Fix any lint issues in the new files (e.g. import order) and commit with `fix(events): lint`.

- [ ] **Step 2: Hand back**

Report: branch `feat/events` in `../cad_studio-events`, commits, test results, header decision from Task 10 Step 5, and any deviations. Then use superpowers:finishing-a-development-branch.
