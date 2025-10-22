import { z } from 'zod'
import { createTRPCRouter, accountProcedure } from '@/server/api/trpc'
import { MainTaskStatus, Priority } from '@prisma/client'

export const mainTaskRouter = createTRPCRouter({
  // Criar tarefa principal
  create: accountProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.nativeEnum(Priority).optional(),
        deadline: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.mainTask.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority ?? Priority.MEDIUM,
          deadline: input.deadline,
          createdBy: ctx.userId!,
          accountId: ctx.accountId, // Multi-tenancy
        },
        include: {
          creator: true,
          subtasks: {
            include: {
              assignedTo: true,
            },
          },
        },
      })
    }),

  // Listar todas as tarefas principais da conta
  getAll: accountProcedure
    .input(
      z.object({
        status: z.nativeEnum(MainTaskStatus).optional(),
        createdBy: z.string().optional(),
      }).optional()
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.mainTask.findMany({
        where: {
          accountId: ctx.accountId, // Filtrar por conta
          ...(input?.status && { status: input.status }),
          ...(input?.createdBy && { createdBy: input.createdBy }),
        },
        include: {
          creator: true,
          subtasks: {
            include: {
              assignedTo: true,
              comments: {
                include: {
                  author: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              dependencies: {
                include: {
                  blocking: {
                    include: {
                      assignedTo: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Buscar tarefa principal por ID
  getById: accountProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.mainTask.findFirst({
        where: { 
          id: input.id,
          accountId: ctx.accountId, // Garantir que é da conta do usuário
        },
        include: {
          creator: true,
          subtasks: {
            include: {
              assignedTo: true,
              comments: {
                include: {
                  author: true,
                },
                orderBy: { createdAt: 'desc' },
              },
              dependencies: {
                include: {
                  blocking: {
                    include: {
                      assignedTo: true,
                    },
                  },
                },
              },
              dependents: {
                include: {
                  dependent: true,
                },
              },
            },
          },
        },
      })
      return task
    }),

  // Atualizar tarefa principal
  update: accountProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.nativeEnum(MainTaskStatus).optional(),
        priority: z.nativeEnum(Priority).optional(),
        deadline: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      
      // Verificar se a tarefa pertence à conta do usuário
      const existingTask = await ctx.prisma.mainTask.findFirst({
        where: { id, accountId: ctx.accountId },
      })
      
      if (!existingTask) {
        throw new Error('Tarefa não encontrada ou você não tem permissão')
      }
      
      // Se estamos marcando como concluída, verificar se todas as subtarefas estão concluídas
      if (data.status === MainTaskStatus.COMPLETED) {
        const mainTask = await ctx.prisma.mainTask.findUnique({
          where: { id },
          include: { subtasks: true },
        })
        
        const hasIncompleteSubtasks = mainTask?.subtasks.some(
          subtask => subtask.status !== 'APPROVED' && subtask.status !== 'APPROVED'
        )
        
        if (hasIncompleteSubtasks) {
          throw new Error('Não é possível concluir a tarefa principal. Algumas subtarefas ainda não foram concluídas.')
        }
        
        data.completedAt = new Date()
      }
      
      return ctx.prisma.mainTask.update({
        where: { id },
        data,
        include: {
          creator: true,
          subtasks: {
            include: {
              assignedTo: true,
            },
          },
        },
      })
    }),

  // Deletar tarefa principal
  delete: accountProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verificar se a tarefa pertence à conta
      const task = await ctx.prisma.mainTask.findFirst({
        where: { id: input.id, accountId: ctx.accountId },
      })
      
      if (!task) {
        throw new Error('Tarefa não encontrada ou você não tem permissão')
      }
      
      return ctx.prisma.mainTask.delete({
        where: { id: input.id },
      })
    }),

  // Obter estatísticas de progresso
  getProgress: accountProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const mainTask = await ctx.prisma.mainTask.findFirst({
        where: { 
          id: input.id,
          accountId: ctx.accountId,
        },
        include: { subtasks: true },
      })

      if (!mainTask) {
        throw new Error('Tarefa principal não encontrada')
      }

      const totalSubtasks = mainTask.subtasks.length
      const completedSubtasks = mainTask.subtasks.filter(
        subtask => subtask.status === 'APPROVED' || subtask.status === 'APPROVED'
      ).length

      const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

      return {
        totalSubtasks,
        completedSubtasks,
        progressPercentage: Math.round(progressPercentage),
        status: mainTask.status,
      }
    }),
})
