-- RedefineTables
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
    "templateId" TEXT,
    CONSTRAINT "main_tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "main_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "main_tasks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "project_templates" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_main_tasks" ("accountId", "completedAt", "createdAt", "createdBy", "deadline", "description", "id", "priority", "status", "title", "updatedAt") SELECT "accountId", "completedAt", "createdAt", "createdBy", "deadline", "description", "id", "priority", "status", "title", "updatedAt" FROM "main_tasks";
DROP TABLE "main_tasks";
ALTER TABLE "new_main_tasks" RENAME TO "main_tasks";
CREATE INDEX "main_tasks_accountId_idx" ON "main_tasks"("accountId");
CREATE INDEX "main_tasks_templateId_idx" ON "main_tasks"("templateId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
