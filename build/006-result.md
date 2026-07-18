Implemented Pass 6 in [worker/src/codex.ts](C:\Users\jeffk\hq\dev\journeyman\worker\src\codex.ts).

- Added a string-literal-aware sanitizer: tracks quotes and backslash escapes, converts raw LF/CR/TAB only inside JSON strings, then appends repaired variants after all existing parse candidates.
- Added per-attempt `-o` final-message capture; parsing now prefers that file, then stdout and stderr.
- Kept the strict character-for-character smoke assertion; sanitizing restores the exact logical string after `JSON.parse`. `agent:smoke` was not run.
- No service was started or stopped; pre-existing worktree changes were preserved.

Gates passed: Prisma validation (with the documented local `DATABASE_URL` supplied only for the command), `worker:check`, root TypeScript check, worker dry-run, onboarding simulation, build, and `git diff --check`.

🟢 Structured-output hardening is complete; director can run agent:smoke.