Implemented the rubric array fallback exactly as requested.

Files changed:

- [worker/src/conversation.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts) — array schema, line-based plan rendering; persistence remains unchanged.
- [scripts/simulate-onboarding.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/simulate-onboarding.ts) — array fixtures plus rendering and persistence assertions.
- [prompts/plan.md](C:/Users/jeffk/hq/dev/journeyman/prompts/plan.md) — updated JSON contract.
- [app/app/plan/page.tsx](C:/Users/jeffk/hq/dev/journeyman/app/app/plan/page.tsx) — array-safe rubric rendering.

Diff summary: `4 files changed, 30 insertions(+), 9 deletions(-)`. `scripts/verify-plan-run.ts` still imports `planSchema`.

Schema inspection output verbatim:

```json
{
  "milestoneProperties": [
    "title",
    "description",
    "deliverableSpec",
    "rubric",
    "tasks"
  ],
  "milestoneRequired": [
    "title",
    "description",
    "deliverableSpec",
    "rubric",
    "tasks"
  ],
  "rubricInProperties": true,
  "rubricInRequired": true,
  "rubricType": "array",
  "rubricItemProperties": [
    "criterion",
    "description"
  ],
  "rubricItemRequired": [
    "criterion",
    "description"
  ],
  "propertyNamesPaths": [],
  "bareAdditionalPropertiesPaths": []
}
```

Gates:

- `npm run worker:check` — GREEN
- `npx tsc --noEmit` — GREEN
- `npm run simulate:onboarding` — GREEN
  - `simulate:onboarding passed — collector, retry recovery, plan activation, and struggle ladder verified.`
- Targeted `git diff --check` — GREEN
- Live plan/smoke gates — not run, per instruction
- No commit created

🟡 Array fallback is complete; director live plan/smoke gates remain.