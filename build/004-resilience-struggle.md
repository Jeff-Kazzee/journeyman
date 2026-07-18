Pass 4 in the Journeyman build. Priority order: (1) fix the agent-run spawn root cause, (2) crash-proof the worker, (3) job-post collector UX, (4) progress feedback, (5) the struggle engine (SPEC §5.5), (6) `npm run stop`. Context from production forensics you need:

- The 7:52 AM gap-analysis run died in 37ms: `Error: spawn codex ENOENT`. Node's `spawn("codex")` on Windows cannot resolve the npm `codex.cmd` shim. Fix resolution properly (e.g. resolve `codex.cmd` explicitly / `shell: true` where safe / platform-aware lookup) inside `CodexService`, and add a boot-time self-check that logs `codex: resolved` or a clear fatal.
- The worker died with the learner parked mid-flow: agent-run failures currently escape. Make failure impossible to kill the process: per-run try/catch with friendly user message + preserved state + `/retry`, plus process-level `unhandledRejection`/`uncaughtException` guards that log and keep running.
- Real stored job posts right now: `[0]` = five roles pasted in ONE message, `[1]` = "that was all 5", `[2]` = "noooo" — the collector stored corrections as posts.

## 1. Spawn fix + agent smoke gate

- Fix `codex` resolution in `worker/src/codex.ts` (Windows + posix). Prefer stdout/last-message parsing that tolerates noisy stderr (this machine's global codex config emits benign MCP auth errors on stderr — they must not fail runs).
- Add `npm run agent:smoke`: one REAL tiny `runAgent` call ("Reply with exactly: OK") that persists an `AgentRun` row and exits 0 only on success. This closes the gap that simulation stubs hid.
- Do NOT run agent:smoke yourself (it consumes tokens; Jeff triggers it). All other gates you run.

## 2. Collector UX (job posts)

Replace the rigid slot machine with a forgiving collector:
- Prompt text sets expectations: "Paste job posts — one per message OR several in one message. Up to 5 total. `/done` when finished, `/undo` removes the last."
- A message containing multiple posts (detect via length/multiple role blocks) → confirm before storing: "I see what looks like N posts — store all N?" (yes/split-edit/no).
- Free-form corrections during collection ("that was all of them", "noooo", "wait") must NEVER be stored as posts: interpret intent — finish collecting, undo, or ask a one-line clarifying question.
- After each accepted post: one-line acknowledgment with running count and detected role title.
- `/done` anytime with ≥3 posts proceeds; <3 asks once then proceeds on confirm.

## 3. Flow recovery + progress feedback

- On `/start` with an existing profile: skip the interview; offer to resume where they left off (collect posts fresh → gap analysis → plan) or restart entirely.
- Before any long agent run: send a progress message ("Reading your posts — this takes 1–3 minutes. I'll come to you."). Agent runs must never block the cron loop or message handling (keep them async; no sync waits).
- Agent-run failure path: "I hit a snag on my side — your state is safe. Send /retry to run it again." `/retry` re-executes the last failed run kind.

## 4. Struggle engine (SPEC §5.5)

- `prompts/hint.md` real contract + `prompts/mentor.system.md` upgraded to the full ladder policy.
- Persist `Attempt` (text|link|commit) and `HintEvent` (level 1–5) per active task; ladder position shown in hint replies ("level 2/5").
- Policy enforced structurally in the conversation handler (not just the prompt): no `Attempt` for the active task → the ONLY response is a variant of "Show me what you've tried." Genuine attempt → level+1 hint that quotes the attempt. Fake/low-effort attempt → refused, stays at level 0.
- Mid-task messages route here once a task is ACTIVE (commands still work).

## 5. `npm run stop`

Script that stops all node processes whose command line references this repo (Windows-first; harmless no-op elsewhere). Keep it a plain reviewed one-liner.

## 6. Simulation gate (extend `scripts/simulate-onboarding.ts`)

All stub-runner: multi-post single message → confirm → stored as N; "that was all of them" mid-collection → finishes collection; cold help ask on ACTIVE task → refused; fake attempt → refused; real attempt → level-1 hint quoting the attempt; agent-run throw → friendly message + state preserved + `/retry` path runs. Plus existing onboarding assertions. `npm run simulate:onboarding` stays the single gate.

## Constraints + gates

- Additive migrations only. No new deps unless essential. Strict TS.
- Run: `prisma validate`, `worker:check`, root `tsc --noEmit`, `npm run build`, `npm run simulate:onboarding` — all green. Do NOT run `agent:smoke`, do NOT start/stop services.
- Report: root causes fixed, files changed, gates, exact steps for Jeff's resumed run.
