# Pre-launch checklist — CAD Studio Photography

Everything that is still a placeholder or a sample, and what to do about it. Run
`pnpm prelaunch` at any time to list what's left in the code; it reports zero when the code
is ready. Open questions are tracked in `docs/loop/OPEN_QUESTIONS.md` (Q-numbers below).

## 1. Accounts and environment (Vercel)

| Setting | What it's for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Real domain (Q6) | Replaces the dummy `https://cadstudio.example` used in links, emails, the sitemap and canonicals. |
| `EMAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | Sender and studio inbox | Domain must be verified in Resend. |
| `RESEND_API_KEY` (and optionally `AUTH_RESEND_KEY`) | All emails, including admin sign-in links | Without it nothing is sent in production. |
| `AUTH_SECRET`, `LINK_TOKEN_SECRET`, `CRON_SECRET` | Sessions, signed client links, the daily hold-release job | Long random values; never reuse the local ones. |
| `SEED_ADMIN_EMAIL` | First admin account (Q17) | Run `pnpm db:seed` once against production; add staff later in **Admin → Team**. |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Rate limiting on public forms | Free tier is enough. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Bot check on public forms | Create the widget for the real domain. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `_SECRET` | Photos (Q18) | Needed before real photos can be uploaded (task 7.4c). |
| `SHOW_SAMPLE_CONTENT` | Sample clients, projects and reviews | Always hidden on Vercel production; leave unset (or `false`) there. |
| `PRICING_CONFIRMED=true` | Marks prices as final: removes the "pricing pending" banner on previews and lets prices appear in search results (structured data) | Only after section 3 is done. |
| `LEGAL_REVIEWED=true` | Removes the "pending legal review" notice on Privacy/Terms | Only after section 5 is done. |

Then run `prisma migrate deploy` (Vercel's build command already does) and seed once.

## 2. Studio facts in the code (`src/config/site.ts` and pages)

- Business email and phone (Q6) — `site.ts`, footer, contact page.
- Social profile URLs — `site.ts`.
- Business hours — `site.ts`, contact page.
- WhatsApp number for a chat button, if wanted (Q14).
- About page: team member profiles, equipment (`about/page.tsx`). Story and stats are done.

## 3. Prices, rules and payment (Admin)

All editable in the admin — nothing pricing-related is in the code.

- **Packages** and **Add-ons**: replace the seed prices with real ones.
- **Pricing**: extra hour/photographer rates, travel, surcharges, deposit %, capacity; confirm the quote-formula interpretations (Q16).
- **Pricing → Sales tax**: confirm PST for photography in BC/MB/SK with the accountant (Q10).
- **Settings**: cancellation policy and payment instructions (bank details) in English and French — payment requests can't be sent until these are real.

## 4. Photos and real clients

- Hero slideshow (3–5 best images), category tiles, owner portrait (home and About).
- Real portfolio projects to replace the four samples ("… (Sample)"), with client consent ticked where the client may be named (Q7).
- Gallery images with alt text in both languages and the consent box ticked.
- Real recommendations/reviews come in through the site and admin moderation; samples never show on production.

## 5. Legal (Q15)

`content/legal/privacy.{en,fr}.md` and `terms.{en,fr}.md` are drafts: privacy officer name (Québec Law 25), retention periods, service providers and regions, cancellation and refund terms, image licence, liability. Have them reviewed, then set `LEGAL_REVIEWED=true`.

## 6. French review (Q12)

All French was drafted by an agent and needs a fluent reviewer. Automated checks already
guarantee that nothing is missing: every English key has a French version, every package,
add-on and sample project has French text, the French pages show no English UI text, and
apostrophes are typographic (’). Canadian French conventions are used: `3 616,00 $`, no space
before `!`/`?`/`;` (Office québécois de la langue française), « guillemets ».

What to read, in order of importance:

1. **Website text** — `messages/fr.json`, 549 strings (26 sections: home, packages, quote,
   booking, reviews, contact, about, legal notices, navigation…). Easiest to review on the
   site itself at `/fr`.
2. **Emails** — the `Email` section of `messages/fr.json` (47 strings): quote summary,
   booking request, deposit request, booking confirmed, thank-you with review link,
   cancellation, released hold. Send yourself a French quote and booking to see them.
3. **Legal pages** — `content/legal/privacy.fr.md` (~950 words) and `terms.fr.md`
   (~500 words), reviewed together with the legal review (Q15).
4. **Package and add-on text** — French names, summaries, descriptions and inclusions;
   editable in **Admin → Packages / Add-ons**.
5. Sample project stories and reviews — only shown on previews; replaced by real content.

Strings that are intentionally identical in both languages (names, Ontario, Portfolio,
Contact, Total…) are listed in `tests/unit/messages.test.ts`.

## 7. Final checks

- Run `pnpm prelaunch` — it should report no placeholders.
- Run `BASE_URL=https://<your-domain> pnpm perf` — Lighthouse ≥ 90 on mobile (Q19).
- A manual keyboard and screen-reader pass (NVDA or VoiceOver) through quote → booking.
- Submit a real quote, booking and review; check the emails arrive in both languages.
