import { z } from 'zod'
import { createTRPCRouter, accountProcedure, publicProcedure } from '@/server/api/trpc'
import { CustomAttributeType, SubtaskStatus, MainTaskStatus } from '@prisma/client'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

export const taskFieldRouter = createTRPCRouter({
  // Criar um novo botão ou campo
  createDefinition: accountProcedure
    .input(z.object({
      name: z.string().min(1),
// @ts-ignore - ACTION_BUTTON será gerado após prisma generate
      type: z.nativeEnum(CustomAttributeType).default(CustomAttributeType.ACTION_BUTTON),
      color: z.string().optional(),
      projectIds: z.string().optional(), // JSON array de IDs
      options: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.taskFieldDefinition.create({
        data: {
          name: input.name,
// @ts-ignore
          type: input.type || CustomAttributeType.ACTION_BUTTON,
// @ts-ignore
          color: input.color,
// @ts-ignore
          projectIds: input.projectIds || '[]',
          options: input.options,
          accountId: ctx.accountId,
        },
      })
    }),

  // Listar todos os botões/campos da conta
  getDefinitions: accountProcedure
    .query(async ({ ctx }) => {
      return ctx.prisma.taskFieldDefinition.findMany({
        where: { accountId: ctx.accountId },
        include: {
          actions: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Buscar botões específicos para uma Subtarefa (baseado no projeto dela)
  getButtonsForSubtask: accountProcedure
    .input(z.object({ subtaskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const subtask = await ctx.prisma.subtask.findUnique({
        where: { id: input.subtaskId },
        select: { mainTaskId: true }
      })

      if (!subtask) return []

      const allDefs = await ctx.prisma.taskFieldDefinition.findMany({
        where: { 
          accountId: ctx.accountId,
// @ts-ignore
          type: CustomAttributeType.ACTION_BUTTON
        },
        include: { actions: true }
      })

      // Filtra por projeto: se projectIds estiver vazio, aparece em todos.
      // Se tiver IDs, só aparece se o ID da subtask estiver lá.
      return allDefs.filter(def => {
// @ts-ignore
        if (!def.projectIds || def.projectIds === '[]' || def.projectIds === '') return true
        try {
// @ts-ignore
          const ids = JSON.parse(def.projectIds) as string[]
          return ids.includes(subtask.mainTaskId)
        } catch {
          return true
        }
      })
    }),

  // Atualizar definição
  updateDefinition: accountProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      color: z.string().optional(),
      projectIds: z.string().optional(),
      options: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return ctx.prisma.taskFieldDefinition.update({
        where: { id, accountId: ctx.accountId },
        data,
      })
    }),

  // REMOVER
  deleteDefinition: accountProcedure
    .input(z.object({ fieldDefId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Deletar ações primeiro (cascata manual se não estiver no prisma)
      await ctx.prisma.fieldAction.deleteMany({
        where: { fieldDefId: input.fieldDefId }
      })
      return ctx.prisma.taskFieldDefinition.delete({
        where: { id: input.fieldDefId, accountId: ctx.accountId },
      })
    }),

  // Limpar ações de um botão (útil para edição)
  clearActions: accountProcedure
    .input(z.object({ fieldDefId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.fieldAction.deleteMany({
        where: { fieldDefId: input.fieldDefId },
      })
    }),

  // Configurar o que o botão faz (Ações)
  addAction: accountProcedure
    .input(z.object({
      fieldDefId: z.string(),
      actionType: z.enum(['CHANGE_STATUS', 'COMPLETE_MAINTASK', 'ADD_COMMENT', 'FIRE_WEBHOOK']),
      actionPayload: z.string(), // json string
    }))
    .mutation(async ({ ctx, input }) => {
      const fieldDef = await ctx.prisma.taskFieldDefinition.findFirst({
        where: { id: input.fieldDefId, accountId: ctx.accountId },
      })
      if (!fieldDef) throw new Error('Botão não encontrado')

      // Para botões de ação, a "condição" é sempre verdadeira ao clicar
      return ctx.prisma.fieldAction.create({
        data: {
          fieldDefId: input.fieldDefId,
          triggerCondition: JSON.stringify({ operator: 'ALWAYS', value: 'true' }),
          actionType: input.actionType,
          actionPayload: input.actionPayload,
        },
      })
    }),

  // EXECUTAR O BOTÃO (A MÁGICA)
  executeSmartButton: accountProcedure
    .input(z.object({
      buttonId: z.string(),
      subtaskId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const button = await ctx.prisma.taskFieldDefinition.findFirst({
        where: { id: input.buttonId, accountId: ctx.accountId },
        include: { actions: true }
      })

      if (!button) throw new Error('Botão não encontrado')

      const subtask = await ctx.prisma.subtask.findUnique({
        where: { id: input.subtaskId },
        include: { mainTask: true }
      })

      if (!subtask) throw new Error('Tarefa não encontrada')

      console.log(`[SmartButton] 🚀 Executando botão "${button.name}" na tarefa ${subtask.id}`)

      // Persistir que este botão foi o último usado
      await ctx.prisma.subtask.update({
        where: { id: subtask.id },
        data: { 
          // @ts-ignore
          activeActionButtonId: button.id 
        }
      })

      for (const action of button.actions) {
        try {
          const payload = JSON.parse(action.actionPayload)
          
          if (action.actionType === 'CHANGE_STATUS' && payload.status) {
            const oldStatus = subtask.status
            const newStatus = payload.status as SubtaskStatus
            
            if (newStatus !== oldStatus) {
              const updatedSubtask = await ctx.prisma.subtask.update({
                where: { id: subtask.id },
                data: { status: newStatus },
                include: {
                  assignedTo: true,
                  mainTask: {
                    include: { subtasks: true }
                  }
                }
              })

              const accountId = updatedSubtask.mainTask.accountId
              const eventMap: Partial<Record<SubtaskStatus, string>> = {
                [SubtaskStatus.IN_PROGRESS]: 'task.started',
                [SubtaskStatus.BLOCKED]: 'task.blocked',
                [SubtaskStatus.COMPLETED_PENDING]: 'task.completed',
                [SubtaskStatus.APPROVED]: 'task.approved',
              }
              
              const event = eventMap[newStatus]
              if (event && accountId) {
                void dispatchWebhooks(accountId, event, {
                  taskId: updatedSubtask.id,
                  mainTaskId: updatedSubtask.mainTaskId,
                  title: updatedSubtask.title,
                  previousStatus: oldStatus,
                  newStatus: newStatus,
                  assignedTo: updatedSubtask.assignedTo ? { id: updatedSubtask.assignedTo.id, name: updatedSubtask.assignedTo.name } : null,
                  updatedAt: updatedSubtask.updatedAt.toISOString(),
                  automationSource: {
                    type: 'SMART_BUTTON',
                    buttonId: button.id,
                    buttonName: button.name
                  }
                })
              }

              // Notificações
              const notifications = []
              if (newStatus === SubtaskStatus.APPROVED) {
                notifications.push({
                  title: 'Tarefa Concluída (Via Botão)',
                  message: `${updatedSubtask.assignedTo?.name || 'Alguém'} concluiu a tarefa "${updatedSubtask.title}" via automação`,
                  type: 'SUBTASK_COMPLETED' as const,
                  userId: updatedSubtask.mainTask.createdBy,
                })
              }
              
              if (newStatus === SubtaskStatus.BLOCKED) {
                notifications.push({
                  title: 'Tarefa Bloqueada (Via Botão)',
                  message: `A tarefa "${updatedSubtask.title}" foi bloqueada via automação`,
                  type: 'SUBTASK_BLOCKED' as const,
                  userId: updatedSubtask.mainTask.createdBy,
                })
              }

              for (const n of notifications) {
                await ctx.prisma.notification.create({ data: n })
              }

              // Lógica de conclusão da MainTask se APPROVED
              if (newStatus === SubtaskStatus.APPROVED) {
                const allSubtasksCompleted = updatedSubtask.mainTask.subtasks.every(
                  st => 
                    st.id === updatedSubtask.id || 
                    st.status === SubtaskStatus.COMPLETED_PENDING || 
                    st.status === SubtaskStatus.APPROVED
                )

                if (allSubtasksCompleted) {
                  await ctx.prisma.mainTask.update({
                    where: { id: updatedSubtask.mainTaskId },
                    data: {
                      status: MainTaskStatus.COMPLETED,
                      completedAt: new Date(),
                    },
                  })

                  await ctx.prisma.notification.create({
                    data: {
                      title: 'Tarefa Principal Concluída',
                      message: `A tarefa "${updatedSubtask.mainTask.title}" foi concluída automaticamente via botão!`,
                      type: 'MAIN_TASK_COMPLETED',
                      userId: updatedSubtask.mainTask.createdBy,
                    },
                  })

                  void dispatchWebhooks(accountId, 'task.full_completed', {
                    mainTaskId: updatedSubtask.mainTaskId,
                    title: updatedSubtask.mainTask.title,
                    completedAt: new Date().toISOString(),
                    automationSource: {
                      type: 'SMART_BUTTON',
                      buttonId: button.id,
                      buttonName: button.name
                    }
                  })
                }
              }
            }
          }

          if (action.actionType === 'COMPLETE_MAINTASK') {
            const updatedMainTask = await ctx.prisma.mainTask.update({
              where: { id: subtask.mainTaskId },
              data: { 
                status: MainTaskStatus.COMPLETED, 
                completedAt: new Date() 
              },
              include: { creator: true }
            })

            await ctx.prisma.subtask.updateMany({
              where: { mainTaskId: subtask.mainTaskId, status: { notIn: [SubtaskStatus.APPROVED, SubtaskStatus.COMPLETED_PENDING] } },
              data: { status: SubtaskStatus.APPROVED }
            })

            // Notificação e Webhook para conclusão total
            await ctx.prisma.notification.create({
              data: {
                title: 'Projeto Finalizado',
                message: `O projeto "${updatedMainTask.title}" foi finalizado via botão inteligente.`,
                type: 'MAIN_TASK_COMPLETED',
                userId: updatedMainTask.createdBy,
              },
            })

            void dispatchWebhooks(updatedMainTask.accountId, 'task.full_completed', {
              mainTaskId: updatedMainTask.id,
              title: updatedMainTask.title,
              completedAt: updatedMainTask.completedAt?.toISOString() || new Date().toISOString(),
              automationSource: {
                type: 'SMART_BUTTON',
                buttonId: button.id,
                buttonName: button.name
              }
            })
          }

          if (action.actionType === 'ADD_COMMENT' && payload.comment) {
            console.log(`[SmartButton] 💬 Adicionando comentário: "${payload.comment}"`)
            
            let authorId = ctx.userId
            const owner = await ctx.prisma.accountUser.findFirst({
              where: { accountId: subtask.mainTask.accountId, role: 'OWNER' }
            })
            
            if (owner) authorId = owner.userId

            if (authorId) {
              await ctx.prisma.comment.create({
                data: {
                  content: `⚡ Ação rápida: ${payload.comment}`,
                  subtaskId: subtask.id,
                  authorId: authorId,
                }
              })
            }
          }

          if (action.actionType === 'FIRE_WEBHOOK') {
            void dispatchWebhooks(subtask.mainTask.accountId, 'smartbutton.clicked', {
              taskId: subtask.id,
              buttonId: button.id,
              buttonName: button.name,
              actionProcessed: action.actionType,
              payload
            })
          }
        } catch (e) {
          console.error('[SmartButton] ❌ Erro na ação:', e)
        }
      }

      return { success: true }
    }),
})
