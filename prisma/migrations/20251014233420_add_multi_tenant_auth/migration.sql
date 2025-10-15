/*
  Warnings:

  - You are about to drop the column `isRecurring` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `lastReopenedAt` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `nextReopenAt` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `recurringDay` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `recurringType` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `recurringWeekDay` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `requiresApproval` on the `subtasks` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - Added the required column `accountId` to the `main_tasks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "account_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "account_users_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    CONSTRAINT "main_tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "main_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_main_tasks" ("completedAt", "createdAt", "createdBy", "deadline", "description", "id", "priority", "status", "title", "updatedAt") SELECT "completedAt", "createdAt", "createdBy", "deadline", "description", "id", "priority", "status", "title", "updatedAt" FROM "main_tasks";
DROP TABLE "main_tasks";
ALTER TABLE "new_main_tasks" RENAME TO "main_tasks";
CREATE INDEX "main_tasks_accountId_idx" ON "main_tasks"("accountId");
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
    CONSTRAINT "subtasks_mainTaskId_fkey" FOREIGN KEY ("mainTaskId") REFERENCES "main_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subtasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_subtasks" ("actualHours", "approvedAt", "approvedBy", "assignedToId", "completedAt", "createdAt", "deadline", "description", "estimatedHours", "id", "mainTaskId", "priority", "rejectedAt", "rejectedBy", "rejectionReason", "status", "title", "updatedAt") SELECT "actualHours", "approvedAt", "approvedBy", "assignedToId", "completedAt", "createdAt", "deadline", "description", "estimatedHours", "id", "mainTaskId", "priority", "rejectedAt", "rejectedBy", "rejectionReason", "status", "title", "updatedAt" FROM "subtasks";
DROP TABLE "subtasks";
ALTER TABLE "new_subtasks" RENAME TO "subtasks";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "email", "id", "name", "updatedAt") SELECT "createdAt", "email", "id", "name", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_slug_key" ON "accounts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "account_users_userId_accountId_key" ON "account_users"("userId", "accountId");
