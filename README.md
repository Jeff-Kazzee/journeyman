# Journeyman

> **The AI that won’t do your homework.**

Journeyman is an apprenticeship agent for adults changing careers. It handles planning, daily structure, review, and accountability; the learner supplies the practice. Its public transcript is evidence a stranger can inspect, not a portfolio claim. The mentor is Hoolio, an owl who will help you when you show your work and politely refuse when you don't.

**Live demo, transcript, and white paper:** https://the-little-ai-company.github.io/journeyman/

## Local-first configuration

Journeyman has **no `.env` file**. Configuration comes only from process environment variables: user variables on Windows for local development. The public demo site is a static export and needs no configuration at all. This prevents credentials from being copied into a repository or an accidental demo bundle.

The database URL is intentionally credential-free. If it is not set, the application defaults to:

```text
postgresql://postgres@127.0.0.1:5432/journeyman
```

Set the three user variables once in PowerShell, then open a new terminal:

```powershell
setx DATABASE_URL "postgresql://postgres@127.0.0.1:5432/journeyman"
setx TELEGRAM_BOT_TOKEN "paste-the-BotFather-token-here"
setx SESSION_SECRET "generate-a-long-random-signing-value"
```

`TELEGRAM_BOT_TOKEN` is required only to start live Telegram polling. `SESSION_SECRET` is required only when completing a browser login. Builds, static demo browsing, and worker dry runs need neither. `APP_TZ` is optional and defaults to `America/Denver`.

## Quickstart (local PostgreSQL 17)

### Prerequisites

- Node.js 24
- PostgreSQL 17 installed as a Windows service
- Codex CLI, logged in through ChatGPT (`codex login`)
- A Telegram bot token from BotFather for live bot use
- Optional: Bellamente CLI for mentor long-term memory

### One-time database owner setup

Start the installed PostgreSQL 17 service (check its actual service name first):

```powershell
Get-Service *postgres*
Start-Service postgresql-x64-17
```

In PostgreSQL 17’s `pg_hba.conf`, allow trust authentication only on local loopback:

```text
host    all    all    127.0.0.1/32    trust
host    all    all    ::1/128         trust
```

Restart the PostgreSQL service, then create the database:

```powershell
psql -U postgres -h 127.0.0.1 -d postgres -c "CREATE DATABASE journeyman;"
```

Install dependencies, generate Prisma, and—only after that admin setup—apply the initial migration:

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate
```

This repository intentionally does not run migrations automatically.

### Run web and worker

```powershell
npm run dev
npm run worker
```

The worker uses Telegram long-polling. After linking from the web page, send `/start` in Telegram to complete intake, paste 3–5 job posts, and confirm the plan. The first task arrives immediately on confirmation; 07:00 delivery is only for later scheduled tasks. A 19:00 nudge is sent only when an active task has no attempt that day and the learner is not paused. Both schedules use `APP_TZ`. Its env-free smoke test is:

```powershell
npm run worker -- --dry-run
```

### Codex smoke and safe worker restart

A live worker boot logs `codex: resolved <path>` before it starts Telegram polling. To verify a real, structured `codex exec` round-trip and its persisted `AgentRun`, run this intentionally token-consuming check once:

```powershell
npm run agent:smoke
```

To reload the worker after source changes, `npm run stop` stops only Node processes whose command line references this repository; it is a no-op off Windows. Then start the worker again with `npm run worker`.

If a worker restart finds an existing profile, `/start` offers `resume` (fresh job posts) or `restart` (redo intake). A failed agent step preserves state and can be rerun with `/retry`.

### Optional Bellamente memory

Bellamente is optional mentor memory, not the source of truth. Start it separately:

```powershell
bella serve
npm run memory:check
```

If it is down, Journeyman continues normally. The worker gives each Bellamente request a 500 ms budget and never sends secrets.

## Judge access

- **Zero setup:** the live site at https://the-little-ai-company.github.io/journeyman/ serves the landing page, the `/demo` dashboard, the `/t/demo` transcript, and the white paper from the committed `data/demo-snapshot.json`; it needs no database, process variables, worker, or agent call. It deploys by GitHub Actions from this repository's mirror in The Little AI Company organization.
- **Local live-run (~10 min):** install Node/PostgreSQL, set the three user variables, complete the one-time database owner setup above, then run web and worker with the judge’s own Codex login.

Before publishing a judge build, export Jeff’s real local `demo` user into the committed snapshot:

```powershell
npm run snapshot
```

The exporter includes the demo user’s plan, milestones, tasks, reviews, defenses, and transcript entries. `/t/demo` also falls back to that snapshot when local Postgres is offline.

## Architecture

- `app/` — Next.js 15.5.21 App Router UI. It reads local PostgreSQL through Prisma and never invokes an agent while rendering.
- `data/demo-snapshot.json` — committed, database-free judge artifact.
- `prisma/schema.prisma` — shared PostgreSQL source of truth.
- `worker/` — grammY long-poll bot, cron scheduler, optional Bellamente adapter, and the sole Codex CLI execution seam.
- `worker/src/codex.ts` — `runAgent(kind, promptFile, context, schema)` spawns `codex exec` with a JSON output schema, a read-only sandbox by default, one malformed-output retry, Zod validation, and persisted `AgentRun` logs.
- `prompts/` — versioned prompt-contract boundary for later feature passes.
- `site/` — the public demo site (Next.js 15.5.21 static export), built by `npm run site:build` and deployed to GitHub Pages.

## How Codex built this

Every line of product code in this repository was written by OpenAI Codex, directed through bounded passes on one primary build thread that was resumed throughout with `codex exec resume`. A pass is: a written brief stating scope, constraints, and pass/fail gates; an isolated execution with workspace-write sandboxing; a written result report; and independent verification of the gates before the pass counts. Twelve passes shipped the product. Every brief and every result report is committed in [`build/`](build/), including the passes where things went sideways (schema truncation, structured-output rejections, an error-masking wrapper) and how they were diagnosed.

Claude acted as tech lead: writing pass briefs, reviewing diffs, driving scripted end-to-end runs against the real system, and running multi-lens adversarial reviews on every pull request before merge (see PRs #1, #3, #4, #6). The public site's visual design was hand-finished; the machinery beneath it was not.

### Where GPT-5.6 runs in the product

All mentor reasoning is GPT-5.6 via the Codex CLI, authenticated with the user's own login:

- Gap analysis, plan generation, the five-level hint ladder, and defense evaluation each run through `worker/src/codex.ts` — the single execution seam, which spawns `codex exec` with a JSON output schema, a read-only default sandbox, Zod validation, one malformed-output retry, and a persisted `AgentRun` forensic log per invocation.
- The refusal gate is deliberately *not* a model call: it is an auditable classifier in ordinary code, so refusals are instant, free, and immune to prompt injection. Everything past the gate is GPT-5.6.
- Prompt contracts live in [`prompts/`](prompts/), one file per agent task.

### Collaboration evidence

- Pass briefs and results: [`build/`](build/)
- Adversarially reviewed merges: [PR #1](https://github.com/Jeff-Kazzee/journeyman/pull/1), [#3](https://github.com/Jeff-Kazzee/journeyman/pull/3), [#4](https://github.com/Jeff-Kazzee/journeyman/pull/4), [#6](https://github.com/Jeff-Kazzee/journeyman/pull/6)
- Codex `/feedback` Session ID: _added at submission_

## Third-party software

This project uses Next.js 15.5.21 (Maintenance LTS), React, Prisma, Tailwind CSS, grammY, node-cron, Zod, Bellamente (optional local service), and the Codex CLI. Their respective licenses apply.
