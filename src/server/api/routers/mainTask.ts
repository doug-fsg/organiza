import { z } from 'zod'
import { createTRPCRouter, accountProcedure } from '@/server/api/trpc'
import { MainTaskStatus, Priority } from '@prisma/client'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

export const mainTaskRouter = createTRPCRouter({
  // Criar tarefa principal
  create: accountProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.nativeEnum(Priority).optional(),
        deadline: z.date().optional(),
        departmentIds: z.array(z.string()).optional(),
        clientId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const mainTask = await ctx.prisma.mainTask.create({
        data: {
          title: input.title,
          description: input.description,
          priority: input.priority ?? Priority.MEDIUM,
          deadline: input.deadline,
          createdBy: ctx.userId!,
          accountId: ctx.accountId,
          clientId: input.clientId,
        },
        include: {
          creator: true,
          client: true,
          subtasks: {
            include: {
              assignedTo: true,
            },
          },
        },
      })

      // Atribuir a setores se fornecido
      if (input.departmentIds && input.departmentIds.length > 0) {
        await Promise.all(
          input.departmentIds.map((departmentId) =>
            ctx.prisma.departmentTask.create({
              data: {
                departmentId,
                mainTaskId: mainTask.id,
              },
            })
          )
        )
      }

      void dispatchWebhooks(mainTask.accountId, 'project.created', {
        projectId: mainTask.id,
        title: mainTask.title,
        status: mainTask.status,
        clientId: mainTask.clientId,
        createdAt: mainTask.createdAt.toISOString(),
      })

      return mainTask
    }),

  // Listar todas as tarefas principais da conta
  getAll: accountProcedure
    .input(
      z.object({
        status: z.nativeEnum(MainTaskStatus).optional(),
        createdBy: z.string().optional(),
        clientId: z.string().optional(),
      }).optional()
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.mainTask.findMany({
        where: {
          accountId: ctx.accountId,
          ...(input?.status && { status: input.status }),
          ...(input?.createdBy && { createdBy: input.createdBy }),
          ...(input?.clientId === 'none' && { clientId: null }),
          ...(input?.clientId && input.clientId !== 'none' && { clientId: input.clientId }),
        },
        include: {
          creator: true,
          client: true,
          subtaskTemplate: true,
          departmentTasks: {
            include: {
              department: true,
            },
          },
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
          client: true,
          departmentTasks: {
            include: {
              department: true,
            },
          },
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
        departmentIds: z.array(z.string()).optional(),
        clientId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, departmentIds, ...data } = input
      
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
          throw new Error('Não é possível concluir o projeto. Algumas tarefas ainda não foram concluídas.')
        }
        
        data.completedAt = new Date()
      }
      
      // Atualizar setores se fornecido
      if (departmentIds !== undefined) {
        // Remover todos os setores atuais
        await ctx.prisma.departmentTask.deleteMany({
          where: { mainTaskId: id },
        })
        
        // Adicionar novos setores
        if (departmentIds.length > 0) {
          await Promise.all(
            departmentIds.map((departmentId) =>
              ctx.prisma.departmentTask.create({
                data: {
                  departmentId,
                  mainTaskId: id,
                },
              })
            )
          )
        }
      }
      
      const updated = await ctx.prisma.mainTask.update({
        where: { id },
        data,
        include: {
          creator: true,
          client: true,
          departmentTasks: {
            include: {
              department: true,
            },
          },
          subtasks: {
            include: {
              assignedTo: true,
            },
          },
        },
      })

      void dispatchWebhooks(ctx.accountId!, 'project.updated', {
        projectId: updated.id,
        title: updated.title,
        status: updated.status,
        clientId: updated.clientId,
        updatedAt: updated.updatedAt.toISOString(),
      })

      return updated
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
      
      await ctx.prisma.mainTask.delete({
        where: { id: input.id },
      })

      void dispatchWebhooks(ctx.accountId!, 'project.deleted', {
        projectId: task.id,
        title: task.title,
      })

      return task
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
