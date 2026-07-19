Implemented all seven findings. Manual standards/spec review found no remaining scoped issues.

### Files edited

- [worker/src/conversation.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:12)
- [worker/src/index.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/index.ts:80)
- [scripts/simulate-onboarding.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:153)

The required root TypeScript gate refreshed the existing `tsconfig.tsbuildinfo` compiler cache from 112239 to 112243 bytes. No source edit was made there.

### Finding mapping

1. Boot recovery is wrapped in `try/catch`; failures are logged and boot continues.
2. Admissions now require fewer than 40 trimmed characters and an exact content-free phrase. Technical vocabulary, HTTP statuses, URLs, and code shapes count as attempts.
3. Cold-ask escalation has its own consecutive streak. Template rotation uses independent cold/admission counters.
4. Briefs receive terminal punctuation before inline follow-up copy.
5. Empty sanitized fragments omit the quoted-fragment clause entirely.
6. `PLAN_RUNNING` now documents the stale Prisma-client workaround.
7. `withoutFailure` removes `pendingChange`; active revisions explicitly retain it while running. The simulator verifies confirmed plans remove stale data.

### Final classifier rules

- Bare admissions such as `I did not do it`, `I'm stuck`, and `can't do this` receive nudges.
- Any substantive continuation prevents admission classification.
- Explicit solution requests and exact placeholders such as `idk` remain cold asks.
- URLs, technical tokens, status codes, and pasted-code shapes route to the attempt/hint path.
- Ambiguous messages default to attempts and hints, not silent nudges.
- Admissions reset cold escalation. Real attempts and commands reset all nudge state.

### Gate outputs

`npm run worker:check` — exit 0:

```text
> journeyman@0.1.0 worker:check
> tsc --project worker/tsconfig.json --noEmit
```

`npx tsc --noEmit` — exit 0, no stdout or stderr.

`npm run simulate:onboarding` — exit 0:

```text
> journeyman@0.1.0 simulate:onboarding
> node --no-warnings --experimental-strip-types scripts/simulate-onboarding.ts

simulate:onboarding passed — collector, retry recovery, plan activation, and struggle ladder verified.
[conversation] gap analysis failed for cmrr5cwn9000009ngsf42hcgj Error: simulated Codex failure
    at ConversationService.stubRunner [as agentRunner] (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:50:80)
    at ConversationService.runGap (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:301:29)
    at ConversationService.launchGap (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:295:43)
    at ConversationService.finishPosts (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:292:216)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:117:20)
[conversation] plan failed for cmrr5cwn9000009ngsf42hcgj Error: simulated plan failure
    at ConversationService.stubRunner [as agentRunner] (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:51:184)
    at ConversationService.runPlan (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:316:31)
    at ConversationService.launchPlan (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:309:43)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:143:28)
```

Those two logged failures are intentional simulator fixtures. No Git operations, build, restart, live agent call, dependency change, or schema edit was performed.

🟢 All PR #3 review findings fixed and required gates pass