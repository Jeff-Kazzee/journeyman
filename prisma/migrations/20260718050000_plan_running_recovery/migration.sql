-- Distinguish interrupted plan generation from interrupted gap analysis.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = '"ConversationStage"'::regtype
      AND enumlabel = 'PLAN_RUNNING'
  ) THEN
    ALTER TYPE "ConversationStage" ADD VALUE 'PLAN_RUNNING' AFTER 'GAPANALYSIS_RUNNING';
  END IF;
END
$$;
