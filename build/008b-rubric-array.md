# Pass 8b — rubric record shape is unsalvageable; apply the array fallback

Director update after running your pass-8 gates from an unsandboxed shell:

- `npm run agent:smoke` — GREEN (your fix's schema emission is fine there).
- `scripts/verify-plan-run.ts` — the real plan run STILL fails with a NEW
  schema 400 (from AgentRun.rawLog; the surfaced "malformed JSON at position
  4493" is just stderr noise being parsed — ignore it):

```
code: invalid_json_schema, param: text.format.schema
"Invalid schema for response_format 'codex_output_schema': In context=('properties', 'milestones', 'items'), 'required' is required to be supplied and to be an array including every key in properties. Extra required key 'rubric' supplied."
```

Diagnosis: `z.record(...)` emits an object with `additionalProperties` and no
`properties`; the structured-output strict normalization drops `rubric` from
the milestone's `properties` while `required` still lists it → 400. The record
shape cannot pass this endpoint. Apply fix #2 from pass 8 exactly:

1. In `worker/src/conversation.ts`, change `rubric` to
   `z.array(z.object({ criterion: z.string().min(1), description: z.string().min(1) }).strict()).min(1)`
   (drop the now-redundant `.refine`).
2. Update EVERY rubric consumer to the array shape — `rg -n rubric` across
   worker, web, scripts, prompts. Known ones: `persistPlan`
   (`Milestone.rubric` Json column — store the array as-is), `planText`
   rendering (render as "criterion: description" lines), the JSON-contract
   paragraph in `prompts/plan.md` ("string-to-string object" → array of
   `{criterion, description}`), and any web read-side rendering of
   `milestone.rubric`. Keep `scripts/verify-plan-run.ts` importing `planSchema`
   so it exercises the new shape.
3. Gates YOU run (they work in your sandbox): worker typecheck; a schema
   inspection proving the emitted JSON schema for `milestones.items` has
   `rubric` present in BOTH `properties` and `required`, with no
   `propertyNames` anywhere and no bare-`additionalProperties` objects;
   `npm run simulate:onboarding` green (update the stub plan fixture if it uses
   the record shape).
4. Do NOT run the live plan/smoke gates (spawn EPERM in your sandbox) — the
   director runs them after you report. Do NOT `git commit`. No long consts or
   `z.literal` in output schemas.

Report: files changed + diff summary, the schema-inspection output verbatim,
simulate/typecheck results.
