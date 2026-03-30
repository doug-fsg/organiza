-- AlterTable
ALTER TABLE "subtasks" ADD COLUMN "approvedAt" DATETIME;
ALTER TABLE "subtasks" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "subtasks" ADD COLUMN "rejectedAt" DATETIME;
ALTER TABLE "subtasks" ADD COLUMN "rejectedBy" TEXT;
ALTER TABLE "subtasks" ADD COLUMN "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "subtaskId" TEXT,
    CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "activity_logs_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "subtasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
