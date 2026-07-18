SELECT kind, status, "startedAt", "finishedAt",
       EXTRACT(EPOCH FROM ("finishedAt" - "startedAt"))::int AS seconds
FROM "AgentRun" ORDER BY "startedAt" DESC LIMIT 8;
SELECT kind, LEFT(COALESCE("rawLog", '<null>'), 1800) AS raw_log_head
FROM "AgentRun" WHERE status = 'FAILED'
ORDER BY "startedAt" DESC LIMIT 2;
SELECT stage, "updatedAt" FROM "ConversationState" ORDER BY "updatedAt" DESC LIMIT 1;
