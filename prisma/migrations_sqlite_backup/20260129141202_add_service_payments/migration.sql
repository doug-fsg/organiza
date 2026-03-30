-- CreateTable
CREATE TABLE "service_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "condominium" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "service_payment_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicePaymentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    CONSTRAINT "service_payment_attachments_servicePaymentId_fkey" FOREIGN KEY ("servicePaymentId") REFERENCES "service_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_payment_receipts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "servicePaymentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,
    CONSTRAINT "service_payment_receipts_servicePaymentId_fkey" FOREIGN KEY ("servicePaymentId") REFERENCES "service_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "service_payments_accountId_idx" ON "service_payments"("accountId");

-- CreateIndex
CREATE INDEX "service_payments_supplierId_idx" ON "service_payments"("supplierId");

-- CreateIndex
CREATE INDEX "service_payments_status_idx" ON "service_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_payment_receipts_servicePaymentId_key" ON "service_payment_receipts"("servicePaymentId");
