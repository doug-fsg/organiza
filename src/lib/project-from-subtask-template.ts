import type { PrismaClient } from '@prisma/client'
import { Priority } from '@prisma/client'

export type TemplateStageJson = {
  title: string
  description?: string
  requiresApproval?: boolean
  assignedToId?: string
  departmentId?: string
}

export type CreateProjectFromTemplateParams = {
  subtaskTemplateId: string
  projectTitle: string
  projectDescription?: string | null
  clientId?: string | null
  departmentIds?: string[]
  /** Índice da etapa (string ou número como chave JSON) → userId */
  assignedUsers?: Record<string, string>
}

function parseStages(json: string): TemplateStageJson[] {
  const data = JSON.parse(json) as unknown
  if (!Array.isArray(data)) {
    throw new Error('stagesData inválido: esperado array')
  }
  return data as TemplateStageJson[]
}

function resolveAssignedToId(
  stage: TemplateStageJson,
  index: number,
  assignedUsers?: Record<string, string>
): string | undefined {
  const fromStage = stage.assignedToId
  if (typeof fromStage === 'string' && fromStage.trim() && fromStage !== '__none__') {
    return fromStage.trim()
  }
  return assignedUsers?.[String(index)]
}

/**
 * Cria um MainTask a partir de um SubtaskTemplate (etapas em sequência com dependências).
 * Retorna null se o modelo não existir ou não pertencer à conta.
 */
export async function createProjectFromSubtaskTemplate(
  db: PrismaClient,
  accountId: string,
  createdByUserId: string,
  input: CreateProjectFromTemplateParams
) {
  const model = await db.subtaskTemplate.findUnique({
    where: { id: input.subtaskTemplateId },
  })
  if (!model || model.accountId !== accountId) {
    return null
  }

  let stages: TemplateStageJson[]
  try {
    stages = parseStages(model.stagesData)
  } catch {
    throw new Error('Modelo corrompido: stagesData não é um JSON válido')
  }

  const mainTask = await db.mainTask.create({
    data: {
      title: input.projectTitle,
      description: input.projectDescription?.trim() || null,
      priority: Priority.MEDIUM,
      createdBy: createdByUserId,
      accountId,
      subtaskTemplateId: model.id,
      clientId: input.clientId?.trim() || null,
    },
    include: {
      creator: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
    },
  })

  const createdSubtasks = await Promise.all(
    stages.map(async (stage, index) =>
      db.subtask.create({
        data: {
          title: stage.title,
          description: stage.description ?? null,
          requiresApproval: stage.requiresApproval ?? true,
          priority: Priority.MEDIUM,
          mainTaskId: mainTask.id,
          assignedToId: resolveAssignedToId(stage, index, input.assignedUsers) ?? null,
        },
      })
    )
  )

  for (let i = 1; i < createdSubtasks.length; i++) {
    await db.subtaskDependency.create({
      data: {
        dependentId: createdSubtasks[i].id,
        blockedById: createdSubtasks[i - 1].id,
      },
    })
  }

  const deptIdsFromStages = [
    ...new Set(stages.map((s) => s.departmentId).filter(Boolean) as string[]),
  ]
  const allDeptIds = [...new Set([...(input.departmentIds ?? []), ...deptIdsFromStages])]
  if (allDeptIds.length) {
    await Promise.all(
      allDeptIds.map((departmentId) =>
        db.departmentTask.create({
          data: { departmentId, mainTaskId: mainTask.id },
        })
      )
    )
  }

  return mainTask
}
