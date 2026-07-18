Pass 6 in the Journeyman build — small, surgical: harden structured-output parsing. Context: the stdin transport is PROVEN working (prompts reach Codex fine). `agent:smoke` failed at parse: `Unexpected non-whitespace character after JSON at position 286 (line 6 column 1)` — the model copied the multi-line probe into a JSON string with RAW newlines instead of `\n` escapes. Models do this often; every agent run is exposed.

## Fix (`worker/src/codex.ts`, `parseAgentOutput`)

1. Add a **string-literal-aware sanitizer**: walk the text, track in-string/out-of-string state (respecting `\"` escapes), and replace raw control characters (LF, CR, TAB) that appear *inside* string literals with their escaped forms (`\n`, `\r`, `\t`). Never touch text outside strings. Add sanitized variants to the existing candidate list — do not replace the current candidates.
2. Optional robustness: if `--output-last-message <file>` is supported in this codex version (it is: `-o`), write the final message to a temp file and prefer parsing that over scraping stdout; keep stdout/stderr as fallbacks.
3. `scripts/agent-smoke.ts` + `prompts/agent-smoke.md`: keep the char-for-char echo assertion **only if** the sanitizer makes it pass deterministically; otherwise relax to two single-line fields (`firstLineEcho`, `lastLineEcho`) so the smoke asserts transport fidelity without demanding JSON-hostile output. Your call — pick whichever passes twice in a row.

## Gates

`npx prisma validate`, `npm run worker:check`, `npx tsc --noEmit`, `npm run worker -- --dry-run`, `npm run simulate:onboarding`, `npm run build` — all green. Do NOT run `agent:smoke` (the director runs it right after you). Do NOT start/stop services.

## Report

Sanitizer approach, whether smoke kept strict echo or relaxed, gates, deviations.
