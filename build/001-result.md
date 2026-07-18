Built the Journeyman runnable skeleton. No commit or deployment was made.

Created:

```text
app/                 Next App Router routes, login APIs, dashboard, transcript/demo
components/          reusable header, empty-state, transcript timeline
lib/                 Prisma, session signing, auth, login-link, query seams
prisma/schema.prisma complete Postgres schema (+ LoginLink for one-time auth)
worker/              grammY bot, cron stubs, Prisma client, CodexService
prompts/             versioned agent-contract placeholders
README.md            setup and runtime guide
package.json         root workspace scripts
package-lock.json    installed dependency lockfile
```

Key files: [schema.prisma](C:/Users/jeffk/hq/dev/journeyman/prisma/schema.prisma), [CodexService](C:/Users/jeffk/hq/dev/journeyman/worker/src/codex.ts), [worker](C:/Users/jeffk/hq/dev/journeyman/worker/src/index.ts), [README](C:/Users/jeffk/hq/dev/journeyman/README.md).

Verified:

- `npm install` ✓
- `npx prisma validate` ✓
- `npm run worker -- --dry-run` ✓
- `npm run build` ✓ — includes strict root and worker TypeScript checks.
- No migration ran; no live DB was touched.

Notes:

- Added `LoginLink` to persist the browser → Telegram → signed-session handoff.
- `/demo` is wired to the `demo` tenant but remains empty until a later seeding pass.
- The default worker runner uses Node 24’s TypeScript stripping; `tsx` remains installed as `npm run worker:tsx`. This avoids this host’s `esbuild` child-process `EPERM`.
- The build uses Next’s compile mode because this environment blocks child processes and Next’s full static-generation worker cannot run here. Before deployment, run a full Next generation build on an unrestricted host.
- Jeff still needs `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, and a production `SESSION_SECRET`; Codex CLI must be logged in with ChatGPT. npm also reports two moderate audit advisories; no automatic audit upgrade was applied.

🟡 Skeleton is built and verified; real secrets, database migration, and full production generation remain.