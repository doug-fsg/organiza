import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiNotFound, apiError } from '@/lib/api-external/response'
import { prisma } from '@/lib/prisma'
import { webhookClientFromMainTask } from '@/lib/webhook-dispatch'
import {
  parseChecklistFromDb,
  validateChecklistItemsInput,
  serializeChecklistItems,
} from '@/lib/api-external/checklist'

function subtaskPayload(
  s: {
    id: string
    title: string
    description: string | null
    status: { toString: () => string }
    priority: { toString: () => string }
    deadline: Date | null
    estimatedHours: number | null
    actualHours: number | null
    checklistItems: string | null
    assignedTo: { id: string; name: string; email: string | null } | null
    createdAt: Date
    updatedAt: Date
  },
  clientPayload: ReturnType<typeof webhookClientFromMainTask>
) {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status.toString().toLowerCase(),
    priority: s.priority.toString().toLowerCase(),
    deadline: s.deadline,
    assigned_to: s.assignedTo,
    estimated_hours: s.estimatedHours,
    actual_hours: s.actualHours,
    checklist_items: parseChecklistFromDb(s.checklistItems),
    client_id: clientPayload.clientId,
    client: clientPayload.client,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  }
}

/**
 * GET /api/v1/accounts/{account_id}/projects/{project_id}/subtasks/{subtask_id}
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ accountId: string; projectId: string; subtaskId: string }> }
) {
  const { accountId, projectId, subtaskId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const subtask = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      mainTaskId: projectId,
      mainTask: { accountId },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      mainTask: {
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!subtask) return apiNotFound('Subtarefa não encontrada')

  const clientPayload = webhookClientFromMainTask(subtask.mainTask)

  return apiSuccess(subtaskPayload(subtask, clientPayload))
}

/**
 * PATCH /api/v1/accounts/{account_id}/projects/{project_id}/subtasks/{subtask_id}
 * Atualiza checklist (substituição completa do array).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; projectId: string; subtaskId: string }> }
) {
  const { accountId, projectId, subtaskId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const existing = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      mainTaskId: projectId,
      mainTask: { accountId },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      mainTask: {
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!existing) return apiNotFound('Subtarefa não encontrada')

  let body: { checklist_items?: unknown }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  if (!('checklist_items' in body)) {
    return apiError('checklist_items é obrigatório', 400)
  }

  const raw = body.checklist_items
  let checklistDb: string | null
  if (raw === null) {
    checklistDb = null
  } else {
    const v = validateChecklistItemsInput(raw)
    if (!v.ok) return apiError(v.message, 400)
    checklistDb = serializeChecklistItems(v.items)
  }

  const subtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: { checklistItems: checklistDb },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      mainTask: {
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  const clientPayload = webhookClientFromMainTask(subtask.mainTask)

  return apiSuccess(subtaskPayload(subtask, clientPayload))
}
