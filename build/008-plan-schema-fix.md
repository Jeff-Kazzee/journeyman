# Pass 8 — Fix planSchema: OpenAI rejects `propertyNames` (plan step can never succeed)

## The bug (proven by a real E2E drive tonight; deterministic, reproduced on /retry)

Every `plan`-kind agent run fails in ~20s. The rawLog shows the OpenAI API
rejecting the output schema BEFORE generation:

```
HTTP 400, param: text.format.schema, code: invalid_json_schema
"Invalid schema for response_format 'codex_output_schema': In context=('properties', 'milestones', 'items', 'properties', 'rubric'), 'propertyNames' is not permitted."
```

Root cause: `worker/src/conversation.ts` line 24:

```ts
rubric: z.record(z.string().min(1), z.string().min(1)).refine((rubric) => Object.keys(rubric).length > 0),
```

The `.min(1)` on the KEY schema makes the JSON-schema conversion emit a
`propertyNames` constraint, which OpenAI structured outputs forbid. Gap-analysis
passes because it has no `z.record`. This is the same family as the pass-7
lesson: no constrained consts/literals in output schemas.

## Fix (in order of preference)

1. **Minimal:** drop the key constraint — `z.record(z.string(), z.string().min(1))`
   (keep the non-empty `.refine`). Then VERIFY with a real run (below).
2. **If the endpoint still rejects the schema** (e.g. it also refuses the
   `additionalProperties`-typed object that `z.record` emits under strict
   mode): change `rubric` to
   `z.array(z.object({ criterion: z.string().min(1), description: z.string().min(1) }).strict()).min(1)`
   and update EVERY rubric consumer: `persistPlan` (`Milestone.rubric` is a
   Json column — store the array or convert to an object, your call, but keep
   it consistent), `planText` rendering, `prompts/plan.md` if it describes the
   rubric shape, and anything else `rg rubric` finds (web read-side included).

Constraints: do NOT reintroduce long string consts or `z.literal` in any output
schema (pass-7 lesson, ~39-char truncation). Do not touch unrelated code. Do
not run `npm run build`. Do not restart the worker (the director handles that).
Do NOT `git commit` — commits are approved separately by Jeff.

(Relaunch note: the sandbox now has a single writable root — the repo. Your
temp files go under the repo, e.g. `build\tmp\`, not the system TEMP.)

## Gates — pass 8 is done ONLY when all are true, verified in this pass

1. A **REAL** `plan`-kind run succeeds end-to-end: write a small
   `scripts/verify-plan-run.ts` that calls the real `runAgent` with
   `prompts/plan.md`, a realistic profile + the 9-gap style context (hardcode a
   plausible gaps object matching `gapAnalysisSchema`), and the fixed
   `planSchema`; it must print the parsed plan title + milestone count and exit
   0. Run it (`node --experimental-strip-types`, DATABASE_URL from env; expect
   1–4 min). Paste its output in your report. If it 400s again, apply fix #2
   and re-run.
2. `npm run agent:smoke` green.
3. `npm run simulate:onboarding` green.

## Report

Write what changed (files + diff summary), the verify-plan-run output verbatim
(title + milestone count + timing), smoke/simulate results, and any schema
shape decision you made (record vs array) with one line of reasoning.
