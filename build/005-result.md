Pass 5 fixes the production spawn failure without changing schema or dependencies.

Resolution now:

- Windows resolves `%APPDATA%\npm\node_modules\@openai\codex\bin\codex.js` and runs `process.execPath <codex.js> exec … -` with `shell: false`.
- The rendered prompt is always written to stdin; it is never an argv argument.
- Explicit `CODEX_EXECUTABLE` still supports JS entries, binaries, or shims. Shims are last-resort and still receive prompts only via stdin.
- `AgentRun.rawLog` now records resolution mode, target, `promptTransport: stdin`, and prompt byte count.

Verified locally, without invoking Codex:

```text
codex: resolved node-js
C:\Users\jeffk\AppData\Roaming\npm\node_modules\@openai\codex\bin\codex.js
via C:\nvm4w\nodejs\node.exe
```

Changed:

```text
worker/src/codex.ts             stdin transport and JS-entry resolution
worker/src/conversation.ts      poisoned gap-retry filtering
worker/src/index.ts             clear daily-card boot message
scripts/agent-smoke.ts          quote-heavy multiline stdin assertion
prompts/agent-smoke.md          stdin smoke contract v2
scripts/simulate-onboarding.ts  retry-hygiene regression coverage
```

Retry behavior: `/retry` removes rows under 200 characters or matching correction phrases such as “that was all 5” / “noooo”. If fewer than three valid posts remain, it does not call Codex; it returns to collection and asks for a fresh set.

Gates passed:

- `npx prisma validate`
- `npm run worker:check`
- `npx tsc --noEmit`
- `npm run worker -- --dry-run`
- `npm run simulate:onboarding`
- `npm run build`

Not run: `npm run agent:smoke`, `npm run stop`, or any service.

Jeff-facing next steps:

1. Reload the worker when ready: `npm run stop`, then `npm run worker`.
2. Run `npm run agent:smoke` once. It now proves a multiline, quote-heavy prompt reaches Codex through stdin and persists its `AgentRun`.
3. Send `/retry` in Telegram. The two correction rows will be cleared; if fewer than three valid rows remain, paste a clean set and send `/done`.

The boot message now explicitly says task #1 arrives on plan confirmation; 07:00 is only for later tasks. No blockers.

🟢 Pass 5 is ready; reload the worker, then let the smoke gate prove the real Codex path.

