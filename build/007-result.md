Implemented the two real fixes.

- [agent-smoke.ts](/C:/Users/jeffk/hq/dev/journeyman/scripts/agent-smoke.ts:11) now uses `echoedProbe: z.string()`; its existing exact equality assertion remains the enforcement point.
- [codex.ts](/C:/Users/jeffk/hq/dev/journeyman/worker/src/codex.ts:201) now throws one `AgentOutputError` containing every attempted parse failure in order: `finalMessage: …; stdout: …; stderr: …`.
- Added the schema constraint comment beside schema serialization.

Gates passed:

- `npx prisma validate`
- `npm run worker:check`
- `npx tsc --noEmit`
- `npm run worker -- --dry-run`
- `npm run simulate:onboarding`
- `npm run build`

Deviations: Prisma required an ephemeral `DATABASE_URL` set to the README’s local default. The patch utility was unavailable in this Windows sandbox, so I used guarded exact replacements. `agent:smoke` was not run; no services were started or stopped. No commit was created because the worktree already contains unrelated in-progress changes.

🟢 Pass 7 fixes applied and all requested gates passed