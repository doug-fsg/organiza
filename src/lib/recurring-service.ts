import { PrismaClient, RecurringType, WeekDay, SubtaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

export class RecurringTaskService {
  /**
   * Calcula a próxima data de reabertura baseada no tipo de recorrência
   */
  static calculateNextReopenDate(
    recurringType: RecurringType,
    recurringDay?: number | null,
    recurringWeekDay?: WeekDay | null,
    lastCompletedAt?: Date | null,
    recurringWeekDays?: string | null,
    recurringMonthDays?: string | null,
    recurringInterval?: number | null,
    skipWeekends?: boolean,
    skipHolidays?: boolean
  ): Date {
    const baseDate = lastCompletedAt || new Date()
    let nextDate = new Date(baseDate)

    // Mapear WeekDay para número (0 = Domingo, 6 = Sábado)
    const weekDayMap: Record<WeekDay, number> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6
    }

    switch (recurringType) {
      case 'DAILY':
        // Usar intervalo personalizado ou 1 dia
        const interval = recurringInterval || 1
        nextDate.setDate(nextDate.getDate() + interval)
        break

      case 'WEEKLY':
        // Suporte para múltiplos dias da semana
        if (recurringWeekDays) {
          const weekDays: WeekDay[] = JSON.parse(recurringWeekDays)
          if (weekDays.length === 0) throw new Error('Pelo menos um dia da semana deve ser selecionado')
          
          const currentDay = nextDate.getDay()
          const targetDays = weekDays.map(day => weekDayMap[day]).sort()
          
          // Encontrar o próximo dia da semana
          let nextTargetDay = targetDays.find(day => day > currentDay)
          if (!nextTargetDay) {
            // Se não há mais dias nesta semana, pegar o primeiro da próxima
            nextTargetDay = targetDays[0] + 7
          }
          
          nextDate.setDate(nextDate.getDate() + (nextTargetDay - currentDay))
        } else if (recurringWeekDay) {
          // Compatibilidade com formato antigo
          const targetDay = weekDayMap[recurringWeekDay]
          const currentDay = nextDate.getDay()
          let daysToAdd = targetDay - currentDay
          if (daysToAdd <= 0) daysToAdd += 7
          nextDate.setDate(nextDate.getDate() + daysToAdd)
        } else {
          throw new Error('Dias da semana não especificados para recorrência semanal')
        }
        break

      case 'BIWEEKLY':
        // Quinzenal - mesmo que semanal mas a cada 2 semanas
        if (recurringWeekDays) {
          const weekDays: WeekDay[] = JSON.parse(recurringWeekDays)
          if (weekDays.length === 0) throw new Error('Pelo menos um dia da semana deve ser selecionado')
          
          const currentDay = nextDate.getDay()
          const targetDays = weekDays.map(day => weekDayMap[day]).sort()
          
          // Encontrar o próximo dia (em 2 semanas)
          let nextTargetDay = targetDays.find(day => day > currentDay)
          if (!nextTargetDay) {
            nextTargetDay = targetDays[0] + 7
          }
          
          // Adicionar 2 semanas ao invés de 1
          nextDate.setDate(nextDate.getDate() + (nextTargetDay - currentDay) + 7)
        } else {
          throw new Error('Dias da semana não especificados para recorrência quinzenal')
        }
        break

      case 'MONTHLY':
        // Suporte para múltiplos dias do mês
        if (recurringMonthDays) {
          const monthDays: number[] = JSON.parse(recurringMonthDays)
          if (monthDays.length === 0) throw new Error('Pelo menos um dia do mês deve ser selecionado')
          
          const currentDay = nextDate.getDate()
          const sortedDays = monthDays.sort((a, b) => a - b)
          
          // Encontrar o próximo dia neste mês
          let nextDay = sortedDays.find(day => day > currentDay)
          
          if (nextDay) {
            // Próximo dia neste mês
            nextDate.setDate(nextDay)
          } else {
            // Primeiro dia do próximo mês
            nextDate.setMonth(nextDate.getMonth() + 1)
            const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
            const dayToSet = Math.min(sortedDays[0], lastDayOfMonth)
            nextDate.setDate(dayToSet)
          }
        } else if (recurringDay) {
          // Compatibilidade com formato antigo
          nextDate.setMonth(nextDate.getMonth() + 1)
          const lastDayOfMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
          const dayToSet = Math.min(recurringDay, lastDayOfMonth)
          nextDate.setDate(dayToSet)
        } else {
          throw new Error('Dias do mês não especificados para recorrência mensal')
        }
        break

      case 'CUSTOM':
        // Intervalo personalizado em dias
        const customInterval = recurringInterval || 1
        nextDate.setDate(nextDate.getDate() + customInterval)
        break

      default:
        throw new Error(`Tipo de recorrência não suportado: ${recurringType}`)
    }

    // Aplicar regras de pular fins de semana e feriados
    if (skipWeekends || skipHolidays) {
      nextDate = this.adjustForSkippedDays(nextDate, skipWeekends, skipHolidays)
    }

    // Definir horário para 00:00 do dia
    nextDate.setHours(0, 0, 0, 0)
    
    return nextDate
  }

  /**
   * Ajusta a data para pular fins de semana e feriados
   */
  static adjustForSkippedDays(date: Date, skipWeekends: boolean = false, skipHolidays: boolean = false): Date {
    const adjustedDate = new Date(date)
    
    // Lista de feriados brasileiros (simplificada)
    const holidays = [
      '01-01', // Ano Novo
      '04-21', // Tiradentes
      '09-07', // Independência
      '10-12', // Nossa Senhora Aparecida
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25', // Natal
    ]
    
    let adjusted = false
    let attempts = 0
    const maxAttempts = 10 // Evitar loop infinito
    
    do {
      adjusted = false
      attempts++
      
      // Pular fins de semana
      if (skipWeekends) {
        const dayOfWeek = adjustedDate.getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) { // Domingo ou Sábado
          adjustedDate.setDate(adjustedDate.getDate() + (dayOfWeek === 0 ? 1 : 2))
          adjusted = true
        }
      }
      
      // Pular feriados
      if (skipHolidays) {
        const monthDay = String(adjustedDate.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(adjustedDate.getDate()).padStart(2, '0')
        
        if (holidays.includes(monthDay)) {
          adjustedDate.setDate(adjustedDate.getDate() + 1)
          adjusted = true
        }
      }
      
    } while (adjusted && attempts < maxAttempts)
    
    return adjustedDate
  }

  /**
   * Verifica se uma tarefa deve ser reaberta hoje
   */
  static shouldReopenTask(nextReopenAt: Date | null): boolean {
    if (!nextReopenAt) return false
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const reopenDate = new Date(nextReopenAt)
    reopenDate.setHours(0, 0, 0, 0)
    
    return reopenDate <= today
  }

  /**
   * Reabre uma tarefa recorrente
   */
  static async reopenRecurringTask(subtaskId: string): Promise<{
    success: boolean
    message: string
    nextReopenAt: Date
  }> {
    try {
      const subtask = await prisma.subtask.findUnique({
        where: { id: subtaskId },
        include: {
          assignedTo: true,
          mainTask: true
        }
      })

      if (!subtask) {
        throw new Error('Tarefa não encontrada')
      }

      if (!subtask.isRecurring || !subtask.recurringType) {
        throw new Error('Tarefa não é recorrente')
      }

      // Calcular próxima data de reabertura
      const nextReopenAt = this.calculateNextReopenDate(
        subtask.recurringType,
        subtask.recurringDay,
        subtask.recurringWeekDay,
        subtask.completedAt,
        subtask.recurringWeekDays,
        subtask.recurringMonthDays,
        subtask.recurringInterval,
        subtask.skipWeekends,
        subtask.skipHolidays
      )

      // Verificar se a próxima reabertura seria após a data de término
      if (subtask.recurringEndDate && new Date(subtask.recurringEndDate) < nextReopenAt) {
        console.log(`⏹️ Próxima reabertura seria após a data de término. Desativando recorrência da tarefa "${subtask.title}"`)
        
        // Desativar recorrência ao invés de reabrir
        await prisma.subtask.update({
          where: { id: subtaskId },
          data: {
            isRecurring: false,
            nextReopenAt: null,
            updatedAt: new Date()
          }
        })

        return {
          success: true,
          message: `Tarefa "${subtask.title}" finalizou o ciclo de recorrência (atingiu data de término)`,
          nextReopenAt: new Date()
        }
      }

      // Reabrir a tarefa
      await prisma.subtask.update({
        where: { id: subtaskId },
        data: {
          status: SubtaskStatus.TODO,
          completedAt: null,
          approvedAt: null,
          approvedBy: null,
          lastReopenedAt: new Date(),
          nextReopenAt: nextReopenAt,
          updatedAt: new Date()
        }
      })

      // Criar log de atividade
      await prisma.activityLog.create({
        data: {
          type: 'SUBTASK_REOPENED',
          description: `🔄 Tarefa recorrente reaberta automaticamente (${subtask.recurringType.toLowerCase()})`,
          subtaskId: subtaskId,
          userId: 'system-recurring',
          metadata: JSON.stringify({
            recurringType: subtask.recurringType,
            recurringDay: subtask.recurringDay,
            recurringWeekDay: subtask.recurringWeekDay,
            nextReopenAt: nextReopenAt.toISOString(),
            autoReopened: true
          })
        }
      })

      // Criar notificação para o responsável
      if (subtask.assignedToId) {
        await prisma.notification.create({
          data: {
            title: 'Tarefa Recorrente Reaberta',
            message: `🔄 A tarefa "${subtask.title}" foi reaberta automaticamente`,
            type: 'SUBTASK_ASSIGNED',
            userId: subtask.assignedToId
          }
        })
      }

      return {
        success: true,
        message: `Tarefa "${subtask.title}" reaberta com sucesso`,
        nextReopenAt
      }

    } catch (error) {
      console.error('Erro ao reabrir tarefa recorrente:', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        nextReopenAt: new Date()
      }
    }
  }

  /**
   * Processa todas as tarefas recorrentes que devem ser reabertas
   */
  static async processRecurringTasks(): Promise<{
    processed: number
    reopened: number
    errors: string[]
  }> {
    const results = {
      processed: 0,
      reopened: 0,
      errors: [] as string[]
    }

    try {
      // Buscar tarefas recorrentes aprovadas que devem ser reabertas
      const recurringTasks = await prisma.subtask.findMany({
        where: {
          isRecurring: true,
          status: SubtaskStatus.APPROVED,
          nextReopenAt: {
            lte: new Date()
          },
          // Considerar apenas tarefas sem data de término OU com data futura
          OR: [
            { recurringEndDate: null },
            { recurringEndDate: { gte: new Date() } }
          ]
        },
        include: {
          assignedTo: true,
          mainTask: true
        }
      })

      console.log(`🔄 Processando ${recurringTasks.length} tarefas recorrentes...`)

      for (const task of recurringTasks) {
        // Verificar se a tarefa atingiu a data de término
        if (task.recurringEndDate && new Date(task.recurringEndDate) < new Date()) {
          console.log(`⏹️ Tarefa "${task.title}" atingiu a data de término, desativando recorrência...`)
          
          // Desativar recorrência
          await prisma.subtask.update({
            where: { id: task.id },
            data: { 
              isRecurring: false,
              nextReopenAt: null
            }
          })
          
          results.processed++
          continue
        }

        results.processed++
        
        try {
          const result = await this.reopenRecurringTask(task.id)
          
          if (result.success) {
            results.reopened++
            console.log(`✅ Tarefa "${task.title}" reaberta com sucesso`)
          } else {
            results.errors.push(`Erro na tarefa "${task.title}": ${result.message}`)
          }
        } catch (error) {
          const errorMsg = `Erro ao processar tarefa "${task.title}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          results.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      console.log(`🎯 Processamento concluído: ${results.reopened}/${results.processed} tarefas reabertas`)
      
      return results

    } catch (error) {
      console.error('Erro ao processar tarefas recorrentes:', error)
      results.errors.push(error instanceof Error ? error.message : 'Erro desconhecido')
      return results
    }
  }

  /**
   * Atualiza a próxima data de reabertura quando uma tarefa é aprovada
   */
  static async updateNextReopenDate(subtaskId: string): Promise<void> {
    try {
      const subtask = await prisma.subtask.findUnique({
        where: { id: subtaskId },
        select: {
          isRecurring: true,
          recurringType: true,
          recurringDay: true,
          recurringWeekDay: true,
          recurringWeekDays: true,
          recurringMonthDays: true,
          recurringInterval: true,
          skipWeekends: true,
          skipHolidays: true,
          recurringEndDate: true,
          completedAt: true,
          title: true
        }
      })

      if (!subtask?.isRecurring || !subtask.recurringType) {
        return // Não é recorrente
      }

      const nextReopenAt = this.calculateNextReopenDate(
        subtask.recurringType,
        subtask.recurringDay,
        subtask.recurringWeekDay,
        subtask.completedAt,
        subtask.recurringWeekDays,
        subtask.recurringMonthDays,
        subtask.recurringInterval,
        subtask.skipWeekends,
        subtask.skipHolidays
      )

      // Verificar se a próxima reabertura seria após a data de término
      if (subtask.recurringEndDate && new Date(subtask.recurringEndDate) < nextReopenAt) {
        console.log(`⏹️ Próxima reabertura seria após a data de término. Desativando recorrência da tarefa "${subtask.title}"`)
        
        // Desativar recorrência
        await prisma.subtask.update({
          where: { id: subtaskId },
          data: { 
            isRecurring: false,
            nextReopenAt: null
          }
        })
        
        return
      }

      await prisma.subtask.update({
        where: { id: subtaskId },
        data: { nextReopenAt }
      })

      console.log(`📅 Próxima reabertura da tarefa ${subtaskId}: ${nextReopenAt.toLocaleDateString()}`)

    } catch (error) {
      console.error('Erro ao atualizar próxima data de reabertura:', error)
    }
  }
}
