Pass 7 — small, surgical. Pass 6's sanitizer is good hardening, but the director's diagnosis shows the smoke failure had a different root cause. Correct the record and fix the two real bugs.

## What the director proved (replayed outside the worker, deterministic across 4 runs)

1. The failing final message was always **valid single-line JSON**: `{"reply":"OK","echoedProbe":"Line one: \"Journeyman\" must survive quo"}` — the echo truncated at exactly ~39 chars. It reproduces with `codex exec --output-schema <the smoke schema>` even when the **prompt never contains the probe** — so the model only knows the text from the schema's `const`, and it is truncated somewhere in the codex structured-output pipeline. Conclusion: **long (esp. multi-line) `const`/`z.literal` values in output schemas are unusable** — the pipeline truncates them. Same result with root-`$ref` and inline schema shapes.
2. With `echoedProbe` as a plain `{"type":"string"}` and the probe delivered in the prompt (as the real flow does), the full 194-char probe round-trips **character-for-character, correctly escaped**. Verified.
3. The reported error "Unexpected non-whitespace character after JSON at position 286 (line 6 column 1)" was a **red herring**: `parseAgentResult` rethrows the LAST source's error — stderr, which is never JSON — masking the real final-message failure (a Zod literal mismatch). This masking misdirected pass 6.

## Fix

1. `scripts/agent-smoke.ts`: change `echoedProbe` in `smokeSchema` from `z.literal(transportProbe)` to `z.string()`. The script's existing `assert.equal(result.echoedProbe, transportProbe)` (line 16) keeps the strict char-for-char guarantee — at the right layer. Keep `reply: z.literal("OK")` (short consts are fine).
2. `worker/src/codex.ts` `parseAgentResult`: stop masking. Collect each source's error and throw a single `AgentOutputError` that names the sources tried and includes the **final-message** error first (it is the authoritative source), e.g. `finalMessage: <err>; stdout: <err>; stderr: <err>`. Do not change candidate ordering.
3. Add one comment line near `runAgent`'s schema handling documenting the constraint: output schemas must not carry long string `const` values — the codex pipeline truncates them (~39 chars observed); enforce exact-match assertions in calling code instead.

## Gates

`npx prisma validate`, `npm run worker:check`, `npx tsc --noEmit`, `npm run worker -- --dry-run`, `npm run simulate:onboarding`, `npm run build` — all green. Do NOT run `agent:smoke` (the director runs it right after you). Do NOT start/stop services.

## Report

What changed, the new parseAgentResult error shape, gates, deviations.
