-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_subtasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "deadline" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "estimatedHours" INTEGER,
    "actualHours" INTEGER,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "mainTaskId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    CONSTRAINT "subtasks_mainTaskId_fkey" FOREIGN KEY ("mainTaskId") REFERENCES "main_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_subtasks" ("actualHours", "approvedAt", "approvedBy", "assignedToId", "completedAt", "createdAt", "deadline", "description", "estimatedHours", "id", "mainTaskId", "priority", "rejectedAt", "rejectedBy", "rejectionReason", "status", "title", "updatedAt") SELECT "actualHours", "approvedAt", "approvedBy", "assignedToId", "completedAt", "createdAt", "deadline", "description", "estimatedHours", "id", "mainTaskId", "priority", "rejectedAt", "rejectedBy", "rejectionReason", "status", "title", "updatedAt" FROM "subtasks";
DROP TABLE "subtasks";
ALTER TABLE "new_subtasks" RENAME TO "subtasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
