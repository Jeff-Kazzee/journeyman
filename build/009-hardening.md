# Pass 9 — Runtime hardening from the PR #1 adversarial review

Context: pass 8b merged to `dev` as PR #1. A 3-lens adversarial review
(verdict: https://github.com/Jeff-Kazzee/journeyman/pull/1#issuecomment-5013222663)
confirmed pre-existing runtime defects. The full E2E drive is green (all 8
stages, real codex), so the baseline works — this pass hardens the paths Jeff
will hit in his live run. One scoped pass, no scope creep.

## Must fix (both HIGH)

1. **`/retry` after a failed plan revision drops the user's change.**
   `conversation.ts`: the `change` arg to `runPlan` (L250) is never persisted;
   the catch (L252) loses it; `retry` (L294) relaunches with no change and
   `revision` defaulting to 0. Fix: persist `pendingChange?: string` in `Data`
   when a revision run starts; keep it in the catch; in `retry`'s plan branch,
   thread `data.pendingChange` and the stored `planRevisionCount` back into
   `launchPlan`; clear `pendingChange` on success.
2. **Worker restart mid gap/plan run strands the user in
   `GAPANALYSIS_RUNNING`.** Both agent calls run under that stage; if the
   process dies, state has no `gaps`, no `lastFailedRun`, and every message
   gets "still reading" forever; `/retry` says nothing is waiting. Fix, both
   parts: (a) persist `gaps` + advance to a distinct running marker as soon as
   gap-analysis succeeds so the two phases are independently recoverable;
   (b) on worker boot, sweep ConversationState rows stuck in a RUNNING stage
   and set `lastFailedRun` appropriately (gap vs plan) so `/retry` recovers
   them; send no unsolicited message (the user will message when ready).

## Should fix (same pass, all small)

3. Bind and log the error (with userId) in the three bare catches at
   `conversation.ts:238`, `:252`, `:313` — `console.error("[conversation] <kind> failed for <userId>", error)`.
4. When the plan step fails but gaps succeeded, deliver the gaps: in the
   `runPlan` catch, return `response(gapsText(data.gaps), "I hit a snag ...")`
   (gaps are in scope; keep the retry instruction).
5. `persistPlan` failure recovery message: the generic catch in
   `worker/src/index.ts:41-44` tells users to `/retry`, but after a persist
   failure the correct action is re-sending `confirm`. Make `persistPlan`
   catch its own transaction failure and return "I couldn't save the plan —
   reply confirm to try again." (leave the generic catch as last resort).
6. `scripts/simulate-onboarding.ts:109`: add `orderBy: { idx: "asc" }` to the
   milestones include (assertion currently depends on unguaranteed ordering).
7. `.gitignore`: add `build/tmp/`. `package.json`: add
   `"verify:plan": "node --experimental-strip-types scripts/verify-plan-run.ts"`.
8. `npm update postcss` so the transitive dep resolves >=8.5.10 (clears
   Dependabot alert #1; build-time only). Commit-ready lockfile change only —
   verify `npx tsc --noEmit` still green after.

## Constraints

- Do NOT touch schemas' shapes (no z.record, no z.literal/long consts — the
  structured-output rules stand). Do not refactor beyond the listed fixes.
- Do NOT run `npm run build`; do not restart the worker; do NOT run live
  agent calls (spawn EPERM in your sandbox — director runs live gates after).
- NO git operations at all — the director handles branch/commit/PR.
- Temp files under `build\tmp\` (single-writable-root sandbox).

## Gates (run them all; paste output)

1. Extend `simulate-onboarding.ts` to cover fixes 1, 2, and 4 with the stub
   runner: (a) failed revision retains the pending change and revision count
   on retry; (b) a state hand-seeded into a stuck RUNNING stage is recovered
   by the boot sweep and `/retry` works for both gap and plan variants;
   (c) plan-failure reply contains the gaps text. Keep existing assertions
   green.
2. `npm run worker:check` green; `npx tsc --noEmit` green.
3. `npm run simulate:onboarding` green (full).

## Report

Files changed + diff summary; each fix mapped to its review finding; gate
outputs verbatim; anything deliberately NOT done and why.
