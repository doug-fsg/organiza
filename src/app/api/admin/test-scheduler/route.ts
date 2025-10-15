import { NextRequest, NextResponse } from 'next/server'
import { 
  startTestCronScheduler, 
  stopTestCronScheduler, 
  isTestSchedulerActive 
} from '@/lib/cron-scheduler-test'
import { isSchedulerActive } from '@/lib/cron-scheduler'

/**
 * POST /api/admin/test-scheduler
 * Controla o scheduler de teste (start/stop)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'start') {
      startTestCronScheduler()
      return NextResponse.json({
        success: true,
        message: 'Test scheduler iniciado (executa a cada minuto)',
        testSchedulerActive: isTestSchedulerActive(),
        productionSchedulerActive: isSchedulerActive(),
        timestamp: new Date().toISOString()
      })
    } 
    
    if (action === 'stop') {
      stopTestCronScheduler()
      return NextResponse.json({
        success: true,
        message: 'Test scheduler parado',
        testSchedulerActive: isTestSchedulerActive(),
        productionSchedulerActive: isSchedulerActive(),
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Ação inválida. Use "start" ou "stop"',
      timestamp: new Date().toISOString()
    }, { status: 400 })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/test-scheduler
 * Status dos schedulers
 */
export async function GET() {
  return NextResponse.json({
    testScheduler: {
      active: isTestSchedulerActive(),
      schedule: 'A cada 1 minuto (apenas para testes)'
    },
    productionScheduler: {
      active: isSchedulerActive(),
      schedule: 'Todo dia à meia-noite (00:00 BRT)'
    },
    timestamp: new Date().toISOString(),
    instructions: {
      start: 'POST { "action": "start" }',
      stop: 'POST { "action": "stop" }'
    }
  })
}
