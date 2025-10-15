import { PrismaClient, SubtaskStatus } from '@prisma/client'
import { RecurringTaskService } from './recurring-service'

const prisma = new PrismaClient()

export interface DependencyCheckResult {
  canComplete: boolean
  pendingDependencies: Array<{
    id: string
    title: string
    status: SubtaskStatus
    assignedTo?: string
  }>
}

export class DependencyService {
  /**
   * Verifica se uma subtarefa pode ser concluída com base em suas dependências
   */
  static async checkDependencies(subtaskId: string): Promise<DependencyCheckResult> {
    // Buscar todas as dependências da subtarefa
    const dependencies = await prisma.subtaskDependency.findMany({
      where: {
        dependentId: subtaskId
      },
      include: {
        blocking: {
          include: {
            assignedTo: true
          }
        }
      }
    })

    // Filtrar dependências que ainda não foram aprovadas
    const pendingDependencies = dependencies
      .filter(dep => dep.blocking.status !== SubtaskStatus.APPROVED)
      .map(dep => ({
        id: dep.blocking.id,
        title: dep.blocking.title,
        status: dep.blocking.status,
        assignedTo: dep.blocking.assignedTo?.name
      }))

    return {
      canComplete: pendingDependencies.length === 0,
      pendingDependencies
    }
  }

  /**
   * Verifica todas as subtarefas que estavam bloqueadas por uma subtarefa específica
   * e atualiza seus status automaticamente se todas as dependências foram resolvidas
   */
  static async checkAndUnblockDependents(approvedSubtaskId: string): Promise<string[]> {
    // Buscar todas as subtarefas que dependem da subtarefa aprovada
    const dependentSubtasks = await prisma.subtaskDependency.findMany({
      where: {
        blockedById: approvedSubtaskId
      },
      include: {
        dependent: true
      }
    })

    const unblockedSubtasks: string[] = []

    // Para cada subtarefa dependente, verificar se ainda há outras dependências pendentes
    for (const dependency of dependentSubtasks) {
      const { dependent } = dependency

      // Só processar se a subtarefa estiver bloqueada
      if (dependent.status === SubtaskStatus.BLOCKED) {
        const dependencyCheck = await this.checkDependencies(dependent.id)

        // Se não há mais dependências pendentes, desbloquear
        if (dependencyCheck.canComplete) {
          await prisma.subtask.update({
            where: { id: dependent.id },
            data: { 
              status: SubtaskStatus.COMPLETED_PENDING,
              updatedAt: new Date()
            }
          })

          unblockedSubtasks.push(dependent.id)

          // Criar log de atividade
          await this.createActivityLog({
            type: 'SUBTASK_UNBLOCKED',
            description: `Subtarefa desbloqueada automaticamente: todas as dependências foram resolvidas`,
            subtaskId: dependent.id,
            userId: dependent.assignedToId || 'system'
          })
        }
      }
    }

    return unblockedSubtasks
  }

  /**
   * Processa a tentativa de conclusão de uma subtarefa
   */
  static async processSubtaskCompletion(
    subtaskId: string, 
    userId: string
  ): Promise<{
    success: boolean
    newStatus: SubtaskStatus
    message: string
    isAutoApproved?: boolean
    unblockedSubtasks?: string[]
    pendingDependencies?: Array<{
      id: string
      title: string
      status: SubtaskStatus
      assignedTo?: string
    }>
  }> {
    // Verificar se a tarefa requer aprovação
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      select: {
        id: true,
        requiresApproval: true,
        title: true
      }
    })

    if (!subtask) {
      throw new Error('Subtarefa não encontrada')
    }

    const dependencyCheck = await this.checkDependencies(subtaskId)

    if (dependencyCheck.canComplete) {
      if (!subtask.requiresApproval) {
        // Auto-aprovação: não requer aprovação manual
        return await this.autoApproveSubtask(subtaskId, userId)
      } else {
        // Requer aprovação manual
        await prisma.subtask.update({
          where: { id: subtaskId },
          data: { 
            status: SubtaskStatus.COMPLETED_PENDING,
            completedAt: new Date(),
            updatedAt: new Date()
          }
        })

        await this.createActivityLog({
          type: 'SUBTASK_COMPLETED',
          description: 'Subtarefa concluída e aguardando aprovação do gestor',
          subtaskId,
          userId
        })

        return {
          success: true,
          newStatus: SubtaskStatus.COMPLETED_PENDING,
          message: 'Subtarefa concluída com sucesso! Aguardando aprovação do gestor.',
          isAutoApproved: false
        }
      }
    } else {
      // Há dependências pendentes - bloquear
      await prisma.subtask.update({
        where: { id: subtaskId },
        data: { 
          status: SubtaskStatus.BLOCKED,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      })

      await this.createActivityLog({
        type: 'SUBTASK_BLOCKED',
        description: 'Subtarefa concluída mas bloqueada por dependências pendentes',
        subtaskId,
        userId,
        metadata: JSON.stringify({
          pendingDependencies: dependencyCheck.pendingDependencies
        })
      })

      return {
        success: true,
        newStatus: SubtaskStatus.BLOCKED,
        message: 'Subtarefa concluída, mas há dependências pendentes. Status alterado para "Bloqueado".',
        pendingDependencies: dependencyCheck.pendingDependencies
      }
    }
  }

  /**
   * Auto-aprova uma subtarefa (para tarefas que não requerem aprovação manual)
   */
  static async autoApproveSubtask(
    subtaskId: string,
    userId: string
  ): Promise<{
    success: boolean
    newStatus: SubtaskStatus
    message: string
    isAutoApproved: boolean
    unblockedSubtasks: string[]
  }> {
    await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        status: SubtaskStatus.APPROVED,
        completedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: 'system-auto',
        updatedAt: new Date()
      }
    })

    await this.createActivityLog({
      type: 'SUBTASK_APPROVED',
      description: '⚡ Subtarefa aprovada automaticamente (não requer aprovação manual)',
      subtaskId,
      userId,
      metadata: JSON.stringify({
        autoApproved: true,
        reason: 'requiresApproval: false'
      })
    })

    // Atualizar próxima data de reabertura se for tarefa recorrente
    await RecurringTaskService.updateNextReopenDate(subtaskId)

    // Verificar e desbloquear subtarefas dependentes
    const unblockedSubtasks = await this.checkAndUnblockDependents(subtaskId)

    return {
      success: true,
      newStatus: SubtaskStatus.APPROVED,
      message: '⚡ Subtarefa concluída e aprovada automaticamente!',
      isAutoApproved: true,
      unblockedSubtasks
    }
  }

  /**
   * Aprova uma subtarefa (apenas gestores)
   */
  static async approveSubtask(
    subtaskId: string, 
    approverId: string
  ): Promise<{ success: boolean; message: string; unblockedSubtasks?: string[] }> {
    await prisma.subtask.update({
      where: { id: subtaskId },
      data: { 
        status: SubtaskStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: approverId,
        updatedAt: new Date()
      }
    })

    await this.createActivityLog({
      type: 'SUBTASK_APPROVED',
      description: 'Subtarefa aprovada pelo gestor',
      subtaskId,
      userId: approverId
    })

    // Atualizar próxima data de reabertura se for tarefa recorrente
    await RecurringTaskService.updateNextReopenDate(subtaskId)

    // Verificar e desbloquear subtarefas dependentes
    const unblockedSubtasks = await this.checkAndUnblockDependents(subtaskId)

    return {
      success: true,
      message: 'Subtarefa aprovada com sucesso!',
      unblockedSubtasks
    }
  }

  /**
   * Reprova uma subtarefa (apenas gestores)
   */
  static async rejectSubtask(
    subtaskId: string, 
    rejectorId: string, 
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    await prisma.subtask.update({
      where: { id: subtaskId },
      data: { 
        status: SubtaskStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: rejectorId,
        rejectionReason: reason,
        updatedAt: new Date()
      }
    })

    await this.createActivityLog({
      type: 'SUBTASK_REJECTED',
      description: `Subtarefa reprovada: ${reason}`,
      subtaskId,
      userId: rejectorId,
      metadata: JSON.stringify({ reason })
    })

    return {
      success: true,
      message: 'Subtarefa reprovada. O responsável foi notificado.'
    }
  }

  /**
   * Cria um log de atividade
   */
  private static async createActivityLog({
    type,
    description,
    subtaskId,
    userId,
    metadata
  }: {
    type: string
    description: string
    subtaskId?: string
    userId: string
    metadata?: string
  }) {
    await prisma.activityLog.create({
      data: {
        type: type as any, // TypeScript pode reclamar, mas o Prisma aceita
        description,
        subtaskId,
        userId,
        metadata
      }
    })
  }

  /**
   * Busca o histórico de atividades de uma subtarefa
   */
  static async getSubtaskHistory(subtaskId: string) {
    return await prisma.activityLog.findMany({
      where: { subtaskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}

