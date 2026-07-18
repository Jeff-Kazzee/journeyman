SELECT kind, "startedAt", RIGHT(COALESCE("rawLog", '<null>'), 1200) AS raw_log_tail
FROM "AgentRun" WHERE status = 'FAILED'
ORDER BY "startedAt" DESC LIMIT 1;
