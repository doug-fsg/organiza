import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiError, apiNotFound } from '@/lib/api-external/response'
import { createProjectFromSubtaskTemplate } from '@/lib/project-from-subtask-template'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/v1/accounts/{account_id}/projects/from-template
 * Cria projeto a partir de um modelo de subtarefas (mesma lógica do app).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  let body: {
    subtask_template_id: string
    title: string
    description?: string
    client_id?: string
    department_ids?: string[]
    assigned_users?: Record<string, string>
  }

  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  if (!body?.subtask_template_id?.trim()) {
    return apiError('subtask_template_id é obrigatório', 400)
  }
  if (!body?.title?.trim()) {
    return apiError('title é obrigatório', 400)
  }

  let project
  try {
    project = await createProjectFromSubtaskTemplate(prisma, accountId, auth.userId, {
      subtaskTemplateId: body.subtask_template_id.trim(),
      projectTitle: body.title.trim(),
      projectDescription: body.description,
      clientId: body.client_id || null,
      departmentIds: body.department_ids,
      assignedUsers: body.assigned_users,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar projeto'
    return apiError(msg, 400)
  }

  if (!project) {
    return apiNotFound('Modelo não encontrado ou não pertence a esta conta')
  }

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
