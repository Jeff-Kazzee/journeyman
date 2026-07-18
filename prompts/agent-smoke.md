<!-- prompt-version: v2 -->
# Agent stdin smoke check

The runtime context contains `transportProbe`: a multi-line, quote-heavy string.
Return only JSON matching the supplied schema. Set `reply` to `"OK"` and copy
`transportProbe` character-for-character into `echoedProbe`, including newlines,
quotes, and the backslash. This verifies prompt delivery through stdin.