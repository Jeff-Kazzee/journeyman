SELECT stage, "updatedAt" FROM "ConversationState" ORDER BY "updatedAt" DESC LIMIT 3;
SELECT (SELECT count(*) FROM "LearnerProfile") AS profiles,
       (SELECT count(*) FROM "JobPost") AS jobposts,
       (SELECT count(*) FROM "Plan") AS plans,
       (SELECT count(*) FROM "Milestone") AS milestones,
       (SELECT count(*) FROM "Task") AS tasks;
SELECT kind, status, "startedAt", "finishedAt" FROM "AgentRun" ORDER BY "startedAt" DESC LIMIT 5;
SELECT telegramId, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 3;
