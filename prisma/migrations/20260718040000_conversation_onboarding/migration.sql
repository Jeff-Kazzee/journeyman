-- Persist the Telegram onboarding and planning conversation independently of the bot process.
CREATE TYPE "ConversationStage" AS ENUM (
  'IDLE',
  'ONBOARDING_GOAL',
  'ONBOARDING_ROLE',
  'ONBOARDING_BACKGROUND',
  'ONBOARDING_CONSTRAINTS',
  'ONBOARDING_SKILLS',
  'ONBOARDING_CONFIRM',
  'JOBPOSTS_COLLECTING',
  'GAPANALYSIS_RUNNING',
  'PLAN_PROPOSED',
  'PLAN_ACTIVE'
);

ALTER TABLE "LearnerProfile" ADD COLUMN "selfAssessedSkills" JSONB;
ALTER TABLE "Task" ADD COLUMN "whyItMatters" TEXT;

CREATE TABLE "ConversationState" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stage" "ConversationStage" NOT NULL DEFAULT 'IDLE',
  "data" JSONB NOT NULL,
  "planRevisionCount" INTEGER NOT NULL DEFAULT 0,
  "pausedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationState_userId_key" ON "ConversationState"("userId");
CREATE INDEX "ConversationState_stage_pausedAt_idx" ON "ConversationState"("stage", "pausedAt");

ALTER TABLE "ConversationState"
  ADD CONSTRAINT "ConversationState_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;