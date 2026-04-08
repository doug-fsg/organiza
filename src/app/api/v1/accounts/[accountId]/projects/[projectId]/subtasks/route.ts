import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiNotFound, apiError } from '@/lib/api-external/response'
import { prisma } from '@/lib/prisma'
import { Priority, MainTaskStatus } from '@prisma/client'
import { dispatchWebhooks, webhookClientFromMainTask } from '@/lib/webhook-dispatch'

const priorityMap: Record<string, Priority> = {
  low: Priority.LOW,
  medium: Priority.MEDIUM,
  high: Priority.HIGH,
  urgent: Priority.URGENT,
}

/**
 * GET /api/v1/accounts/{account_id}/projects/{project_id}/subtasks
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; projectId: string }> }
) {
  const { accountId, projectId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const project = await prisma.mainTask.findFirst({
    where: { id: projectId, accountId },
    include: {
      client: { select: { id: true, name: true, email: true } },
    },
  })
  if (!project) return apiNotFound('Projeto não encontrado')

  const subtasks = await prisma.subtask.findMany({
    where: { mainTaskId: projectId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const clientPayload = webhookClientFromMainTask(project)

  const payload = subtasks.map((s) => ({
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status.toLowerCase(),
    priority: s.priority.toLowerCase(),
    deadline: s.deadline,
    assigned_to: s.assignedTo,
    estimated_hours: s.estimatedHours,
    actual_hours: s.actualHours,
    client_id: clientPayload.clientId,
    client: clientPayload.client,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  }))

  return apiSuccess(payload, { count: payload.length })
}

/**
 * POST /api/v1/accounts/{account_id}/projects/{project_id}/subtasks
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; projectId: string }> }
) {
  const { accountId, projectId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const project = await prisma.mainTask.findFirst({
    where: { id: projectId, accountId },
    include: {
      client: { select: { id: true, name: true, email: true } },
    },
  })
  if (!project) return apiNotFound('Projeto não encontrado')

  let body: {
    title: string
    description?: string
    priority?: string
    deadline?: string
    assigned_to_id?: string
    estimated_hours?: number
  }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  if (!body?.title?.trim()) {
    return apiError('title é obrigatório', 400)
  }

  const priority = body.priority && priorityMap[body.priority.toLowerCase()]
    ? priorityMap[body.priority.toLowerCase()]
    : Priority.MEDIUM

  const subtask = await prisma.subtask.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority,
      deadline: body.deadline ? new Date(body.deadline) : null,
      assignedToId: body.assigned_to_id || null,
      estimatedHours: body.estimated_hours ?? null,
      mainTaskId: projectId,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
  })

  // Atualizar status do projeto se NOT_STARTED
  await prisma.mainTask.updateMany({
    where: { id: projectId, status: MainTaskStatus.NOT_STARTED },
    data: { status: MainTaskStatus.IN_PROGRESS },
  })

  void dispatchWebhooks(accountId, 'task.created', {
    taskId: subtask.id,
    mainTaskId: projectId,
    title: subtask.title,
    status: subtask.status,
    assignedToId: subtask.assignedToId,
    assignedTo: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
    createdAt: subtask.createdAt.toISOString(),
    ...webhookClientFromMainTask(project),
  })

  const clientOut = webhookClientFromMainTask(project)

  return apiSuccess({
    id: subtask.id,
    title: subtask.title,
    description: subtask.description,
    status: subtask.status.toLowerCase(),
    priority: subtask.priority.toLowerCase(),
    deadline: subtask.deadline,
    assigned_to: subtask.assignedTo,
    estimated_hours: subtask.estimatedHours,
    client_id: clientOut.clientId,
    client: clientOut.client,
    created_at: subtask.createdAt,
    updated_at: subtask.updatedAt,
  })
}
