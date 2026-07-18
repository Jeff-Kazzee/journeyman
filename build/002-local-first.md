Pass 2 in the Journeyman build. Re-read `SPEC.md` §6, §9, §13 — they changed. We are now **local-first**: no Neon, no cloud DB, and **no `.env` file anywhere**. Apply these changes, keep every gate green.

## Decisions (already made — implement, don't relitigate)

1. **Database = local PostgreSQL 17** (Windows service, trust-auth on loopback).
   `DATABASE_URL` is credential-free (`postgresql://postgres@127.0.0.1:5432/journeyman`)
   and is already set as a user environment variable on this machine.
2. **No `.env`.** All config comes from process env (user env vars on Windows;
   Vercel dashboard in prod). The only secrets: `TELEGRAM_BOT_TOKEN`,
   `SESSION_SECRET` — both already set as user env vars on this machine.
3. **Deployed demo = static snapshot.** `/demo` renders from a committed
   `data/demo-snapshot.json`, never from a database.
4. **Bellamente** (`bella serve` on `127.0.0.1:8080`) is the mentor's optional
   long-term memory, per SPEC §6. HTTP only, graceful no-op when down.

## Changes

1. **Remove `.env` machinery:** delete `.env.example` and the local `.env`
   (leave `.env` in `.gitignore`); remove any dotenv loading code/dependency.
   Add `lib/config.ts` (web) and `worker/src/config.ts`: read `process.env`,
   fall back to the credential-free `DATABASE_URL` default above, and throw
   clear actionable errors (name the missing var + the `setx` fix) only when a
   secret-requiring feature is actually used. App must build with no env vars set.
2. **Bellamente adapter** `worker/src/memory.ts`: `recall(query)` →
   `POST http://127.0.0.1:8080/search` with `{"q": query}`; `remember(facts: string[])`
   → `POST /memories` with `{"memories":[{"content":...}]}`. 500ms timeout, catch
   all errors, log once, return empty/no-op. Never write secrets. Export a typed
   singleton. Include a `--check` flag path so `npm run memory:check` prints
   "bellamente: up" or "bellamente: down (optional, continuing without it)".
3. **Demo snapshot:** `scripts/export-demo-snapshot.ts` (script: `npm run snapshot`)
   reads the `demo` slug user's plan/milestones/tasks/reviews/defenses/transcript
   via Prisma and writes typed `data/demo-snapshot.json` (committed). Rewire
   `/demo` to render from that JSON. `/t/[slug]`: try DB; on connection failure,
   fall back to the snapshot when `slug === "demo"`. Handle missing snapshot file
   with a friendly empty state.
4. **README:** rewrite config/setup sections — no-`.env` policy and why; the three
   user env vars with exact `setx` commands; local PostgreSQL 17 setup (start
   service, trust-auth edit in `pg_hba.conf`, `CREATE DATABASE journeyman`);
   optional Bellamente (`bella serve`); judge local-run quickstart (~10 min);
   update the judge-access description to the static-snapshot design.
5. Keep `prisma/schema.prisma` unchanged (still Postgres). Do NOT run migrations —
   the database isn't up yet; Jeff does a one-time admin step first.

## Verification

- `npm run build` green (strict TS root + worker)
- `npm run worker -- --dry-run` green
- `npm run memory:check` prints the down-branch message cleanly (bella isn't running)
- `npx prisma validate` green
- No `.env`, no `.env.example`, no dotenv imports anywhere (`rg` them to prove it)
- No secrets written to any file — `rg` for the bot-token value (redacted here) and
  `rg "SESSION_SECRET"` must only ever show zero hits in the repo

## Report

Files changed, commands verified, deviations, blockers.
