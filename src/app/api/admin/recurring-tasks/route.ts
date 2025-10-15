import { NextRequest, NextResponse } from 'next/server'
import { runRecurringTasksManually, isSchedulerActive } from '@/lib/cron-scheduler'
import { RecurringTaskService } from '@/lib/recurring-service'

/**
 * POST /api/admin/recurring-tasks
 * Executa o processamento de tarefas recorrentes manualmente (para testes)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [API] Executando processamento manual de tarefas recorrentes...')
    
    const result = await runRecurringTasksManually()
    
    return NextResponse.json({
      success: result.success,
      timestamp: new Date().toISOString(),
      schedulerActive: isSchedulerActive(),
      data: result.result,
      error: result.error,
      message: result.success 
        ? `Processamento concluído: ${result.result?.reopened || 0}/${result.result?.processed || 0} tarefas reabertas`
        : `Erro no processamento: ${result.error}`
    }, { 
      status: result.success ? 200 : 500 
    })
    
  } catch (error) {
    console.error('❌ [API] Erro no endpoint de processamento manual:', error)
    
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      schedulerActive: isSchedulerActive(),
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      message: 'Falha no processamento manual de tarefas recorrentes'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/recurring-tasks
 * Retorna informações sobre o status do scheduler
 */
export async function GET() {
  try {
    // Buscar tarefas recorrentes ativas
    const recurringTasks = await RecurringTaskService.processRecurringTasks()
    
    return NextResponse.json({
      service: 'Recurring Tasks Scheduler',
      status: isSchedulerActive() ? 'active' : 'inactive',
      timestamp: new Date().toISOString(),
      schedulerActive: isSchedulerActive(),
      description: 'Sistema de processamento automático de tarefas recorrentes',
      schedule: 'Todo dia à meia-noite (00:00 BRT)',
      lastCheck: {
        processed: recurringTasks.processed,
        reopened: recurringTasks.reopened,
        errors: recurringTasks.errors.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      service: 'Recurring Tasks Scheduler',
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
