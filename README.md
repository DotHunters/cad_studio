# CAD Studio Photography

Website for **CAD Studio Photography** (Collection Art Design), a photography studio in Toronto. It covers packages, an instant quote generator, booking, portfolio, gallery, reviews and an admin dashboard. The site is bilingual (English and French) from launch.

> Status: work in progress. Milestone 1 (Foundation) is done and milestone 2 (Content pages) is under way. See [`docs/loop/TASKS.md`](docs/loop/TASKS.md) and [`docs/loop/PROGRESS.md`](docs/loop/PROGRESS.md).

## Tech stack

- Next.js 15 (App Router, Turbopack), React 19, TypeScript (strict)
- Tailwind CSS v4 and shadcn/ui
- PostgreSQL with Prisma 7 (`@prisma/adapter-pg`; the client is generated to `src/generated/prisma`)
- next-intl for `/en` and `/fr` routes, next-themes for light and dark mode
- Vitest for unit tests, Playwright for end-to-end tests
- pnpm as the package manager

Planned for later milestones: Auth.js, Cloudinary, Resend, Zod and React Hook Form, Turnstile, Upstash rate limiting and Stripe (phase 2).

## Getting started

### Prerequisites

- Node.js 20 or newer
- pnpm 10 (`npm i -g pnpm`)
- PostgreSQL 15 or newer, running locally or hosted

### Setup

```bash
pnpm install                  # also runs `prisma generate`
cp .env.example .env.local    # then fill in the values
pnpm db:migrate               # create the schema
pnpm db:seed                  # load packages, pricing, tax rates and sample content
pnpm dev                      # http://localhost:3000
```

Both Next.js and the Prisma CLI read `.env.local` (see `prisma.config.ts`). The only variable required for local development is `DATABASE_URL`. The others are needed only when the features that use them are built. `.env.example` explains every variable.

Never commit `.env*` files other than `.env.example`.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` / `pnpm start` | Make a production build and serve it |
| `pnpm lint` | Run ESLint |
| `pnpm typecheck` | Run `tsc --noEmit` |
| `pnpm format` / `pnpm format:check` | Run Prettier |
| `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright end-to-end tests (first run needs `pnpm exec playwright install`) |
| `pnpm db:migrate` | Create and apply a development migration |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Prisma Studio |

**Definition of done:** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.

## Project layout

```
prisma/            schema, migrations, seed
messages/          UI strings (en.json is the source; fr.json must have the same keys)
src/app/[locale]/  public pages (en | fr)
src/components/    ui/ (shadcn), site/, and feature folders
src/lib/           business logic as pure functions (pricing, booking, tax, money, dates)
src/config/site.ts studio name, contact details, time zone
tests/             unit/ and e2e/
assets/            owner-supplied logo source files
docs/loop/         task list, progress log, open questions for the owner
```

## Contributing

Read **[AGENTS.md](AGENTS.md)** before writing code. It is the full spec: brand rules, page acceptance criteria, data model, pricing formula, Canadian compliance (PIPEDA, CASL, AODA) and coding conventions. Key rules:

- Store money as integer CAD cents. Prices, pricing rules and tax rates live in the database and are edited in the admin dashboard. Never hardcode them.
- Never invent facts about the studio or its clients. Sample data must be clearly fictional, have `isSample = true`, and appear only when `SHOW_SAMPLE_CONTENT=true`.
- French copy written by agents stays marked `TODO(owner-fr): review` until a fluent speaker approves it.
- Use Conventional Commits and keep PRs small and focused.

## License

[GPL-3.0](LICENSE)
