import cron from 'node-cron'
import { RecurringTaskService } from './recurring-service'

// Usar globalThis para persistir entre diferentes importações do módulo
declare global {
  var __cronSchedulerTask: cron.ScheduledTask | undefined
}

// Garantir que a variável existe
if (typeof globalThis.__cronSchedulerTask === 'undefined') {
  globalThis.__cronSchedulerTask = undefined
}

/**
 * Inicia o agendador de tarefas recorrentes
 * Executa todo dia à meia-noite (0 0 * * *)
 */
export function startCronScheduler() {
  if (globalThis.__cronSchedulerTask) {
    console.log('⏭️ Scheduler de tarefas recorrentes já está rodando')
    return
  }

  console.log('🚀 Iniciando scheduler de tarefas recorrentes...')

  try {
    // Agendar para todo dia à meia-noite
    // Para testes, você pode usar: '*/5 * * * *' (a cada 5 minutos)
    // Para produção: '0 0 * * *' (todo dia à meia-noite)
    globalThis.__cronSchedulerTask = cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [CRON] Processando tarefas recorrentes...', new Date().toISOString())
    
    try {
      const result = await RecurringTaskService.processRecurringTasks()
      
      console.log(`✅ [CRON] Processamento concluído:`, {
        processed: result.processed,
        reopened: result.reopened,
        errors: result.errors.length,
        timestamp: new Date().toISOString()
      })

      // Log detalhado se houver erros
      if (result.errors.length > 0) {
        console.error('❌ [CRON] Erros encontrados:', result.errors)
      }

    } catch (error) {
      console.error('❌ [CRON] Erro crítico ao processar tarefas recorrentes:', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
    }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo' // Fuso horário do Brasil
    })

    console.log('✅ Scheduler de tarefas recorrentes iniciado com sucesso!')
    console.log('📅 Próxima execução: Todo dia à meia-noite (00:00 BRT)')
    
  } catch (error) {
    console.error('❌ Erro ao iniciar scheduler de tarefas recorrentes:', error)
    globalThis.__cronSchedulerTask = undefined
  }
}

/**
 * Para o agendador (para testes ou manutenção)
 */
export function stopCronScheduler() {
  if (globalThis.__cronSchedulerTask) {
    globalThis.__cronSchedulerTask.stop()
    globalThis.__cronSchedulerTask = undefined
    console.log('⏸️ Scheduler de tarefas recorrentes parado')
  }
}

/**
 * Verifica se o scheduler está rodando
 */
export function isSchedulerActive(): boolean {
  return globalThis.__cronSchedulerTask !== undefined
}

/**
 * Executa o processamento manualmente (para testes)
 */
export async function runRecurringTasksManually(): Promise<{
  success: boolean
  result?: any
  error?: string
}> {
  try {
    console.log('🔧 [MANUAL] Executando processamento manual de tarefas recorrentes...')
    
    const result = await RecurringTaskService.processRecurringTasks()
    
    console.log('✅ [MANUAL] Processamento manual concluído:', result)
    
    return {
      success: true,
      result
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ [MANUAL] Erro no processamento manual:', errorMessage)
    
    return {
      success: false,
      error: errorMessage
    }
  }
}
