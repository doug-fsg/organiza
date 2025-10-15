import { NextRequest, NextResponse } from 'next/server'
import { RecurringTaskService } from '@/lib/recurring-service'

export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição tem autorização (opcional: adicionar API key)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'your-secret-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Iniciando processamento de tarefas recorrentes...')
    
    const result = await RecurringTaskService.processRecurringTasks()
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      processed: result.processed,
      reopened: result.reopened,
      errors: result.errors,
      message: `Processamento concluído: ${result.reopened}/${result.processed} tarefas reabertas`
    }

    console.log('✅ Processamento de tarefas recorrentes concluído:', response)
    
    return NextResponse.json(response, { status: 200 })
    
  } catch (error) {
    console.error('❌ Erro no processamento de tarefas recorrentes:', error)
    
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        message: 'Falha no processamento de tarefas recorrentes'
      },
      { status: 500 }
    )
  }
}

// Endpoint GET para verificar status (opcional)
export async function GET() {
  return NextResponse.json({
    service: 'Recurring Tasks Processor',
    status: 'active',
    timestamp: new Date().toISOString(),
    description: 'Endpoint para processar tarefas recorrentes via cron job'
  })
}


