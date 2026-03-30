import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiError } from '@/lib/api-external/response'
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
 * GET /api/v1/accounts/{account_id}/projects
 * Lista projetos (MainTasks) da conta.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const clientId = searchParams.get('client_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const where: Record<string, unknown> = { accountId }
  if (status && statusMap[status]) where.status = statusMap[status]
  if (clientId) where.clientId = clientId

  const [projects, total] = await Promise.all([
    prisma.mainTask.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, email: true } },
        client: { select: { id: true, name: true, email: true } },
        subtasks: {
          include: { assignedTo: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.mainTask.count({ where }),
  ])

  const payload = projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status.toLowerCase(),
    priority: p.priority.toLowerCase(),
    deadline: p.deadline,
    client_id: p.clientId,
    client: p.client
      ? { id: p.client.id, name: p.client.name, email: p.client.email }
      : null,
    creator: p.creator,
    subtasks_count: p.subtasks.length,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }))

  return apiSuccess(payload, { count: total })
}

/**
 * POST /api/v1/accounts/{account_id}/projects
 * Cria um novo projeto.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  let body: { title: string; description?: string; priority?: string; deadline?: string; client_id?: string }
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

  const project = await prisma.mainTask.create({
    data: {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      priority,
      deadline: body.deadline ? new Date(body.deadline) : null,
      clientId: body.client_id || null,
      createdBy: auth.userId,
      accountId,
    },
    include: {
      creator: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  void dispatchWebhooks(accountId, 'project.created', {
    projectId: project.id,
    title: project.title,
    status: project.status,
    clientId: project.clientId,
    createdAt: project.createdAt.toISOString(),
  })

  return apiSuccess({
    id: project.id,
    title: project.title,
    description: project.description,
    status: project.status.toLowerCase(),
    priority: project.priority.toLowerCase(),
    deadline: project.deadline,
    client_id: project.clientId,
    client: project.client,
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  })
}
