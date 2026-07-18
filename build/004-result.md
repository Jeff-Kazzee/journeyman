Pass 4 is complete.

Root causes fixed:

- Windows now resolves the actual `codex.cmd` shim before spawning; verified as `C:\Users\jeffk\AppData\Roaming\npm\codex.cmd`. Valid structured stdout succeeds despite benign stderr noise.
- Agent failures are contained: state is preserved, users get `/retry`, long runs happen asynchronously, and process-level exception guards keep the worker alive.
- The collector now handles batched posts, corrections, `/undo`, and undersized sets safely.
- Active tasks enforce the attempt-first five-level hint ladder with persisted `Attempt` and `HintEvent` records.

Files changed:

```text
modified
├── README.md
├── package.json
├── prompts/hint.md
├── prompts/mentor.system.md
├── scripts/simulate-onboarding.ts
└── worker/src/
    ├── codex.ts
    ├── conversation.ts
    └── index.ts

created
├── prompts/agent-smoke.md
└── scripts/
    ├── agent-smoke.ts
    └── stop.ps1
```

Verified:

- `npx prisma validate`
- `npm run worker:check`
- `npx tsc --noEmit`
- `npm run worker -- --dry-run`
- `npm run simulate:onboarding`
- `npm run build`
- `git diff --check`

Intentionally not run: `npm run agent:smoke` (uses real Codex tokens) or `npm run stop` (stops local services).

Jeff’s resumed run:

1. Reload processes when ready: `npm run stop`, then restart web and worker.
2. Optionally run `npm run agent:smoke` once to verify a real Codex call and `AgentRun` persistence.
3. In Telegram, send `/start`, then reply `resume`.
4. The bot clears the malformed old job-post collection and asks for a fresh set.
5. Paste 3–5 posts; for a batch, reply `yes` to store it. Use `/undo` or `/done`.
6. Wait for analysis; if Codex fails, send `/retry`.
7. Confirm the proposed plan; the first task arrives immediately.
8. During the task, paste real work/errors/links for progressive hints.

No schema migration or dependency was needed: Pass 4 reuses the existing persisted conversation state, `Attempt`, and `HintEvent` models. I left the pre-existing untracked `build/` artifacts untouched.

🟢 Ready — all non-token/non-service gates pass; reload worker and resume in Telegram.

