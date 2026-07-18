Pass 8 is implemented but not fully verified: the managed sandbox blocks Node from spawning Codex, so two required live gates cannot reach the API.

### Changes

- [worker/src/conversation.ts](C:/Users/jeffk/hq/dev/journeyman/worker/src/conversation.ts:24)
  - Changed the rubric key schema from `z.string().min(1)` to `z.string()`.
  - Kept non-empty values and the non-empty-record refinement.
- [scripts/verify-plan-run.ts](C:/Users/jeffk/hq/dev/journeyman/scripts/verify-plan-run.ts:1)
  - Added the real `runAgent` verifier with a realistic backend profile and nine validated gaps.
  - On success, prints title, milestone count, and timing.

Schema decision: retained the record shape because generated JSON Schema no longer contains `propertyNames`; the API was never reached, so there is no evidence requiring the array fallback.

### Verification

Generated-schema inspection passed verbatim:

```text
planSchema JSON schema contains no propertyNames keyword.
```

Worker typecheck passed:

```text
> journeyman@0.1.0 worker:check
> tsc --project worker/tsconfig.json --noEmit
```

Onboarding passed verbatim:

```text
simulate:onboarding passed — collector, retry recovery, plan activation, and struggle ladder verified.
```

The real plan verifier could not produce title/count/timing because process creation was blocked before Codex invocation:

```text
verify-plan-run failed Error: spawn EPERM
    at ChildProcess.spawn (node:internal/child_process:421:11)
    at spawn (node:child_process:796:9)
    at file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/codex.ts:222:19
    at new Promise (<anonymous>)
    at executeCodex (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/codex.ts:221:10)
    at runAgent (file:///C:/Users/jeffk/hq/dev/journeyman/worker/src/codex.ts:302:28)
    at async main (file:///C:/Users/jeffk/hq/dev/journeyman/scripts/verify-plan-run.ts:76:16) {
  errno: -4048,
  code: 'EPERM',
  syscall: 'spawn'
}
```

`npm run agent:smoke` failed at the identical `worker/src/codex.ts:222` spawn boundary with `EPERM`. Neither failure reached OpenAI or tested schema acceptance.

`git diff --check` passed. Local standards/spec review found no implementation issue or scope creep. `npm run build` was not run, the worker was not restarted, and no commit was created.

The Node runs created `build/tmp`; sandbox policy also blocked its cleanup. Existing `build/008-*.md` files were untouched.

🟡 Code fixed; real plan and smoke gates require a shell that permits child-process spawning