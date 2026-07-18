SELECT id, kind, status, "promptVersion", "startedAt", "finishedAt"
FROM "AgentRun" ORDER BY "startedAt" DESC LIMIT 1;
SELECT LEFT(COALESCE("rawLog", '<null>'), 2500) AS raw_log_head
FROM "AgentRun" ORDER BY "startedAt" DESC LIMIT 1;
