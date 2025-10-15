import cron from 'node-cron'
import { RecurringTaskService } from './recurring-service'

let isTestSchedulerRunning = false
let testTask: cron.ScheduledTask | null = null

/**
 * Inicia o agendador de TESTE (executa a cada minuto)
 * APENAS para desenvolvimento e testes
 */
export function startTestCronScheduler() {
  if (isTestSchedulerRunning) {
    console.log('⏭️ Test Scheduler já está rodando')
    return
  }

  console.log('🧪 [TEST] Iniciando scheduler de TESTE (a cada minuto)...')

  try {
    // TESTE: A cada minuto para ver funcionando
    testTask = cron.schedule('*/1 * * * *', async () => {
      console.log('🔄 [TEST-CRON] Processando tarefas recorrentes...', new Date().toISOString())
      
      try {
        const result = await RecurringTaskService.processRecurringTasks()
        
        console.log(`✅ [TEST-CRON] Processamento concluído:`, {
          processed: result.processed,
          reopened: result.reopened,
          errors: result.errors.length,
          timestamp: new Date().toISOString()
        })

        // Log detalhado se houver erros
        if (result.errors.length > 0) {
          console.error('❌ [TEST-CRON] Erros encontrados:', result.errors)
        }

      } catch (error) {
        console.error('❌ [TEST-CRON] Erro crítico:', {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        })
      }
    }, {
      scheduled: true,
      timezone: 'America/Sao_Paulo'
    })

    isTestSchedulerRunning = true
    console.log('✅ [TEST] Test Scheduler iniciado! Executa a cada 1 minuto.')
    
  } catch (error) {
    console.error('❌ [TEST] Erro ao iniciar test scheduler:', error)
    isTestSchedulerRunning = false
  }
}

/**
 * Para o scheduler de teste
 */
export function stopTestCronScheduler() {
  if (testTask) {
    testTask.stop()
    testTask = null
    isTestSchedulerRunning = false
    console.log('⏸️ [TEST] Test Scheduler parado')
  }
}

/**
 * Verifica se o test scheduler está rodando
 */
export function isTestSchedulerActive(): boolean {
  return isTestSchedulerRunning
}
