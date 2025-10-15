import { startCronScheduler } from './cron-scheduler'

/**
 * Inicializa serviços do servidor quando o Next.js inicia
 * Este arquivo deve ser importado uma vez quando o servidor sobe
 */
export function initializeServerServices() {
  // Só executar no servidor (não no cliente)
  if (typeof window === 'undefined') {
    console.log('🚀 Inicializando serviços do servidor...')
    
    // Iniciar o scheduler de tarefas recorrentes
    startCronScheduler()
    
    console.log('✅ Serviços do servidor inicializados com sucesso!')
  }
}

// Auto-executar quando o módulo for importado (apenas no servidor)
if (typeof window === 'undefined') {
  initializeServerServices()
}
