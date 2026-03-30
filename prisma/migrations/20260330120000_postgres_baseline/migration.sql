-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'SUPPLIER', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MainTaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubtaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED_PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('SUBTASK_CREATED', 'SUBTASK_STARTED', 'SUBTASK_PAUSED', 'SUBTASK_RESUMED', 'SUBTASK_COMPLETED', 'SUBTASK_BLOCKED', 'SUBTASK_UNBLOCKED', 'SUBTASK_APPROVED', 'SUBTASK_REJECTED', 'SUBTASK_REASSIGNED', 'DEPENDENCY_ADDED', 'DEPENDENCY_REMOVED', 'ESTIMATE_UPDATED', 'COMMENT_ADDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('SUBTASK_ASSIGNED', 'SUBTASK_COMPLETED', 'SUBTASK_APPROVED', 'SUBTASK_REJECTED', 'SUBTASK_BLOCKED', 'SUBTASK_UNBLOCKED', 'SUBTASK_PENDING_APPROVAL', 'SUBTASK_REASSIGNED', 'GENERAL', 'SERVICE_PAYMENT_CREATED', 'SERVICE_PAYMENT_APPROVED', 'SERVICE_PAYMENT_REJECTED', 'SERVICE_PAYMENT_PAID');

-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "ServicePaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "CustomAttributeType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'FILE', 'ACTION_BUTTON');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_users" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "main_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MainTaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "subtaskTemplateId" TEXT,
    "clientId" TEXT,

    CONSTRAINT "main_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SubtaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "deadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "estimatedHours" INTEGER,
    "actualHours" INTEGER,
    "mainTaskId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "approvedBy" TEXT,
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringType" "RecurringType",
    "recurringInterval" INTEGER,
    "recurringWeekDays" TEXT,
    "recurringMonthDays" TEXT,
    "recurringEndDate" TIMESTAMP(3),
    "skipWeekends" BOOLEAN NOT NULL DEFAULT false,
    "skipHolidays" BOOLEAN NOT NULL DEFAULT false,
    "recurringDay" INTEGER,
    "recurringWeekDay" "WeekDay",
    "lastReopenedAt" TIMESTAMP(3),
    "nextReopenAt" TIMESTAMP(3),
    "checklistItems" TEXT,
    "activeActionButtonId" TEXT,

    CONSTRAINT "subtasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtask_dependencies" (
    "id" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "blockedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subtask_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subtaskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "readBy" TEXT,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_attachments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "subtaskId" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_payments" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "status" "ServicePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "accountId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "paidById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "service_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_payment_attachments" (
    "id" TEXT NOT NULL,
    "servicePaymentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "service_payment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_payment_receipts" (
    "id" TEXT NOT NULL,
    "servicePaymentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "service_payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_users" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_tasks" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "mainTaskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtask_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stagesData" TEXT NOT NULL,

    CONSTRAINT "subtask_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_custom_attributes" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomAttributeType" NOT NULL DEFAULT 'TEXT',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_custom_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "customValues" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_field_definitions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomAttributeType" NOT NULL,
    "color" TEXT,
    "projectIds" TEXT,
    "options" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_field_values" (
    "id" TEXT NOT NULL,
    "fieldDefId" TEXT NOT NULL,
    "subtaskId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_actions" (
    "id" TEXT NOT NULL,
    "fieldDefId" TEXT NOT NULL,
    "triggerCondition" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actionPayload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_slug_key" ON "accounts"("slug");

-- CreateIndex
CREATE INDEX "webhooks_accountId_idx" ON "webhooks"("accountId");

-- CreateIndex
CREATE INDEX "api_keys_accountId_idx" ON "api_keys"("accountId");

-- CreateIndex
CREATE INDEX "api_keys_keyPrefix_idx" ON "api_keys"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "account_users_userId_accountId_key" ON "account_users"("userId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "main_tasks_accountId_idx" ON "main_tasks"("accountId");

-- CreateIndex
CREATE INDEX "main_tasks_subtaskTemplateId_idx" ON "main_tasks"("subtaskTemplateId");

-- CreateIndex
CREATE INDEX "main_tasks_clientId_idx" ON "main_tasks"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "subtask_dependencies_dependentId_blockedById_key" ON "subtask_dependencies"("dependentId", "blockedById");

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_token_key" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_token_idx" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_email_idx" ON "user_invites"("email");

-- CreateIndex
CREATE INDEX "service_payments_accountId_idx" ON "service_payments"("accountId");

-- CreateIndex
CREATE INDEX "service_payments_supplierId_idx" ON "service_payments"("supplierId");

-- CreateIndex
CREATE INDEX "service_payments_status_idx" ON "service_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_payment_receipts_servicePaymentId_key" ON "service_payment_receipts"("servicePaymentId");

-- CreateIndex
CREATE INDEX "departments_accountId_idx" ON "departments"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "department_users_departmentId_userId_key" ON "department_users"("departmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "department_tasks_departmentId_mainTaskId_key" ON "department_tasks"("departmentId", "mainTaskId");

-- CreateIndex
CREATE INDEX "subtask_templates_accountId_idx" ON "subtask_templates"("accountId");

-- CreateIndex
CREATE INDEX "client_custom_attributes_accountId_idx" ON "client_custom_attributes"("accountId");

-- CreateIndex
CREATE INDEX "clients_accountId_idx" ON "clients"("accountId");

-- CreateIndex
CREATE INDEX "task_field_definitions_accountId_idx" ON "task_field_definitions"("accountId");

-- CreateIndex
CREATE INDEX "task_field_values_fieldDefId_idx" ON "task_field_values"("fieldDefId");

-- CreateIndex
CREATE INDEX "task_field_values_subtaskId_idx" ON "task_field_values"("subtaskId");

-- CreateIndex
CREATE UNIQUE INDEX "task_field_values_fieldDefId_subtaskId_key" ON "task_field_values"("fieldDefId", "subtaskId");

-- CreateIndex
CREATE INDEX "field_actions_fieldDefId_idx" ON "field_actions"("fieldDefId");

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_users" ADD CONSTRAINT "account_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_users" ADD CONSTRAINT "account_users_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_tasks" ADD CONSTRAINT "main_tasks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_tasks" ADD CONSTRAINT "main_tasks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_tasks" ADD CONSTRAINT "main_tasks_subtaskTemplateId_fkey" FOREIGN KEY ("subtaskTemplateId") REFERENCES "subtask_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "main_tasks" ADD CONSTRAINT "main_tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_mainTaskId_fkey" FOREIGN KEY ("mainTaskId") REFERENCES "main_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtasks" ADD CONSTRAINT "subtasks_activeActionButtonId_fkey" FOREIGN KEY ("activeActionButtonId") REFERENCES "task_field_definitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtask_dependencies" ADD CONSTRAINT "subtask_dependencies_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtask_dependencies" ADD CONSTRAINT "subtask_dependencies_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payment_attachments" ADD CONSTRAINT "service_payment_attachments_servicePaymentId_fkey" FOREIGN KEY ("servicePaymentId") REFERENCES "service_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_payment_receipts" ADD CONSTRAINT "service_payment_receipts_servicePaymentId_fkey" FOREIGN KEY ("servicePaymentId") REFERENCES "service_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_users" ADD CONSTRAINT "department_users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_users" ADD CONSTRAINT "department_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_tasks" ADD CONSTRAINT "department_tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_tasks" ADD CONSTRAINT "department_tasks_mainTaskId_fkey" FOREIGN KEY ("mainTaskId") REFERENCES "main_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subtask_templates" ADD CONSTRAINT "subtask_templates_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_custom_attributes" ADD CONSTRAINT "client_custom_attributes_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_field_definitions" ADD CONSTRAINT "task_field_definitions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_field_values" ADD CONSTRAINT "task_field_values_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "task_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_field_values" ADD CONSTRAINT "task_field_values_subtaskId_fkey" FOREIGN KEY ("subtaskId") REFERENCES "subtasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_actions" ADD CONSTRAINT "field_actions_fieldDefId_fkey" FOREIGN KEY ("fieldDefId") REFERENCES "task_field_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

