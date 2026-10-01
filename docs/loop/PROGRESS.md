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
