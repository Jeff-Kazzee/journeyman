# Pass 11 — fix the PR #3 review findings before merge (scoped, no creep)

Two-lens adversarial review of the branch found these. Fix all, in
`worker/src/conversation.ts`, `worker/src/index.ts`, and the simulator only.

## Merge-gating

1. **Boot sweep must never block boot.** `index.ts:82` awaits
   `recoverInterruptedConversations()` before `bot.start()`; any rejection is
   fatal and the bot never starts (total outage for the live user). Wrap in
   try/catch: log the error, continue to `bot.start()`. Recovery is
   best-effort by definition.

## HIGH — classifier regresses genuine attempts (empirically proven)

2. These real inputs were routed to the admission nudge (no Attempt row, no
   hint) but got a HINT before this branch:
   - "I'm stuck on why the button click does nothing after I bind the handler"
   - "cannot do this, the API keeps 500ing on my fetch call"
   - "can't do this yet — my for-loop only prints the last row of the grid"
   Root cause: admission regex anchors on leading "i'm stuck"/"can't do this"
   and wins whenever `hasConcreteAttempt` is false, but the concrete-attempt
   allowlist is far too narrow. Fix BOTH sides:
   - Admissions must only match **short, content-free** messages: gate on
     total length (e.g. < 40 chars after trim) AND absence of any following
     clause with substance (no "on/because/when/why …" continuation carrying
     detail). "I did not do it" / "I'm stuck" / "can't do this" still match.
   - Broaden `hasConcreteAttempt` with common real-attempt vocabulary (api,
     fetch, endpoint, 500/4xx/status, button, click, handler, bind, loop,
     array, grid, throw, bug, undefined, null, query, route, render, state,
     etc.) — presence of technical tokens or pasted-code shapes routes to the
     attempt path. When in doubt, prefer HINT over nudge: a false hint costs
     a codex call; a false nudge silently discards the learner's work.

## MEDIUM — escalation shames the wrong people (both lenses flagged)

3. "Third ask with nothing shown" keys off the SHARED `consecutiveNonAttempts`
   count, so [admission, admission, cold-ask] scolds an honest user on their
   FIRST cold ask. Track the **cold-ask streak separately** (reset it on
   admissions too, or keep two counters); escalation copy fires only on the
   3rd+ consecutive COLD ASK. Template rotation should also be per-kind so
   interleaving can't repeat a template back-to-back.

## MEDIUM/LOW copy + hygiene

4. Nudges embed `${task.brief}` mid-sentence but briefs aren't guaranteed
   terminal punctuation → run-ons. Normalize (append "." when missing) or
   put the brief on its own line.
5. Empty/whitespace-only fragment → `You said: ""` dangling quote. When the
   sanitized fragment is empty, fall back to a fragment-free template.
6. `const PLAN_RUNNING = "PLAN_RUNNING" as ConversationStage` — add a one-line
   comment stating this is a deliberate stale-client workaround to switch to
   the enum member after the next `prisma generate`.
7. `withoutFailure` should also strip `pendingChange` so a confirmed plan
   doesn't carry dead cruft into the PLAN_ACTIVE blob.

## Gates

1. Simulator additions: the three misrouted inputs above MUST route to the
   (stub) hint path and create Attempt rows; "I did not do it" and bare
   "I'm stuck" still route to nudges; [admission, admission, cold-ask] yields
   a FIRST-level refusal (no "Third ask" text); three consecutive cold asks
   still escalate on the third; brief-without-period renders with a sentence
   boundary; existing assertions stay green.
2. `npm run worker:check` and `npx tsc --noEmit` green.
3. `npm run simulate:onboarding` green (full).

Constraints: no schema shape changes, no git ops, no build, no worker
restart, no live agent calls, temp files in build\tmp\.

## Report
Files changed + diff summary, each fix mapped to its finding, the final
classifier rules stated plainly, gate outputs verbatim.
