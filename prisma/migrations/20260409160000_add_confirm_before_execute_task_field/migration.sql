ALTER TABLE "task_field_definitions" ADD COLUMN IF NOT EXISTS "confirmBeforeExecute" BOOLEAN NOT NULL DEFAULT false;
