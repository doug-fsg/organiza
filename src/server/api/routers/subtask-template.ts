import { z } from 'zod'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole, Priority, MainTaskStatus } from '@prisma/client'

// Etapa do modelo de subtarefas
const stageSchema = z.object({
  title: z.string().min(1, 'Nome da etapa é obrigatório'),
  description: z.string().optional(),
  requiresApproval: z.boolean().default(true),
  assignedToId: z.string().optional(),
  departmentId: z.string().optional(),
})

export const subtaskTemplateRouter = createTRPCRouter({
  // Criar modelo a partir de um projeto existente (extrai subtarefas como etapas)
  createFromMainTask: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        description: z.string().optional(),
        mainTaskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts?.find(
        (acc: { accountId: string }) => acc.accountId === ctx.session.user.activeAccountId
      )
      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas gerentes ou superiores podem criar modelos',
        })
      }

      const mainTask = await ctx.prisma.mainTask.findUnique({
        where: { id: input.mainTaskId },
        include: { subtasks: { orderBy: { createdAt: 'asc' } } },
      })

      if (!mainTask || mainTask.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projeto não encontrado',
        })
      }

      const stages = mainTask.subtasks.map((s) => ({
        title: s.title,
        description: s.description ?? undefined,
        requiresApproval: s.requiresApproval,
        assignedToId: s.assignedToId ?? undefined,
        departmentId: undefined,
      }))

      return ctx.prisma.subtaskTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          accountId: ctx.accountId,
          stagesData: JSON.stringify(stages),
        },
      })
    }),

  // Criar modelo manualmente (apenas etapas)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        description: z.string().optional(),
        stages: z.array(stageSchema).min(2, 'Mínimo 2 etapas'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts?.find(
        (acc: { accountId: string }) => acc.accountId === ctx.session.user.activeAccountId
      )
      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas gerentes ou superiores podem criar modelos',
        })
      }

      return ctx.prisma.subtaskTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          accountId: ctx.accountId,
          stagesData: JSON.stringify(input.stages),
        },
      })
    }),

  // Listar todos os modelos da conta
  getAll: accountProcedure.query(({ ctx }) => {
    return ctx.prisma.subtaskTemplate.findMany({
      where: { accountId: ctx.accountId },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Buscar modelo por ID
  getById: accountProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const model = await ctx.prisma.subtaskTemplate.findUnique({
        where: { id: input.id },
      })
      if (!model || model.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Modelo não encontrado',
        })
      }
      return {
        ...model,
        stages: JSON.parse(model.stagesData),
      }
    }),

  // Atualizar modelo
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        stages: z.array(stageSchema).min(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts?.find(
        (acc: { accountId: string }) => acc.accountId === ctx.session.user.activeAccountId
      )
      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' })
      }

      const existing = await ctx.prisma.subtaskTemplate.findUnique({
        where: { id: input.id },
      })
      if (!existing || existing.accountId !== ctx.accountId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Modelo não encontrado' })
      }

      return ctx.prisma.subtaskTemplate.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          ...(input.stages && { stagesData: JSON.stringify(input.stages) }),
        },
      })
    }),

  // Deletar modelo
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts?.find(
        (acc: { accountId: string }) => acc.accountId === ctx.session.user.activeAccountId
      )
      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' })
      }

      const existing = await ctx.prisma.subtaskTemplate.findUnique({
        where: { id: input.id },
      })
      if (!existing || existing.accountId !== ctx.accountId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Modelo não encontrado' })
      }

      return ctx.prisma.subtaskTemplate.delete({
        where: { id: input.id },
      })
    }),

  // Criar novo projeto com etapas do modelo
  createProjectFromModel: accountProcedure
    .input(
      z.object({
        subtaskTemplateId: z.string(),
        projectTitle: z.string().min(1, 'Título do projeto é obrigatório'),
        projectDescription: z.string().optional(),
        departmentIds: z.array(z.string()).optional(),
        assignedUsers: z.record(z.number(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts?.find(
        (acc: { accountId: string }) => acc.accountId === ctx.session.user.activeAccountId
      )
      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas gerentes ou superiores podem criar projetos',
        })
      }

      const model = await ctx.prisma.subtaskTemplate.findUnique({
        where: { id: input.subtaskTemplateId },
      })
      if (!model || model.accountId !== ctx.accountId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Modelo não encontrado' })
      }

      const stages = JSON.parse(model.stagesData) as Array<{
        title: string
        description?: string
        requiresApproval?: boolean
        assignedToId?: string
        departmentId?: string
      }>

      const mainTask = await ctx.prisma.mainTask.create({
        data: {
          title: input.projectTitle,
          description: input.projectDescription,
          priority: Priority.MEDIUM,
          createdBy: ctx.userId!,
          accountId: ctx.accountId,
          subtaskTemplateId: model.id,
        },
      })

      const resolveAssignedToId = (stage: { assignedToId?: string }, index: number): string | undefined => {
        const fromStage = stage.assignedToId
        if (typeof fromStage === 'string' && fromStage.trim() && fromStage !== '__none__') {
          return fromStage.trim()
        }
        return input.assignedUsers?.[index]
      }

      const createdSubtasks = await Promise.all(
        stages.map(async (stage: any, index: number) =>
          ctx.prisma.subtask.create({
            data: {
              title: stage.title,
              description: stage.description,
              requiresApproval: stage.requiresApproval ?? true,
              priority: Priority.MEDIUM,
              mainTaskId: mainTask.id,
              assignedToId: resolveAssignedToId(stage, index),
            },
          })
        )
      )

      for (let i = 1; i < createdSubtasks.length; i++) {
        await ctx.prisma.subtaskDependency.create({
          data: {
            dependentId: createdSubtasks[i].id,
            blockedById: createdSubtasks[i - 1].id,
          },
        })
      }

      const deptIdsFromStages = [...new Set(stages.map((s) => s.departmentId).filter(Boolean) as string[])]
      const allDeptIds = [...new Set([...(input.departmentIds ?? []), ...deptIdsFromStages])]
      if (allDeptIds.length) {
        await Promise.all(
          allDeptIds.map((departmentId) =>
            ctx.prisma.departmentTask.create({
              data: { departmentId, mainTaskId: mainTask.id },
            })
          )
        )
      }

      return mainTask
    }),

  // Aplicar modelo em projeto existente (adiciona etapas)
  applyToExistingProject: accountProcedure
    .input(
      z.object({
        subtaskTemplateId: z.string(),
        mainTaskId: z.string(),
        assignedUsers: z.record(z.number(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts?.find(
        (acc: { accountId: string }) => acc.accountId === ctx.session.user.activeAccountId
      )
      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas gerentes ou superiores podem aplicar modelos',
        })
      }

      const model = await ctx.prisma.subtaskTemplate.findUnique({
        where: { id: input.subtaskTemplateId },
      })
      if (!model || model.accountId !== ctx.accountId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Modelo não encontrado' })
      }

      const mainTask = await ctx.prisma.mainTask.findUnique({
        where: { id: input.mainTaskId },
        include: { subtasks: { orderBy: { createdAt: 'asc' } } },
      })
      if (!mainTask || mainTask.accountId !== ctx.accountId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Projeto não encontrado' })
      }

      const stages = JSON.parse(model.stagesData) as Array<{
        title: string
        description?: string
        requiresApproval?: boolean
        assignedToId?: string
        departmentId?: string
      }>

      // Remove todas as subtarefas existentes (substitui pelo modelo)
      await ctx.prisma.subtask.deleteMany({
        where: { mainTaskId: mainTask.id },
      })

      const resolveAssignedToId = (stage: { assignedToId?: string }, index: number): string | undefined => {
        const fromStage = stage.assignedToId
        if (typeof fromStage === 'string' && fromStage.trim() && fromStage !== '__none__') {
          return fromStage.trim()
        }
        return input.assignedUsers?.[index]
      }

      const createdSubtasks = await Promise.all(
        stages.map(async (stage: any, index: number) =>
          ctx.prisma.subtask.create({
            data: {
              title: stage.title,
              description: stage.description,
              requiresApproval: stage.requiresApproval ?? true,
              priority: Priority.MEDIUM,
              mainTaskId: mainTask.id,
              assignedToId: resolveAssignedToId(stage, index),
            },
          })
        )
      )

      const deptIdsFromStages = [...new Set(stages.map((s) => s.departmentId).filter(Boolean) as string[])]
      if (deptIdsFromStages.length) {
        const existing = await ctx.prisma.departmentTask.findMany({
          where: { mainTaskId: mainTask.id },
          select: { departmentId: true },
        })
        const existingIds = new Set(existing.map((e) => e.departmentId))
        const toAdd = deptIdsFromStages.filter((id) => !existingIds.has(id))
        if (toAdd.length) {
          await Promise.all(
            toAdd.map((departmentId) =>
              ctx.prisma.departmentTask.create({
                data: { departmentId, mainTaskId: mainTask.id },
              })
            )
          )
        }
      }

      for (let i = 1; i < createdSubtasks.length; i++) {
        await ctx.prisma.subtaskDependency.create({
          data: {
            dependentId: createdSubtasks[i].id,
            blockedById: createdSubtasks[i - 1].id,
          },
        })
      }

      await ctx.prisma.mainTask.update({
        where: { id: mainTask.id },
        data: {
          subtaskTemplateId: model.id,
          status: MainTaskStatus.IN_PROGRESS,
        },
      })

      return mainTask
    }),
})
