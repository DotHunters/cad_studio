# Open questions for the owner

From `AGENTS.md` §16, plus anything the loop finds. When you answer one, fill in **Answer** and set the status to `ANSWERED`. The next loop tick applies it to `AGENTS.md`/code and marks it `APPLIED`.

Until an answer exists, the loop uses the placeholder shown and marks the code `TODO(owner)`.

Statuses: `OPEN` · `PARTIAL` (part answered, rest still placeholder) · `ANSWERED` (loop must apply) · `APPLIED`.

| # | Question | Placeholder in use | Affects tasks | Status | Answer |
|---|---|---|---|---|---|
| Q1 | Studio city/province and time zone? Public address or service area only? | — | 1.5, 2.6, 4.x, 5.x | APPLIED | Scarborough, Toronto, ON, `America/Toronto`. No public address — service area only, no map. |
| Q2 | Final package names, inclusions and prices? Deposit % and cancellation policy? | §8.1 seed values, 30% deposit | 1.8, 2.3, 2.4, 2.7, 4.2, 7.3 | APPLIED | Update from the admin dashboard — must be changeable. Spec: all pricing, deposit %, cancellation policy (`SiteSetting`) admin-editable; seeds are starting values. |
| Q3 | Travel policy: free radius, per-km rate, international travel fees? | — | 1.8, 4.2 | APPLIED | OK — 40 km free, $0.70/km, international = custom quote. |
| Q4 | How many photographers are on the team (daily capacity)? | — | 1.8, 5.1 | APPLIED | 3 |
| Q5 | Brand assets: logo, colours, fonts? | — | 1.2, 1.3, 1.10 | APPLIED | Logos in `assets/` (gold, black, white PNG). Accent matched to logo gold `#C79856`. Nice-to-have: SVG versions. |
| Q6 | Domain and business email? | Dummy `cadstudio.example`, `bookings@cadstudio.example` | 1.5, 1.6, 2.8 | PARTIAL | Use dummy for now. **Still open:** real domain before launch. |
| Q7 | Which past clients can be named publicly (local and global)? Stats (events, countries)? | Fictional sample clients, `isSample = true`, hidden in production | 1.8, 2.2, 3.2, 3.3 | PARTIAL | Use dummy clients for now. **Still open:** real clients + stats before launch. |
| Q8 | Launch bilingual (English/French)? | — | 1.11 + all UI tasks | APPLIED | Bilingual. Spec: EN + FR at launch, `/en` `/fr` routes, `*Fr` DB columns, localized emails. |
| Q9 | Payment provider, and are deposits required to confirm a booking? | — | 5.x, 7.6 | APPLIED | For now bank transfer or cash. Spec: offline deposit, admin records payment → `CONFIRMED`. Stripe stays Phase 2. |
| Q10 | PST applicability for photography services in BC/MB/SK (accountant)? | GST only in those provinces | 1.8, 4.1 | PARTIAL | Unknown — owner will ask the customer/accountant. Continue with GST only; rates are admin-editable. |
| Q11 | Bank transfer details / payment instructions? When is the deposit due? | `PAYMENT_INSTRUCTIONS` = `TODO(owner)` | 5.5, 7.6 | APPLIED | Admin emails bank details or a payment link to the customer. Spec: admin "Send payment request" action; hold expires 48 h after request. |
| Q13 | Brand name: "Cad Studio" (logo) or "CAD Studios" (old spec)? | — | all | APPLIED | **Cad Studio**. |
| Q12 | Who reviews the French copy before launch? | — | 8.6 | APPLIED | Agents write the French; a tester reviews at the end. FR text flagged `TODO(owner-fr): review`. |
| Q14 | WhatsApp number for a floating "chat with us" button (idea from the reference site)? | Button hidden until a number is set in `siteConfig.contact.whatsapp` | 2.2 | OPEN | |
| Q15 | Legal review of Privacy & Terms (content/legal/*.md): privacy officer name (Law 25), retention periods, service providers/regions, cancellation & refund policy, image licence terms, liability. | Draft text + visible "pending legal review" notice until `LEGAL_REVIEWED=true` | 2.7 | OPEN | |
| Q16 | Quote formula interpretations (AGENTS.md §8.1): surcharges don't stack (higher wins); surcharges/discounts only on the service, not add-ons/travel; per-hour add-ons for the full duration; half-hour steps; tax on travel. OK? | As listed | 4.2 | OPEN | |
| Q17 | Which email(s) should have admin access (owner = ADMIN; any staff)? Sign-in is by emailed link, so these must be real inboxes. | `SEED_ADMIN_EMAIL` env var creates the first admin; none set yet | 7.1 | OPEN | |
