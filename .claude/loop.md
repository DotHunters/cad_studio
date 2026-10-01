# Loop instructions — Cad Studio website

Run on every `/loop` tick. Goal: build the MVP in `AGENTS.md` (milestones 1–8) one small, verified task at a time. Phase 2 (milestone 9) is out of scope for the loop.

## Source of truth

| File | Role |
|---|---|
| `AGENTS.md` | Spec: stack, pages, data model, business logic, compliance, conventions. Always wins over these loop files. |
| `docs/loop/TASKS.md` | Ordered backlog. Pick work from here only. |
| `docs/loop/PROGRESS.md` | Append-only log of each tick. |
| `docs/loop/OPEN_QUESTIONS.md` | Owner decisions and blockers. |

## Each tick

1. **Orient.** Read the last 3 entries of `docs/loop/PROGRESS.md`, `git status`, and the current branch. Handle these first, in order:
   - The previous tick left work half-done (uncommitted changes, failing checks): finish it.
   - An open PR for the current milestone has review comments or failing CI: address them, push, and resolve the threads.
   - `OPEN_QUESTIONS.md` has new owner answers: apply them (replace the placeholders, unblock tasks).
2. **Pick.** Take the first unchecked task in `docs/loop/TASKS.md` whose dependencies are done and that is not marked `BLOCKED`. Do one task per tick. If a task is too big for one tick, split it into subtasks in `TASKS.md` and do the first one.
3. **Read the spec.** Re-read the `AGENTS.md` sections the task cites before writing code.
4. **Build.** Follow the `AGENTS.md` §12 conventions. Write tests with the feature; use TDD for `src/lib/pricing`, `src/lib/booking`, and `src/lib/tax.ts`.
5. **Verify.** Run the definition of done:
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   ```
   Until task 1.1 creates these scripts, run whatever subset exists and note the gap in the log.
   If `next build` fails with `Invariant: no direct app page entry found for …`, the `.next` cache is stale or half-deleted (Windows file locks): retry `rm -rf .next` until the folder is gone, then rebuild. Run `build` and `test:e2e` sequentially, never in parallel (both write `.next`).
   Don't tick a task until the checks pass. If you can't get them green this tick, leave the task unchecked and log why.
6. **Record.**
   - Tick the task in `TASKS.md`.
   - Append an entry to `PROGRESS.md` using the template in that file.
   - When the last task of a milestone is done, tick that milestone in the `AGENTS.md` §14 progress checklist.
7. **Git.**
   - Work on `feat/m<N>-<milestone-slug>` (e.g. `feat/m1-foundation`), branched from up-to-date `main`. Never commit to `main` directly.
   - Make one Conventional Commit per task (`feat:`, `fix:`, `test:`, `chore:` …).
   - Push the branch after each commit: `git push -u origin <branch>`. Before pushing, `git fetch`; if the remote branch moved, rebase onto it (don't merge).
   - Open **one PR per milestone** against `main` once the branch has its first commit. Title it `M<N>: <Milestone name>`. In the body, list the milestone's tasks as a checklist and keep it updated.
     - If `gh` is available: `gh pr create` / `gh pr edit`. On this machine, if `gh` is not on PATH, use `"/c/Program Files/GitHub CLI/gh.exe"` (authenticated).
     - If `gh` isn't installed: push anyway, then log the compare URL `https://github.com/DotHunters/cad_studio/compare/main...<branch>?expand=1` in `PROGRESS.md` so the user can open the PR.
   - **Never merge PRs, force-push, or delete branches.** The user reviews and merges. Start the next milestone's branch from `main` after its PR is merged. If it isn't merged yet, branch from the previous milestone branch and say so in the PR body.

## Hard rules (from AGENTS.md §9, §11, §13)

- Never invent facts about Cad Studio, I. Rukshan, clients, awards, or stats. Use `TODO(owner): …` and add the question to `OPEN_QUESTIONS.md`.
- Never fabricate reviews or testimonials. Sample seed reviews are marked `[SAMPLE]` and stay `PENDING`.
- Never commit client photos, `.env*`, or secrets.
- Never hardcode prices or tax rates in components; they come from the DB.
- Store money as integer CAD cents.
- Don't change the tech stack (§2) without asking the user.

## When blocked

If a task needs an owner decision (prices, address, logo, domain, client names, …):
1. Mark it `BLOCKED(Q#)` in `TASKS.md`.
2. Add or reference the question in `OPEN_QUESTIONS.md`.
3. If a clearly marked placeholder lets you continue safely, build with it and leave the task unblocked. Otherwise skip to the next unblocked task.

## Pacing and stopping

- If a task was completed this tick, schedule the next tick soon (≈ 60–300 s).
- If you're waiting on PR review or CI, use the long heartbeat (≈ 1200–1800 s).
- If every remaining task is `BLOCKED`, or milestone 8 is done, say so in one line and stop the loop.
- If three ticks in a row make no progress, stop and summarize the blocker for the user.
