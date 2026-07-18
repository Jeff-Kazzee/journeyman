Implemented the runtime hardening and extended the simulator. All requested code gates pass.

## Files changed

- [conversation.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts)
  - Persists revision changes and counts across retries.
  - Adds distinct plan-running recovery.
  - Logs agent failures with user IDs.
  - Returns gaps when plan generation fails.
  - Handles plan-persistence failures locally.
- [index.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/index.ts)
  - Runs the silent interrupted-conversation sweep during live worker boot.
- [simulate-onboarding.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts)
  - Covers revision retry, both boot-recovery paths, and gap delivery.
  - Orders milestones by `idx`.
  - Scopes recovery assertions to fixture users.
- [schema.prisma](C:/Users/jeffk/hq/dev/journeyman/prisma/schema.prisma)
  - Adds `PLAN_RUNNING`.
- [migration.sql](C:/Users/jeffk/hq/dev/journeyman/prisma/migrations/20260718050000_plan_running_recovery/migration.sql)
  - Additive, idempotent enum migration.
- [package.json](C:/Users/jeffk/hq/dev/journeyman/package.json)
  - Adds `verify:plan`.
- [.gitignore](C:/Users/jeffk/hq/dev/journeyman/.gitignore)
  - Ignores `build/tmp/`.

## Review-finding mapping

1. Failed revision retry now preserves `pendingChange` and `planRevisionCount`, reuses both on `/retry`, and clears the change after success.
2. Gap success persists `gaps` under `PLAN_RUNNING`. Boot recovery maps gap and plan interruptions to their correct retry states without sending messages.
3. Gap-analysis, plan, and hint catches now log the error and `userId`.
4. Plan failures return the saved gap analysis followed by the retry instruction.
5. `persistPlan` catches transaction failures and directs the user to resend `confirm`.
6. Milestone assertions now use explicit ascending `idx` ordering.
7. Added `build/tmp/` and `verify:plan`.
8. `npm update postcss` completed with `up to date in 1s`, but did not change the lockfile. Top-level PostCSS is already 8.5.19; Next 15.5.20 exactly pins its nested copy to 8.4.31. Clearing every sub-8.5.10 copy therefore requires a Next upgrade or `package.json` override, violating the requested lockfile-only scope. I did not claim the alert was cleared.

## Gate outputs

`npm run worker:check`

```text
> journeyman@0.1.0 worker:check
> tsc --project worker/tsconfig.json --noEmit
```

`npx tsc --noEmit`

```text
```

Exit 0 with no stdout.

`npm run simulate:onboarding`

```text
> journeyman@0.1.0 simulate:onboarding
> node --no-warnings --experimental-strip-types scripts/simulate-onboarding.ts

simulate:onboarding passed — collector, retry recovery, plan activation, and struggle ladder verified.
[conversation] gap analysis failed for cmrr0h04u000009kcjy6tau7l Error: simulated Codex failure
    at ConversationService.stubRunner [as agentRunner] (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:48:80)
    at ConversationService.runGap (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:258:29)
    at ConversationService.launchGap (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:252:43)
    at ConversationService.finishPosts (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:249:216)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:111:20)
[conversation] plan failed for cmrr0h04u000009kcjy6tau7l Error: simulated plan failure
    at ConversationService.stubRunner [as agentRunner] (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:49:184)
    at ConversationService.runPlan (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:273:31)
    at ConversationService.launchPlan (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:266:43)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:137:28)
```

The logged failures are intentional simulator injections.

## Deliberately not done

- No git operations.
- No build.
- No worker restart.
- No live application agent calls.
- No structured-output Zod schema changes.
- Prisma client regeneration hit the running process’s locked query-engine DLL. I did not stop it; the additive enum was applied locally with PostgreSQL for the simulator.
- `verify:plan` was not run because it performs the prohibited live plan-agent gate.

🟡 Runtime fixes green; nested Next PostCSS 8.4.31 remains pinned