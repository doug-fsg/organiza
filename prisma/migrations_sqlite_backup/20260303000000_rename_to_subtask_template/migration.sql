-- Criar tabela subtask_templates (Modelo de Subtarefas)
CREATE TABLE "subtask_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "stagesData" TEXT NOT NULL,
    CONSTRAINT "subtask_templates_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migrar dados: extrair etapas do templateData (workflowStages ou subtasks)
INSERT INTO "subtask_templates" ("id", "name", "description", "accountId", "createdAt", "updatedAt", "stagesData")
SELECT 
    "id", 
    "name", 
    "description", 
    "accountId", 
    "createdAt", 
    "updatedAt",
    COALESCE(
        CASE WHEN json_extract("templateData", '$.workflowStages') IS NOT NULL 
            THEN json_extract("templateData", '$.workflowStages') 
            ELSE json_extract("templateData", '$.subtasks') END,
        '[]'
    )
FROM "project_templates";

-- Recrear main_tasks: templateId -> subtaskTemplateId
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_main_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "createdBy" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "subtaskTemplateId" TEXT,
    CONSTRAINT "main_tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "main_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "main_tasks_subtaskTemplateId_fkey" FOREIGN KEY ("subtaskTemplateId") REFERENCES "subtask_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_main_tasks" ("id", "title", "description", "status", "priority", "deadline", "createdAt", "updatedAt", "completedAt", "createdBy", "accountId", "subtaskTemplateId")
SELECT "id", "title", "description", "status", "priority", "deadline", "createdAt", "updatedAt", "completedAt", "createdBy", "accountId", "templateId" FROM "main_tasks";
DROP TABLE "main_tasks";
ALTER TABLE "new_main_tasks" RENAME TO "main_tasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Índices
CREATE INDEX "main_tasks_accountId_idx" ON "main_tasks"("accountId");
CREATE INDEX "main_tasks_subtaskTemplateId_idx" ON "main_tasks"("subtaskTemplateId");
CREATE INDEX "subtask_templates_accountId_idx" ON "subtask_templates"("accountId");

-- Remover tabela antiga
DROP TABLE "project_templates";
