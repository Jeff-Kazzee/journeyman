Pass 3 in the Journeyman build: the onboarding → gap-analysis → plan → first-task slice (SPEC §5.1–§5.4). Re-read SPEC and the existing seams you built (`worker/src/codex.ts` `runAgent`, `worker/src/memory.ts`, `lib/config.ts`, prompt placeholders in `prompts/`). The database is LIVE now (local PG17, trust auth, migrated). Jeff is waiting to use this tonight — the moment a plan is confirmed, the first task must be delivered IMMEDIATELY in chat; the 07:00 cron is only for subsequent days.

## Build

1. **Conversation state machine** (DB-persisted, additive Prisma migration): stages like `idle → onboarding:goal → onboarding:role → onboarding:background → onboarding:constraints → jobposts:collecting (expect 3–5, /done to finish) → gapanalysis:running → plan:proposed → plan:active`. Any message outside a stage falls back to the struggle-session stub or help. `/cancel` aborts to idle. If `DATABASE_URL` is absent in your shell, set it in-session to `postgresql://postgres@127.0.0.1:5432/journeyman` (credential-free by design) before running `prisma migrate dev`.
2. **Onboarding interview** in Telegram: goal statement, target role, background, constraints (hours/week + schedule limits), self-assessed skills. Confirm summary → persist `LearnerProfile`. Write durable profile facts via the Bellamente adapter (no-op-safe).
3. **Gap analysis** (`prompts/gap-analysis.md` — replace placeholder with the real contract per SPEC §11): input = profile + 3–5 pasted job posts; output JSON = ranked gaps with evidence quotes (Zod schema). Run through `runAgent`. Send results in chat chunked under Telegram's 4096-char limit.
4. **Plan generation** (`prompts/plan.md`): profile + gaps → 2–4 milestones, each with deliverable spec + review rubric + 2–6 tasks. Present as a readable proposal; user replies `confirm` or asks for one change (single revision loop, then persist). Persist `Plan`/`Milestone`/`Task` (statuses: first task ACTIVE, rest SCHEDULED). Deliver the first task card immediately (title, brief, deliverable spec, why-it-matters). Store all agent outputs in `AgentRun`.
5. **Daily mechanics:** 07:00 cron delivers the next SCHEDULED task only when no task is ACTIVE; 19:00 nudge only if the ACTIVE task had no activity today and user isn't paused. `/task` `/plan` `/progress` `/pause` `/resume` `/transcript` (returns the `/t/<slug>` URL) `/help` — all per SPEC §5.4. Keep `/link` working untouched.
6. **`prompts/mentor.system.md` v1:** the persona — direct, warm, coach; the show-your-work ladder summarized (full ladder arrives next pass); accessible/async-first stance; never answers cold. Include it in every conversational `runAgent` call.
7. **Simulation gate:** `npm run simulate:onboarding` — a script that drives the state machine end-to-end with a STUB agent runner (canned JSON outputs; the real `CodexService` remains the default) proving: interview → profile persisted, job posts → gaps rendered, plan confirm → rows persisted + first task activated + task card rendered, `/progress` output. No Telegram, no network.

## Constraints

- Chunk every outbound message >4000 chars. Handle agent-run failure with a friendly retry path, never a crash.
- No new npm dependencies unless truly essential. TypeScript strict everywhere.
- Do NOT start/stop the web dev server or the worker (running separately). DO run `prisma migrate dev` for the new model(s).
- Verify: `prisma validate`, `worker:check`, root `tsc --noEmit`, `npm run build`, `npm run simulate:onboarding` — all green.

## Report

Schema changes, files changed, gates verified, how Jeff's first real run will go step by step, any deviations.
