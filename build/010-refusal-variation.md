# Pass 10 — the refusal gate reads as a script; give it range (Jeff hit this live)

Live repro (Jeff, tonight): after plan activation he sent "can you just do it
for me" → refusal (correct). Then "I did not do it" → the IDENTICAL refusal
string, verbatim. Two identical canned replies in a row destroy the mentor
illusion — it reads as hard-coded, exactly at the demo's money moment.

Design intent stays: NO agent call for non-attempts (instant, free,
ungameable). The fix is range and context inside the deterministic gate, in
`worker/src/conversation.ts` (the non-attempt branch of the active-task
message handler / `fakeAttempt` path):

1. **Classify non-attempt messages into two kinds:**
   - **Cold ask** (wants the answer: "just tell me", "do it for me", "give me
     the solution", questions with zero shown work) → refusal.
   - **Admission / struggle statement** ("I did not do it", "i haven't
     started", "I'm stuck", "can't do this", "don't know where to start") →
     supportive nudge, NOT the refusal: acknowledge honestly, shrink the ask,
     point at the smallest concrete first move for THE ACTIVE TASK (use the
     task title + brief in the template), remind them that pasting anything —
     even broken code or a half-written paragraph — earns a hint. Mention
     /task and /pause once.
2. **Refusals get 4–5 distinct templates** referencing the active task title
   and, where natural, a short quoted fragment (≤60 chars, sanitized: strip
   newlines, truncate) of what the user said. Same firm boundary in every
   variant: show an attempt, earn a hint. No solutions, no softening of the
   rule itself.
3. **Rotation + escalation:** track `consecutiveNonAttempts` in `Data`
   (reset on any genuine attempt or command). Never send the same template
   twice in a row (rotate deterministically by the counter — no randomness).
   At 3+ consecutive, the variant also names the pattern plainly ("Third ask
   with nothing shown. The rule hasn't changed...") and points at /task for
   the deliverable spec.
4. **Do not touch:** the genuine-attempt path (codex hint), the classifier's
   effort-keyword logic beyond adding the admission split, any output schema,
   any other stage. No agent calls added anywhere in the gate.

## Gates (run and paste output)
1. Extend `simulate-onboarding.ts`: three consecutive cold asks yield three
   NON-IDENTICAL refusals, each containing the active task title; an
   admission message yields the nudge (not a refusal) and includes the task
   title; a genuine attempt afterward still routes to the (stub) hint and
   resets the counter. Existing assertions stay green.
2. `npm run worker:check` and `npx tsc --noEmit` green.
3. `npm run simulate:onboarding` green (full run).

Constraints: no git operations; no build; no worker restart; no live agent
calls; temp files under build\tmp\.

## Report
Files changed + diff summary; the full text of every template (refusals +
nudge variants) verbatim; gate outputs.
