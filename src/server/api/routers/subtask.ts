import { z } from 'zod'
import { createTRPCRouter, publicProcedure, accountProcedure } from '@/server/api/trpc'
import { SubtaskStatus, Priority, MainTaskStatus, UserRole, RecurringType, WeekDay } from '@prisma/client'
import { DependencyService } from '@/lib/dependency-service'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

export const subtaskRouter = createTRPCRouter({
  // Criar subtarefa
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        mainTaskId: z.string(),
        assignedToId: z.string().optional(),
        priority: z.nativeEnum(Priority).optional(),
        deadline: z.date().optional(),
        estimatedHours: z.number().optional(),
        requiresApproval: z.boolean().optional(),
        creatorRole: z.nativeEnum(UserRole).optional(),
        isRecurring: z.boolean().optional(),
        recurringType: z.nativeEnum(RecurringType).optional(),
        recurringWeekDays: z.array(z.nativeEnum(WeekDay)).optional(),
        recurringMonthDays: z.array(z.number().min(1).max(31)).optional(),
        recurringInterval: z.number().min(1).max(365).optional(),
        skipWeekends: z.boolean().optional(),
        skipHolidays: z.boolean().optional(),
        recurringEndDate: z.date().optional(),
        // Campos antigos para compatibilidade
        recurringDay: z.number().min(1).max(31).optional(),
        recurringWeekDay: z.nativeEnum(WeekDay).optional(),
        // Checklist
        checklistItems: z.array(z.object({
          id: z.string(),
          text: z.string(),
          checked: z.boolean(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validação de permissão: apenas ADMIN pode criar tarefas sem aprovação
      if (input.requiresApproval === false && input.creatorRole !== UserRole.ADMIN) {
        throw new Error('Apenas administradores podem criar tarefas sem necessidade de aprovação')
      }

      const subtask = await ctx.prisma.subtask.create({
        data: {
          title: input.title,
          description: input.description,
          mainTaskId: input.mainTaskId,
          assignedToId: input.assignedToId,
          priority: input.priority ?? Priority.MEDIUM,
          deadline: input.deadline,
          estimatedHours: input.estimatedHours,
          requiresApproval: input.requiresApproval ?? true,
          isRecurring: input.isRecurring ?? false,
          recurringType: input.recurringType,
          recurringWeekDays: input.recurringWeekDays ? JSON.stringify(input.recurringWeekDays) : null,
          recurringMonthDays: input.recurringMonthDays ? JSON.stringify(input.recurringMonthDays) : null,
          recurringInterval: input.recurringInterval,
          skipWeekends: input.skipWeekends ?? false,
          skipHolidays: input.skipHolidays ?? false,
          recurringEndDate: input.recurringEndDate,
          // Campos antigos para compatibilidade
          recurringDay: input.recurringDay,
          recurringWeekDay: input.recurringWeekDay,
          // Checklist
          checklistItems: input.checklistItems ? JSON.stringify(input.checklistItems) : null,
        },
        include: {
          assignedTo: true,
          mainTask: true,
        },
      })

      // Atualizar status da tarefa principal para IN_PROGRESS se ainda estiver NOT_STARTED
      await ctx.prisma.mainTask.updateMany({
        where: {
          id: input.mainTaskId,
          status: MainTaskStatus.NOT_STARTED,
        },
        data: {
          status: MainTaskStatus.IN_PROGRESS,
        },
      })

      // Notificar usuário sobre nova atribuição
      if (input.assignedToId) {
        const notificationMessage = input.requiresApproval === false 
          ? `Você foi designado para a tarefa "${subtask.title}" ⚡ (aprovação automática)`
          : `Você foi designado para a tarefa "${subtask.title}"`

        await ctx.prisma.notification.create({
          data: {
            title: 'Nova Tarefa Atribuída',
            message: notificationMessage,
            type: 'SUBTASK_ASSIGNED',
            userId: input.assignedToId,
          },
        })
      }

      void dispatchWebhooks(subtask.mainTask.accountId, 'task.created', {
        taskId: subtask.id,
        mainTaskId: subtask.mainTaskId,
        title: subtask.title,
        status: subtask.status,
        assignedToId: subtask.assignedToId,
        assignedTo: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
        createdAt: subtask.createdAt.toISOString(),
      })

      return subtask
    }),

  // Listar todas as subtarefas
  getAll: publicProcedure
    .query(({ ctx }) => {
      return ctx.prisma.subtask.findMany({
        include: {
          assignedTo: true,
          mainTask: {
            include: {
              creator: true,
              client: true,
            },
          },
          comments: {
            include: {
              author: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          dependencies: {
            include: {
              blocking: true,
            },
          },
          // @ts-ignore
          activeActionButton: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Listar subtarefas por tarefa principal
  getByMainTask: publicProcedure
    .input(z.object({ mainTaskId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.subtask.findMany({
        where: { mainTaskId: input.mainTaskId },
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
              blocking: true,
            },
          },
          // @ts-ignore
          activeActionButton: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // Listar subtarefas por usuário (para o Kanban individual)
  getByUser: accountProcedure
    .input(
      z.object({
        userId: z.string().optional(), // Opcional agora, usa ctx.userId se não fornecido
        status: z.nativeEnum(SubtaskStatus).optional(),
        userRole: z.nativeEnum(UserRole).optional(), // Role do usuário para filtro
        showAllTasks: z.boolean().optional(), // Novo parâmetro para controlar visibilidade
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = input?.userId || ctx.userId
      const userRole = input?.userRole
      const showAllTasks = input?.showAllTasks
      
      // Se showAllTasks for true, ADMIN, OWNER e MANAGER veem todas as tarefas da conta
      const shouldShowAllTasks = showAllTasks && [UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(userRole as UserRole)
      
      return ctx.prisma.subtask.findMany({
        where: {
          // Se deve mostrar todas as tarefas, não filtra por assignedToId
          // Caso contrário, filtra por assignedToId
          ...(shouldShowAllTasks ? {} : { assignedToId: userId }),
          mainTask: {
            accountId: ctx.accountId, // Sempre filtrar por conta!
          },
          ...(input?.status && { status: input.status }),
        },
        include: {
          assignedTo: true,
          mainTask: {
            include: {
              creator: true,
              client: true,
              subtasks: {
                include: {
                  dependencies: {
                    include: {
                      blocking: {
                        select: { id: true },
                      },
                    },
                  },
                },
                orderBy: { createdAt: 'asc' },
              },
            },
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
          comments: {
            include: {
              author: true,
            },
            orderBy: { createdAt: 'desc' },
          },
          // @ts-ignore
          activeActionButton: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Atualizar subtarefa
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.nativeEnum(SubtaskStatus).optional(),
        dependencyIds: z.array(z.string()).optional(),
        assignedToId: z.string().optional(),
        priority: z.nativeEnum(Priority).optional(),
        deadline: z.date().optional(),
        estimatedHours: z.number().optional(),
        actualHours: z.number().optional(),
        requiresApproval: z.boolean().optional(),
        isRecurring: z.boolean().optional(),
        recurringType: z.nativeEnum(RecurringType).optional(),
        recurringWeekDays: z.array(z.nativeEnum(WeekDay)).optional(),
        recurringMonthDays: z.array(z.number().min(1).max(31)).optional(),
        recurringInterval: z.number().min(1).max(365).optional(),
        skipWeekends: z.boolean().optional(),
        skipHolidays: z.boolean().optional(),
        recurringEndDate: z.date().optional(),
        // Campos antigos para compatibilidade
        recurringDay: z.number().min(1).max(31).optional(),
        recurringWeekDay: z.nativeEnum(WeekDay).optional(),
        // Checklist
        checklistItems: z.array(z.object({
          id: z.string(),
          text: z.string(),
          checked: z.boolean(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, dependencyIds, checklistItems, ...data } = input

      // Buscar subtarefa atual para comparar status
      const currentSubtask = await ctx.prisma.subtask.findUnique({
        where: { id },
        include: {
          assignedTo: true,
          mainTask: {
            include: {
              creator: true,
              client: true,
            },
          },
        },
      })

      if (!currentSubtask) {
        throw new Error('Tarefa não encontrada')
      }

      // Se estamos marcando como concluída, definir completedAt
      if (data.status === SubtaskStatus.COMPLETED_PENDING || data.status === SubtaskStatus.APPROVED) {
        data.completedAt = new Date()
      }

      // Processar checklist se fornecido
      const updateData: any = { ...data }
      if (checklistItems !== undefined) {
        updateData.checklistItems = checklistItems.length > 0 ? JSON.stringify(checklistItems) : null
      }

      // Se o status está sendo alterado manualmente, limpamos o botão ativo
      if (data.status) {
        // @ts-ignore
        updateData.activeActionButtonId = null
      }
      
      // Processar arrays de recorrência
      if (data.recurringWeekDays !== undefined) {
        updateData.recurringWeekDays = data.recurringWeekDays && data.recurringWeekDays.length > 0 
          ? JSON.stringify(data.recurringWeekDays) 
          : null
      }
      if (data.recurringMonthDays !== undefined) {
        updateData.recurringMonthDays = data.recurringMonthDays && data.recurringMonthDays.length > 0 
          ? JSON.stringify(data.recurringMonthDays) 
          : null
      }

      // Atualiza a subtarefa
      const updatedSubtask = await ctx.prisma.subtask.update({
        where: { id },
        data: updateData,
        include: {
          assignedTo: true,
          mainTask: {
            include: {
              subtasks: true,
              creator: true,
            },
          },
          dependencies: {
            include: {
              blocking: true,
            },
          },
        },
      })

      // Se houver novas dependências, atualiza
      if (input.dependencyIds?.length) {
        console.log('🔗 Atualizando dependências:', {
          subtaskId: id,
          dependencyIds: input.dependencyIds
        })

        // Remove dependências existentes
        const deletedCount = await ctx.prisma.subtaskDependency.deleteMany({
          where: { dependentId: id }
        })
        console.log('🗑️ Dependências removidas:', deletedCount.count)

        // Adiciona novas dependências
        const newDependencies = await Promise.all(
          input.dependencyIds.map(blockedById =>
            ctx.prisma.subtaskDependency.create({
              data: {
                dependentId: id,
                blockedById,
              }
            })
          )
        )
        console.log('✅ Novas dependências criadas:', newDependencies.length)
      }

      // Webhook: status alterado
      if (data.status && data.status !== currentSubtask.status) {
        const accountId = updatedSubtask.mainTask.accountId
        const eventMap: Partial<Record<SubtaskStatus, string>> = {
          [SubtaskStatus.IN_PROGRESS]: 'task.started',
          [SubtaskStatus.BLOCKED]: 'task.blocked',
          [SubtaskStatus.COMPLETED_PENDING]: 'task.completed',
        }
        const event = eventMap[data.status]
        if (event && accountId) {
          void dispatchWebhooks(accountId, event, {
            taskId: updatedSubtask.id,
            mainTaskId: updatedSubtask.mainTaskId,
            title: updatedSubtask.title,
            previousStatus: currentSubtask.status,
            newStatus: data.status,
            assignedTo: updatedSubtask.assignedTo ? { id: updatedSubtask.assignedTo.id, name: updatedSubtask.assignedTo.name } : null,
            updatedAt: updatedSubtask.updatedAt.toISOString(),
          })
        }
      }

      // Criar notificações baseadas na mudança de status
      if (data.status && data.status !== currentSubtask.status) {
        const notifications = []

        // Notificar criador da tarefa principal sobre conclusão
        if (data.status === SubtaskStatus.APPROVED || data.status === SubtaskStatus.APPROVED) {
          notifications.push({
            title: 'Tarefa Concluída',
            message: `${updatedSubtask.assignedTo?.name || 'Alguém'} concluiu a tarefa "${updatedSubtask.title}"`,
            type: 'SUBTASK_COMPLETED' as const,
            userId: updatedSubtask.mainTask.createdBy,
          })
        }

        // Notificar sobre bloqueio
        if (data.status === SubtaskStatus.BLOCKED) {
          notifications.push({
            title: 'Tarefa Bloqueada',
            message: `A tarefa "${updatedSubtask.title}" foi bloqueada`,
            type: 'SUBTASK_BLOCKED' as const,
            userId: updatedSubtask.mainTask.createdBy,
          })
        }

        // Criar as notificações no banco
        for (const notification of notifications) {
          await ctx.prisma.notification.create({
            data: notification,
          })
        }
      }

      // Verificar se todas as subtarefas da tarefa principal foram concluídas
      if (data.status === SubtaskStatus.APPROVED || data.status === SubtaskStatus.APPROVED) {
        const allSubtasksCompleted = updatedSubtask.mainTask.subtasks.every(
          subtask => 
            subtask.id === id || 
            subtask.status === SubtaskStatus.COMPLETED_PENDING || 
            subtask.status === SubtaskStatus.APPROVED
        )

        if (allSubtasksCompleted) {
          await ctx.prisma.mainTask.update({
            where: { id: updatedSubtask.mainTask.id },
            data: {
              status: MainTaskStatus.COMPLETED,
              completedAt: new Date(),
            },
          })

          // Notificar sobre conclusão da tarefa principal
          await ctx.prisma.notification.create({
            data: {
              title: 'Tarefa Principal Concluída',
              message: `A tarefa "${updatedSubtask.mainTask.title}" foi concluída!`,
              type: 'MAIN_TASK_COMPLETED',
              userId: updatedSubtask.mainTask.createdBy,
            },
          })
        }
      }

      return updatedSubtask
    }),

  // Deletar subtarefa
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subtask.delete({
        where: { id: input.id },
      })
    }),

  // Adicionar dependência entre subtarefas
  addDependency: publicProcedure
    .input(
      z.object({
        dependentId: z.string(),
        blockedById: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se as subtarefas existem
      const dependent = await ctx.prisma.subtask.findUnique({
        where: { id: input.dependentId },
      })
      const blockedBy = await ctx.prisma.subtask.findUnique({
        where: { id: input.blockedById },
      })

      if (!dependent || !blockedBy) {
        throw new Error('Uma ou ambas as tarefas não foram encontradas')
      }

      // Verificar se não há dependência circular
      const existingDependency = await ctx.prisma.subtaskDependency.findFirst({
        where: {
          dependentId: input.blockedById,
          blockedById: input.dependentId,
        },
      })

      if (existingDependency) {
        throw new Error('Dependência circular detectada')
      }

      return ctx.prisma.subtaskDependency.create({
        data: {
          dependentId: input.dependentId,
          blockedById: input.blockedById,
        },
        include: {
          dependent: true,
          blockedBy: true,
        },
      })
    }),

  // Remover dependência
  removeDependency: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.subtaskDependency.delete({
        where: { id: input.id },
      })
    }),

  // Verificar se uma subtarefa pode ser iniciada (sem dependências bloqueando)
  canStart: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const subtask = await ctx.prisma.subtask.findUnique({
        where: { id: input.id },
        include: {
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
      })

      if (!subtask) {
        throw new Error('Tarefa não encontrada')
      }

      const blockingDependencies = subtask.dependencies.filter(
        dep => dep.blocking && dep.blocking.status !== SubtaskStatus.APPROVED
      )

      return {
        canStart: blockingDependencies.length === 0,
        blockingDependencies: blockingDependencies.map(dep => ({
          id: dep.blocking.id,
          title: dep.blocking.title,
          status: dep.blocking.status,
          assignedTo: dep.blocking.assignedTo ? {
            id: dep.blocking.assignedTo.id,
            name: dep.blocking.assignedTo.name,
          } : null,
        })),
      }
    }),

  // Nova operação: Concluir subtarefa com verificação de dependências
  completeSubtask: publicProcedure
    .input(z.object({ 
      id: z.string(),
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await DependencyService.processSubtaskCompletion(
        input.id, 
        input.userId
      )

      // Se há dependências pendentes, notificar gestor
      if (result.newStatus === SubtaskStatus.BLOCKED && result.pendingDependencies) {
        const subtask = await ctx.prisma.subtask.findUnique({
          where: { id: input.id },
          include: {
            assignedTo: true,
            mainTask: {
              include: {
                creator: true
              }
            }
          }
        })

        if (subtask) {
          await ctx.prisma.notification.create({
            data: {
              title: 'Tarefa bloqueada por dependências',
              message: `${subtask.assignedTo?.name} concluiu a tarefa "${subtask.title}", mas há dependências pendentes.`,
              type: 'SUBTASK_BLOCKED',
              userId: subtask.mainTask.creator.id
            }
          })
        }
      }

      // Se concluída, notificar gestor para aprovação
      if (result.newStatus === SubtaskStatus.COMPLETED_PENDING) {
        const subtask = await ctx.prisma.subtask.findUnique({
          where: { id: input.id },
          include: {
            assignedTo: true,
            mainTask: {
              include: {
                creator: true
              }
            }
          }
        })

        if (subtask) {
          await ctx.prisma.notification.create({
            data: {
              title: 'Tarefa aguardando aprovação',
              message: `${subtask.assignedTo?.name} concluiu a tarefa "${subtask.title}" e aguarda sua aprovação.`,
              type: 'SUBTASK_PENDING_APPROVAL',
              userId: subtask.mainTask.creator.id
            }
          })

          void dispatchWebhooks(subtask.mainTask.accountId, 'task.completed', {
            taskId: subtask.id,
            mainTaskId: subtask.mainTaskId,
            title: subtask.title,
            status: result.newStatus,
            assignedTo: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
          })
        }
      }

      if (result.newStatus === SubtaskStatus.BLOCKED) {
        const subtask = await ctx.prisma.subtask.findUnique({
          where: { id: input.id },
          include: { mainTask: true, assignedTo: true },
        })
        if (subtask) {
          void dispatchWebhooks(subtask.mainTask.accountId, 'task.blocked', {
            taskId: subtask.id,
            mainTaskId: subtask.mainTaskId,
            title: subtask.title,
            status: result.newStatus,
            assignedTo: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
            pendingDependencies: result.pendingDependencies,
          })
        }
      }

      return result
    }),

  // Buscar tarefas recorrentes
  getRecurring: publicProcedure
    .query(async ({ ctx }) => {
      const recurringTasks = await ctx.prisma.subtask.findMany({
        where: {
          isRecurring: true,
        },
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          mainTask: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          nextReopenAt: 'asc',
        },
      })

      return recurringTasks
    }),

  // Aprovar subtarefa (apenas gestores)
  approveSubtask: publicProcedure
    .input(z.object({ 
      id: z.string(),
      approverId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await DependencyService.approveSubtask(input.id, input.approverId)

      // Notificar responsável sobre aprovação
      const subtask = await ctx.prisma.subtask.findUnique({
        where: { id: input.id },
        include: { assignedTo: true, mainTask: true }
      })

      if (subtask?.assignedTo) {
        await ctx.prisma.notification.create({
          data: {
            title: 'Tarefa aprovada',
            message: `Sua tarefa "${subtask.title}" foi aprovada pelo gestor.`,
            type: 'SUBTASK_APPROVED',
            userId: subtask.assignedTo.id
          }
        })
      }

      // Notificar sobre subtarefas desbloqueadas
      if (result.unblockedSubtasks && result.unblockedSubtasks.length > 0) {
        for (const unblockedId of result.unblockedSubtasks) {
          const unblockedSubtask = await ctx.prisma.subtask.findUnique({
            where: { id: unblockedId },
            include: { 
              assignedTo: true,
              mainTask: { include: { creator: true } }
            }
          })

          if (unblockedSubtask?.assignedTo) {
            await ctx.prisma.notification.create({
              data: {
                title: 'Tarefa desbloqueada',
                message: `Sua tarefa "${unblockedSubtask.title}" foi desbloqueada e aguarda aprovação.`,
                type: 'SUBTASK_UNBLOCKED',
                userId: unblockedSubtask.assignedTo.id
              }
            })
          }

          if (unblockedSubtask?.mainTask.creator) {
            await ctx.prisma.notification.create({
              data: {
                title: 'Tarefa liberada para aprovação',
                message: `A tarefa "${unblockedSubtask.title}" foi desbloqueada e aguarda sua aprovação.`,
                type: 'SUBTASK_PENDING_APPROVAL',
                userId: unblockedSubtask.mainTask.creator.id
              }
            })
          }
        }
      }

      if (subtask?.mainTask) {
        void dispatchWebhooks(subtask.mainTask.accountId, 'task.approved', {
          taskId: subtask.id,
          mainTaskId: subtask.mainTaskId,
          title: subtask.title,
          status: 'APPROVED',
          assignedTo: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
        })
      }

      if (result.unblockedSubtasks?.length) {
        for (const unblockedId of result.unblockedSubtasks) {
          const unblockedSubtask = await ctx.prisma.subtask.findUnique({
            where: { id: unblockedId },
            include: { assignedTo: true, mainTask: true },
          })
          if (unblockedSubtask?.mainTask) {
            void dispatchWebhooks(unblockedSubtask.mainTask.accountId, 'task.unblocked', {
              taskId: unblockedSubtask.id,
              mainTaskId: unblockedSubtask.mainTaskId,
              title: unblockedSubtask.title,
              status: unblockedSubtask.status,
              assignedTo: unblockedSubtask.assignedTo ? { id: unblockedSubtask.assignedTo.id, name: unblockedSubtask.assignedTo.name } : null,
            })
          }
        }
      }

      return result
    }),

  // Reprovar subtarefa (apenas gestores)
  rejectSubtask: publicProcedure
    .input(z.object({ 
      id: z.string(),
      rejectorId: z.string(),
      reason: z.string().min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await DependencyService.rejectSubtask(
        input.id, 
        input.rejectorId, 
        input.reason
      )

      // Notificar responsável sobre reprovação
      const subtask = await ctx.prisma.subtask.findUnique({
        where: { id: input.id },
        include: { assignedTo: true, mainTask: true }
      })

      if (subtask?.assignedTo) {
        await ctx.prisma.notification.create({
          data: {
            title: 'Tarefa Reprovada',
            message: `Sua tarefa "${subtask.title}" foi reprovada.`,
            type: 'SUBTASK_REJECTED',
            userId: subtask.assignedTo.id
          }
        })
      }

      if (subtask?.mainTask) {
        void dispatchWebhooks(subtask.mainTask.accountId, 'task.rejected', {
          taskId: subtask.id,
          mainTaskId: subtask.mainTaskId,
          title: subtask.title,
          status: 'REJECTED',
          rejectionReason: input.reason,
          assignedTo: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
        })
      }

      return result
    }),

  // Verificar dependências de uma subtarefa
  checkDependencies: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await DependencyService.checkDependencies(input.id)
    }),

  // Buscar histórico de atividades de uma subtarefa
  getHistory: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await DependencyService.getSubtaskHistory(input.id)
    }),

  // Reassignar subtarefa (apenas gestores)
  reassign: publicProcedure
    .input(z.object({ 
      id: z.string(),
      newAssigneeId: z.string(),
      managerId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      const subtask = await ctx.prisma.subtask.findUnique({
        where: { id: input.id },
        include: { 
          assignedTo: true,
          mainTask: { include: { creator: true } }
        }
      })

      if (!subtask) {
        throw new Error('Tarefa não encontrada')
      }

      const updatedSubtask = await ctx.prisma.subtask.update({
        where: { id: input.id },
        data: { 
          assignedToId: input.newAssigneeId,
          updatedAt: new Date()
        },
        include: {
          assignedTo: true
        }
      })

      // Criar log de atividade
      await ctx.prisma.activityLog.create({
        data: {
          type: 'SUBTASK_REASSIGNED',
          description: `Tarefa reassignada para ${updatedSubtask.assignedTo?.name}`,
          subtaskId: input.id,
          userId: input.managerId,
          metadata: JSON.stringify({
            previousAssignee: subtask.assignedTo?.name,
            newAssignee: updatedSubtask.assignedTo?.name
          })
        }
      })

      // Notificar novo responsável
      if (updatedSubtask.assignedTo) {
        await ctx.prisma.notification.create({
          data: {
            title: 'Nova tarefa atribuída',
            message: `Você foi atribuído à tarefa "${subtask.title}".`,
            type: 'SUBTASK_ASSIGNED',
            userId: updatedSubtask.assignedTo.id
          }
        })
      }

      // Notificar responsável anterior (se houver)
      if (subtask.assignedTo && subtask.assignedTo.id !== input.newAssigneeId) {
        await ctx.prisma.notification.create({
          data: {
            title: 'Tarefa reassignada',
            message: `A tarefa "${subtask.title}" foi reassignada para outro membro.`,
            type: 'SUBTASK_REASSIGNED',
            userId: subtask.assignedTo.id
          }
        })
      }

      void dispatchWebhooks(subtask.mainTask.accountId, 'task.reassigned', {
        taskId: updatedSubtask.id,
        mainTaskId: subtask.mainTaskId,
        title: subtask.title,
        previousAssignee: subtask.assignedTo ? { id: subtask.assignedTo.id, name: subtask.assignedTo.name } : null,
        newAssignee: updatedSubtask.assignedTo ? { id: updatedSubtask.assignedTo.id, name: updatedSubtask.assignedTo.name } : null,
      })

      return updatedSubtask
    }),
})
