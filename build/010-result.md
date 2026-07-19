Implemented Pass 10. Only two source files changed.

## Files changed

- [conversation.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts)
  - Splits cold asks from admission/struggle statements.
  - Adds five deterministic refusal templates and three nudge variants.
  - Sanitizes quoted fragments to 60 characters.
  - Persists `consecutiveNonAttempts`.
  - Resets the counter on genuine attempts and every command.
  - Keeps non-attempt handling deterministic and agent-free.
- [simulate-onboarding.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts)
  - Verifies refusal rotation, escalation, task context, sanitizer behavior, all nudge variants, zero agent calls, counter progression, and resets.

No output schemas, other stages, or genuine hint behavior changed.

## Refusal templates

`${task.title}` and `${fragment}` are runtime substitutions.

```text
I won’t do “${task.title}” for you. You said: “${fragment}”. Show me what you’ve tried—code, text, an error, a link, or a commit—and you earn the next hint.
```

```text
The boundary on “${task.title}” is firm: I don’t provide the finished answer. Show me what you’ve tried, even if it is rough or broken, and you earn the next hint.
```

```text
For “${task.title},” asking for the solution does not unlock it. Show me what you’ve tried; one concrete attempt earns the next hint.
```

```text
I can coach you through “${task.title},” but I can’t take the rep for you. Your message was: “${fragment}”. Show me what you’ve tried and you earn the next hint.
```

```text
No finished solution from me for “${task.title}.” Show me what you’ve tried—any inspectable attempt is enough to earn the next hint.
```

Third-ask escalation:

```text
Third ask with nothing shown. The rule hasn’t changed: show an attempt, earn a hint. Use /task to reopen the deliverable spec.
```

Later escalation:

```text
Another ask with nothing shown. The rule hasn’t changed: show an attempt, earn a hint. Use /task to reopen the deliverable spec.
```

## Admission nudge variants

`${task.title}` and `${task.brief}` are runtime substitutions.

```text
Thanks for saying it plainly. For “${task.title},” shrink the task to one first move: ${task.brief} Put down the roughest beginning you can. Paste anything—even broken code or a half-written paragraph—and you earn a hint. Use /task to reopen the full task, or /pause if you need to step away.
```

```text
Stuck is a real state, not a failure. On “${task.title},” make the next move only this: ${task.brief} A rough fragment is enough to start. Paste anything—even broken code or a half-written paragraph—and you earn a hint. Use /task to see the task again, or /pause if you need room.
```

```text
No shame in not starting. For “${task.title},” begin with the smallest version of this move: ${task.brief} It does not need to work yet. Paste anything—even broken code or a half-written paragraph—and you earn a hint. Use /task for the full task, or /pause if today is not workable.
```

## Gate outputs

`npm run worker:check`

```text
> journeyman@0.1.0 worker:check
> tsc --project worker/tsconfig.json --noEmit
```

`npx tsc --noEmit`

Exit 0 with no output.

`npm run simulate:onboarding`

```text
> journeyman@0.1.0 simulate:onboarding
> node --no-warnings --experimental-strip-types scripts/simulate-onboarding.ts

[conversation] gap analysis failed for cmrr1z4qy000009fgm0d89g4o Error: simulated Codex failure
    at ConversationService.stubRunner [as agentRunner] (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:49:80)
    at ConversationService.runGap (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:292:29)
    at ConversationService.launchGap (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:286:43)
    at ConversationService.finishPosts (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:283:216)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:113:20)
[conversation] plan failed for cmrr1z4qy000009fgm0d89g4o Error: simulated plan failure
    at ConversationService.stubRunner [as agentRunner] (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:50:184)
    at ConversationService.runPlan (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:307:31)
    at ConversationService.launchPlan (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:300:43)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts:139:28)
simulate:onboarding passed — collector, retry recovery, plan activation, and struggle ladder verified.
```

The two errors are intentional Pass 9 stub failures. Final standards and spec reviews found no remaining material issues.

No git operations, build, worker restart, or live application agent calls were performed.

🟢 Pass 10 refusal range and contextual struggle nudges are implemented and green