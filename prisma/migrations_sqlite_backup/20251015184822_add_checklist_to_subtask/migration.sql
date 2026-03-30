-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL
);

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
    "mainTaskId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringType" TEXT,
    "recurringInterval" INTEGER,
    "recurringWeekDays" TEXT,
    "recurringMonthDays" TEXT,
    "recurringEndDate" DATETIME,
    "skipWeekends" BOOLEAN NOT NULL DEFAULT false,
    "skipHolidays" BOOLEAN NOT NULL DEFAULT false,
    "recurringDay" INTEGER,
    "recurringWeekDay" TEXT,
    "lastReopenedAt" DATETIME,
    "nextReopenAt" DATETIME,
    "checklistItems" TEXT,
    CONSTRAINT "subtasks_mainTaskId_fkey" FOREIGN KEY ("mainTaskId") REFERENCES "main_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_subtasks" ("actualHours", "approvedAt", "approvedBy", "assignedToId", "completedAt", "createdAt", "deadline", "description", "estimatedHours", "id", "mainTaskId", "priority", "rejectedAt", "rejectedBy", "rejectionReason", "status", "title", "updatedAt") SELECT "actualHours", "approvedAt", "approvedBy", "assignedToId", "completedAt", "createdAt", "deadline", "description", "estimatedHours", "id", "mainTaskId", "priority", "rejectedAt", "rejectedBy", "rejectionReason", "status", "title", "updatedAt" FROM "subtasks";
DROP TABLE "subtasks";
ALTER TABLE "new_subtasks" RENAME TO "subtasks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_token_key" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_token_idx" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_email_idx" ON "user_invites"("email");
