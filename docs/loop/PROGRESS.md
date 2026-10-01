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
