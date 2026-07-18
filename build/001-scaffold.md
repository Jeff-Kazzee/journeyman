You are scaffolding a new project called **Journeyman**. First read `SPEC.md` and `BRIEF.md` in this repository root — they are the source of truth. This prompt defines the first build pass: the runnable skeleton. Later passes in this same thread will add features, so leave clean seams.

## Scope of THIS pass (skeleton only)

Build a working monorepo skeleton exactly per SPEC §6 (architecture), §7 (data model), §8 (routes):

1. **Next.js 15 app** (App Router, TypeScript strict, Tailwind CSS) at repo root. Do NOT use interactive scaffolding commands (`create-next-app`, `shadcn init`) — write config and source files directly. Skip shadcn for now; hand-roll minimal Tailwind components.
2. **Routes (stub but wired to DB where specified):**
   - `/` landing: product pitch from BRIEF.md (name, tagline "The AI that won't do your homework.", 3-step loop summary). Static is fine.
   - `/login` Telegram-link code flow: generates a one-time code, stores it, shows instructions to send `/link <code>` to the bot. Session cookie on successful link (simple signed cookie; no auth library).
   - `/app` dashboard shell: reads current user's Plan/Milestone/Task state from DB and renders it (empty-state friendly).
   - `/t/[slug]` public transcript page: renders `TranscriptEntry` rows for the user with that slug, no auth. This is the north-star page — make it genuinely pleasant to read.
   - `/demo` read-only demo tenant: same as `/t/[slug]` but hardcoded to a `demo` slug, clearly labeled read-only.
3. **Prisma + Postgres:** full schema from SPEC §7 (all models: User, LearnerProfile, JobPost, Plan, Milestone, Task, Attempt, HintEvent, Artifact, Review, Defense, TranscriptEntry, OutboundMessage, AgentRun). Use `prisma migrate dev`-compatible schema; do NOT run migrations against a live DB (no DATABASE_URL yet) — just generate the client and ensure `prisma validate` passes.
4. **Worker (`worker/` directory, Node + tsx):**
   - grammY Telegram bot with long-polling: `/start`, `/link <code>` (completes web login link), `/help`, and an echo fallback that says the mentor brain comes online soon.
   - `node-cron` stub jobs for 07:00 task delivery and 19:00 stall nudge (log-only for now).
   - `CodexService` (`worker/src/codex.ts`): wraps spawning `codex exec` as a child process with `--output-schema <file>` for structured JSON output, `--sandbox read-only` by default, one retry on malformed JSON, Zod validation, and full logging to the `AgentRun` table. Export a typed `runAgent(kind, promptFile, context, schema)` function. This is the seam every feature pass will use — make it solid.
5. **Housekeeping:**
   - `.env.example` with `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `APP_TZ` — plus comments saying values come from Jeff.
   - Root `package.json` workspaces for the worker; scripts: `dev`, `build`, `worker`, `prisma:*`.
   - `.gitignore` (node_modules, .env, .next, dist).
   - `README.md` quickstart section: prerequisites (Node 24, Codex CLI logged in via ChatGPT), setup steps, how to run web + worker, and a placeholder section "How Codex built this" to be filled at submission.
   - Do NOT run `git commit`. Do NOT deploy. Do NOT install shadcn.

## Verification before you finish

- `npm install` completes (you have network access).
- `npx prisma validate` passes.
- `npm run build` passes with zero TypeScript errors.
- `npm run worker -- --dry-run` (add a `--dry-run` flag that boots the worker, logs that cron + bot would start, and exits 0 without needing env vars).

## Report

End with: files created (tree), commands verified, any deviations from SPEC and why, and blockers that need Jeff (env secrets etc.).
