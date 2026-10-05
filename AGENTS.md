# AGENTS.md — Legal Metrology Compliance System (SIH)

## What this repo is
npm-workspaces monorepo. `backend/` = Fastify 5 + TypeScript REST API, OCR & AI extraction engine.
`frontend/` = Next.js 15 App Router, React 19, TypeScript. Infra = Supabase (Postgres, pgvector,
Auth, Storage) via Drizzle ORM. Full architecture notes live in `README.md`.

## Commands
| Action | Command |
| --- | --- |
| Install all | `npm run install:all` |
| Run both | `npm run dev` |
| Backend only | `npm run dev:backend` (port 8000, health: `/api/health`) |
| Frontend only | `npm run dev:frontend` (port 3000) |
| Build all | `npm run build` |
| Tests | `npm test` (backend only) |
| Local DB | `docker compose up -d` (Postgres + pgvector) |

Env templates: `backend/.env.example`, `frontend/.env.local.example`. Never commit real env values.

---

# MANDATORY PROTOCOL — 80/20 Task Summary

After **every** completed task, bug fix, or investigation — no exceptions — emit one summary block
in chat. This is a revision log: a future session (or a human six months from now) must be able to
reconstruct what changed and why without reading the diff.

Format = **Intent 20% / Result 80%**. A short line of *why*, then dense, specific substance.

```markdown
**80/20 — <short task title>**

Intent: <1 line — the goal or the question that was asked>

**Files changed: <N>** — `<path>` (<what changed in it>), `<path>` (<what changed>)
- `<path:line>` — <the actual code change, quoted or described precisely>
- `<path:line>` — <the actual code change>
- Decision: <what was chosen and why, over the obvious alternative>
- Not done: <anything deliberately skipped, and why>
- Verified: <exact command run + result, or "not run — <reason>">
```

## Rules for the summary
1. **Show the actual code, not a description of it.** Every summary MUST include a `Files changed:`
   line naming each file, and each changed hunk written out as real code (`path:line` + the before/
   after, or the exact new lines). "Refactored the store" is worthless six months later; the future
   reader needs the literal diff to know what the code now says.
2. **Always say *why* per change, not just what.** Attach the reason to the code line itself, so each
   hunk is independently reviewable without reading surrounding bullets.
3. **Reference real lines.** `backend/src/app.ts:104` — never "in the backend".
4. **Name the decision, not just the edit.** Say *why* that approach was chosen over the obvious
   alternative. This is the part that is worthless without context.
5. **Record dead ends.** If something was tried and rejected, one bullet on why. Prevents rework.
6. **State verification honestly.** If tests/lint/typecheck were not run, write that plainly. Never
   imply verification that did not happen.
7. **Separate your changes from pre-existing ones.** If the working tree already had uncommitted
   edits, state which files you touched versus which were already dirty — otherwise the reader
   cannot tell your work from inherited work in `git diff`.
8. **Size target: 20% preamble, 80% payload, 8 lines max.** The code lines count as payload. If it
   needs more, it belongs in `backup_history/` as a full doc, not in chat.

## When the work is large enough to warrant a file
If a task spans multiple systems (audit, restructure, migration, perf pass), also write a permanent
summary into `backup_history/<TOPIC>_SUMMARY.md`, matching the existing house style there:

- `# Backup History: NN — <Topic>`
- `## Executive Summary`
- Numbered sections per finding/change, each with **Problem → Change → Impact**
- Closing `## Learning Takeaways` — 2 to 4 transferable rules

Then reference that file in the chat block instead of inlining the long version.

## How to isolate your own edits from pre-existing working-tree changes
This repo routinely has uncommitted work from earlier sessions, so `git diff` shows far more than
you touched. Before writing a summary, confirm the real blast radius:

```powershell
git status --porcelain -- frontend | ForEach-Object {
  $p = $_.Substring(3).Trim()
  if (Test-Path -LiteralPath $p) {
    "{0,-52} {1}" -f $p, (Get-Item -LiteralPath $p).LastWriteTime.ToString('MM-dd HH:mm:ss')
  }
} | Sort-Object
```

Files with today's date are yours; older timestamps are inherited. Use `-LiteralPath` for paths
containing `[id]` or other glob characters. Untracked (`??`) files have no diff — quote the current
content instead.

## Never run `npm run build` while `npm run dev` is running
Both share `frontend/.next`. A production build replaces the dev asset manifest (adds `BUILD_ID`,
renames the stylesheet to a hashed name), so the live dev server keeps serving HTML that points at a
now-missing CSS file → **404 → browser-default rendering** (Times New Roman, purple links, no
Tailwind). It looks exactly like a broken design system but is purely an asset-delivery fault.

Verify frontend changes with `npx tsc --noEmit -p tsconfig.json`, or stop the dev server first. If
the page renders unstyled, fetch the page, extract the `<link href>` stylesheet, and request it
directly: a 200 page with a 404 stylesheet isolates the fault to asset delivery, not CSS authoring.