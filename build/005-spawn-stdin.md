Pass 5 in the Journeyman build — one targeted production bug plus hygiene. Small pass; don't refactor beyond it.

## Root cause (confirmed from production rawLog)

Pass 4's resolver falls back to `codex.cmd` with `shell: true`, so cmd.exe parses the command line and dies on long prompts: `The syntax of the command is incorrect.` → `codex exec exited with code 1`. Two production gap-analysis runs died instantly at 15:14 on exactly this.

## The fix (in `worker/src/codex.ts`)

1. On this machine the shim chain resolves to `C:\Users\jeffk\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js` — a JS entry. **Spawn `process.execPath` (node) with `[codexJsPath, "exec", ...]` and `shell: false`.** Resolution order: `CODEX_EXECUTABLE` env override (may be codex.js, a shim, or a binary) → derive codex.js from the npm package layout (`%APPDATA%\npm\node_modules\@openai\codex\bin\codex.js` on win32; `which codex` → resolve symlink → codex.js on posix) → fall back to the pass-4 shim path only if no JS entry exists (and then never with a prompt argument on the command line).
2. **Deliver the prompt via stdin** (`codex exec -` reads stdin) in ALL cases — never as a command-line argument. This removes cmd.exe quoting, the CreateProcess length limit, and avoids giant inline command lines entirely (host security tooling flags those shapes).
3. Keep: stderr-noise-tolerant output parsing, read-only sandbox default, one malformed-output retry, full AgentRun logging (record resolution mode + prompt bytes).
4. Update `scripts/agent-smoke.ts` to assert the stdin path specifically (it must prove a multi-line, quote-heavy prompt round-trips).

## Retry data hygiene (`worker/src/conversation.ts`)

Gap-analysis `/retry` currently replays malformed stored posts ("that was all 5", "noooo"). Before running, filter posts that are <200 chars or match correction phrases; if <3 valid posts remain, do NOT run — transition back to collection, explain briefly, and ask for a fresh set. Clearing those rows is fine.

## Log clarity (`worker/src/index.ts`)

The boot line "cron scheduled… 07:00" has repeatedly read as "nothing happens for hours." Change to:
`[worker] daily cards 07:00, nudge 19:00 (<tz>). Task #1 arrives immediately when a plan is confirmed — cron is only for later days.`

## Gates

`npx prisma validate`, `npm run worker:check`, `npx tsc --noEmit`, `npm run worker -- --dry-run`, `npm run simulate:onboarding`, `npm run build` — all green. Do NOT run `agent:smoke` (director runs it after), do NOT start/stop services, no schema changes expected.

## Report

Exact resolution behavior now, files changed, gates, anything Jeff-facing.
