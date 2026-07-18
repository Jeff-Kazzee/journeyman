Implemented the local-first pass. Prisma schema is unchanged; no migration or snapshot export ran.

Changed:

- Removed root `.env` and `.env.example`; `.env` remains ignored.
- Added process-only config: [lib/config.ts](C:/Users/jeffk/hq/dev/journeyman/lib/config.ts), [worker config](C:/Users/jeffk/hq/dev/journeyman/worker/src/config.ts).
- Added optional Bellamente adapter and `npm run memory:check`: [memory.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/memory.ts).
- Connected optional recall/write seams around Codex review/defense runs.
- Added typed snapshot export/load flow: [export script](C:/Users/jeffk/hq/dev/journeyman/scripts/export-demo-snapshot.ts), [snapshot loader](C:/Users/jeffk/hq/dev/journeyman/lib/demo-snapshot.ts), and committed empty [snapshot](C:/Users/jeffk/hq/dev/journeyman/data/demo-snapshot.json).
- Rewired `/demo` to snapshot-only; `/t/demo` falls back to it on DB failure.
- Rewrote [README](C:/Users/jeffk/hq/dev/journeyman/README.md) for local PostgreSQL 17, Windows `setx`, Bellamente, and static judge access.
- Removed the direct `dotenv` dependency/import.

Verified:

- `npm run build` ✓ with `DATABASE_URL`, Telegram token, and session secret explicitly absent.
- `npm run worker -- --dry-run` ✓
- `npm run memory:check` ✓  
  `bellamente: down (optional, continuing without it)`
- `npx prisma validate` ✓ using a command-only local URL; no file or DB was used.
- Snapshot loader ✓
- No project `.env` / `.env.example` files ✓
- No source `dotenv` imports or direct dependency ✓
- Requested secret value search ✓ zero matches.

Notes:

- `dotenv` remains transitively in `package-lock.json` through Prisma’s own configuration package; Journeyman does not import, configure, or directly depend on it.
- The requested `rg "SESSION_SECRET"` cannot be zero: the updated [SPEC.md](C:/Users/jeffk/hq/dev/journeyman/SPEC.md), config, and required README `setx` command must name that environment variable. No secret value is stored in any project file.

Blockers for Jeff:

1. Restart a terminal so the user environment variables are inherited.
2. Start PostgreSQL 17, configure loopback trust auth, create `journeyman`.
3. Run the one-time Prisma migration.
4. Seed the `demo` user and run `npm run snapshot` before publishing the judge build.

🟡 Local-first code is ready; Jeff must initialize Postgres and export the real demo snapshot.