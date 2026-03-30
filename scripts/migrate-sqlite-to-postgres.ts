/**
 * Copia dados de prisma/dev.db (SQLite) para o PostgreSQL em DATABASE_URL (.env).
 * Pré-requisito: pnpm prisma migrate deploy (esquema vazio ou use --force).
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

function loadDotenv() {
  const envPath = path.join(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

loadDotenv()

const BOOLEAN_FIELDS = new Set([
  'requiresApproval',
  'isRecurring',
  'skipWeekends',
  'skipHolidays',
  'read',
])

function isDateField(key: string): boolean {
  if (key === 'deadline' || key === 'serviceDate' || key === 'emailVerified') return true
  if (key.endsWith('At')) return true
  if (key.endsWith('Date')) return true
  return false
}

function normalizeSqliteRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue
    if (value === null) {
      out[key] = null
      continue
    }
    if (BOOLEAN_FIELDS.has(key) && (value === 0 || value === 1)) {
      out[key] = Boolean(value)
      continue
    }
    if (isDateField(key) && typeof value === 'number') {
      out[key] = new Date(value)
      continue
    }
    out[key] = value
  }
  return out
}

const TRUNCATE_APP_TABLES = `
TRUNCATE TABLE
  "field_actions",
  "task_field_values",
  "service_payment_receipts",
  "service_payment_attachments",
  "service_payments",
  "comment_attachments",
  "comments",
  "subtask_dependencies",
  "subtasks",
  "department_tasks",
  "activity_logs",
  "notifications",
  "main_tasks",
  "department_users",
  "user_invites",
  "departments",
  "account_users",
  "webhooks",
  "api_keys",
  "task_field_definitions",
  "clients",
  "client_custom_attributes",
  "subtask_templates",
  "accounts",
  "users"
RESTART IDENTITY CASCADE;
`

async function main() {
  const force = process.argv.includes('--force')
  const sqlitePath = path.join(process.cwd(), 'prisma', 'dev.db')
  if (!existsSync(sqlitePath)) {
    console.error(`Arquivo não encontrado: ${sqlitePath}`)
    process.exit(1)
  }

  const sqlite = new Database(sqlitePath, { readonly: true })
  const prisma = new PrismaClient()

  const userCount = await prisma.user.count()
  if (userCount > 0 && !force) {
    console.error(
      'O PostgreSQL já tem dados. Use --force para truncar tabelas de app e reimportar (não apaga _prisma_migrations).',
    )
    process.exit(1)
  }

  type Pair = { table: string; label: string }
  const order: Pair[] = [
    { table: 'users', label: 'User' },
    { table: 'accounts', label: 'Account' },
    { table: 'subtask_templates', label: 'SubtaskTemplate' },
    { table: 'clients', label: 'Client' },
    { table: 'client_custom_attributes', label: 'ClientCustomAttribute' },
    { table: 'departments', label: 'Department' },
    { table: 'task_field_definitions', label: 'TaskFieldDefinition' },
    { table: 'api_keys', label: 'ApiKey' },
    { table: 'webhooks', label: 'Webhook' },
    { table: 'account_users', label: 'AccountUser' },
    { table: 'main_tasks', label: 'MainTask' },
    { table: 'department_tasks', label: 'DepartmentTask' },
    { table: 'subtasks', label: 'Subtask' },
    { table: 'subtask_dependencies', label: 'SubtaskDependency' },
    { table: 'comments', label: 'Comment' },
    { table: 'comment_attachments', label: 'CommentAttachment' },
    { table: 'notifications', label: 'Notification' },
    { table: 'activity_logs', label: 'ActivityLog' },
    { table: 'user_invites', label: 'UserInvite' },
    { table: 'service_payments', label: 'ServicePayment' },
    { table: 'service_payment_attachments', label: 'ServicePaymentAttachment' },
    { table: 'service_payment_receipts', label: 'ServicePaymentReceipt' },
    { table: 'department_users', label: 'DepartmentUser' },
    { table: 'task_field_values', label: 'TaskFieldValue' },
    { table: 'field_actions', label: 'FieldAction' },
  ]

  await prisma.$transaction(
    async (tx) => {
      if (force && userCount > 0) {
        console.log('Truncando tabelas de aplicação (--force)...')
        await tx.$executeRawUnsafe(TRUNCATE_APP_TABLES)
      }

      const txDelegates: Record<
        string,
        { createMany: (args: { data: unknown[] }) => Promise<unknown> }
      > = {
        User: tx.user,
        Account: tx.account,
        SubtaskTemplate: tx.subtaskTemplate,
        Client: tx.client,
        ClientCustomAttribute: tx.clientCustomAttribute,
        Department: tx.department,
        TaskFieldDefinition: tx.taskFieldDefinition,
        ApiKey: tx.apiKey,
        Webhook: tx.webhook,
        AccountUser: tx.accountUser,
        MainTask: tx.mainTask,
        DepartmentTask: tx.departmentTask,
        Subtask: tx.subtask,
        SubtaskDependency: tx.subtaskDependency,
        Comment: tx.comment,
        CommentAttachment: tx.commentAttachment,
        Notification: tx.notification,
        ActivityLog: tx.activityLog,
        UserInvite: tx.userInvite,
        ServicePayment: tx.servicePayment,
        ServicePaymentAttachment: tx.servicePaymentAttachment,
        ServicePaymentReceipt: tx.servicePaymentReceipt,
        DepartmentUser: tx.departmentUser,
        TaskFieldValue: tx.taskFieldValue,
        FieldAction: tx.fieldAction,
      }

      for (const { table, label } of order) {
        const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<
          string,
          unknown
        >[]
        if (rows.length === 0) {
          console.log(`${label}: 0 linhas`)
          continue
        }
        const data = rows.map((r) => normalizeSqliteRow(r))
        await txDelegates[label].createMany({ data: data as never })
        console.log(`${label}: ${rows.length} linhas`)
      }
    },
    { timeout: 300_000 },
  )

  sqlite.close()
  await prisma.$disconnect()

  console.log('Migração SQLite → PostgreSQL concluída.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
