/*
  Warnings:

  - You are about to drop the column `condominium` on the `service_payments` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "departments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "department_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "department_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "department_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "mainTaskId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "department_tasks_mainTaskId_fkey" FOREIGN KEY ("mainTaskId") REFERENCES "main_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "templateData" TEXT NOT NULL,
    CONSTRAINT "project_templates_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_service_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "serviceDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "accountId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "paidById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "paidAt" DATETIME,
    "rejectionReason" TEXT,
    CONSTRAINT "service_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "service_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_payments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_payments_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_payments_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_service_payments" ("accountId", "approvedAt", "approvedById", "createdAt", "description", "id", "paidAt", "paidById", "rejectedAt", "rejectedById", "rejectionReason", "serviceDate", "status", "supplierId", "updatedAt", "value") SELECT "accountId", "approvedAt", "approvedById", "createdAt", "description", "id", "paidAt", "paidById", "rejectedAt", "rejectedById", "rejectionReason", "serviceDate", "status", "supplierId", "updatedAt", "value" FROM "service_payments";
DROP TABLE "service_payments";
ALTER TABLE "new_service_payments" RENAME TO "service_payments";
CREATE INDEX "service_payments_accountId_idx" ON "service_payments"("accountId");
CREATE INDEX "service_payments_supplierId_idx" ON "service_payments"("supplierId");
CREATE INDEX "service_payments_status_idx" ON "service_payments"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "departments_accountId_idx" ON "departments"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "department_users_departmentId_userId_key" ON "department_users"("departmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "department_tasks_departmentId_mainTaskId_key" ON "department_tasks"("departmentId", "mainTaskId");

-- CreateIndex
CREATE INDEX "project_templates_accountId_idx" ON "project_templates"("accountId");
