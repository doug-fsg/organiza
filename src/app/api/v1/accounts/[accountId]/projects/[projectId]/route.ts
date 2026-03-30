import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiNotFound, apiError } from '@/lib/api-external/response'
import { prisma } from '@/lib/prisma'
import { MainTaskStatus, Priority } from '@prisma/client'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

const statusMap: Record<string, MainTaskStatus> = {
  not_started: MainTaskStatus.NOT_STARTED,
  in_progress: MainTaskStatus.IN_PROGRESS,
  completed: MainTaskStatus.COMPLETED,
  cancelled: MainTaskStatus.CANCELLED,
}

const priorityMap: Record<string, Priority> = {
  low: Priority.LOW,
  medium: Priority.MEDIUM,
  high: Priority.HIGH,
  urgent: Priority.URGENT,
}

/**
 * GET /api/v1/accounts/{account_id}/projects/{project_id}
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
      creator: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, name: true, email: true } },
      subtasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  })

  if (!project) return apiNotFound('Projeto não encontrado')

  return apiSuccess({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status.toLowerCase(),
    priority: project.priority.toLowerCase(),
    deadline: project.deadline,
    client_id: project.clientId,
    client: project.client,
    creator: project.creator,
    subtasks: project.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status.toLowerCase(),
      assigned_to: s.assignedTo,
    })),
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  })
}

/**
 * PATCH /api/v1/accounts/{account_id}/projects/{project_id}
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; projectId: string }> }
) {
  const { accountId, projectId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const existing = await prisma.mainTask.findFirst({
    where: { id: projectId, accountId },
  })
  if (!existing) return apiNotFound('Projeto não encontrado')

  let body: { title?: string; description?: string; status?: string; priority?: string; deadline?: string; client_id?: string }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title.trim()
  if (body.description !== undefined) data.description = body.description?.trim() || null
  if (body.status && statusMap[body.status.toLowerCase()]) {
    data.status = statusMap[body.status.toLowerCase()]
  }
  if (body.priority && priorityMap[body.priority.toLowerCase()]) {
    data.priority = priorityMap[body.priority.toLowerCase()]
  }
  if (body.deadline !== undefined) data.deadline = body.deadline ? new Date(body.deadline) : null
  if (body.client_id !== undefined) data.clientId = body.client_id || null

  const project = await prisma.mainTask.update({
    where: { id: projectId },
    data,
    include: {
      creator: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  void dispatchWebhooks(accountId, 'project.updated', {
    projectId: project.id,
    title: project.title,
    status: project.status,
    clientId: project.clientId,
    updatedAt: project.updatedAt.toISOString(),
  })

  return apiSuccess({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status.toLowerCase(),
    priority: project.priority.toLowerCase(),
    deadline: project.deadline,
    client_id: project.clientId,
    updated_at: project.updatedAt,
  })
}

/**
 * DELETE /api/v1/accounts/{account_id}/projects/{project_id}
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; projectId: string }> }
) {
  const { accountId, projectId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const existing = await prisma.mainTask.findFirst({
    where: { id: projectId, accountId },
  })
  if (!existing) return apiNotFound('Projeto não encontrado')

  await prisma.mainTask.delete({ where: { id: projectId } })

  void dispatchWebhooks(accountId, 'project.deleted', {
    projectId: existing.id,
    title: existing.title,
  })

  return apiSuccess({ success: true })
}
