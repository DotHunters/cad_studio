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
- Note: `gh` CLI is not installed; PRs are opened via compare links until it is.
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
