import { PrismaClient, UserRole, Priority, SubtaskStatus, MainTaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Limpar dados existentes
  await prisma.activityLog.deleteMany()
  await prisma.subtaskDependency.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.subtask.deleteMany()
  await prisma.mainTask.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Dados existentes removidos.')

  // Criar usuários
  const admin = await prisma.user.create({
    data: {
      name: 'Carlos Imobiliário',
      email: 'carlos@imobiliaria.com',
      role: UserRole.ADMIN,
    },
  })

  const manager = await prisma.user.create({
    data: {
      name: 'Maria',
      email: 'maria@imobiliaria.com',
      role: UserRole.MANAGER,
    },
  })

  const agent1 = await prisma.user.create({
    data: {
      name: 'Pedro',
      email: 'pedro@imobiliaria.com',
      role: UserRole.MEMBER,
    },
  })

  const agent2 = await prisma.user.create({
    data: {
      name: 'Ana',
      email: 'ana@imobiliaria.com',
      role: UserRole.MEMBER,
    },
  })

  console.log('👥 Usuários criados.')

  // Criar tarefa principal
  const mainTask = await prisma.mainTask.create({
    data: {
      title: 'Processo de Compra - Cliente: João da Silva',
      description: 'Acompanhamento completo do processo de compra de imóvel para o cliente João da Silva',
      priority: Priority.HIGH,
      deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 dias a partir de hoje
      createdBy: manager.id,
    },
  })

  console.log('📋 Tarefa principal criada.')

  // Criar subtarefas para o processo imobiliário
  const documentosSubtask = await prisma.subtask.create({
    data: {
      title: 'Coletar documentos pessoais',
      description: 'Coletar RG, CPF, comprovante de renda e outros documentos necessários do cliente',
      mainTaskId: mainTask.id,
      assignedToId: agent1.id,
      priority: Priority.HIGH,
      status: SubtaskStatus.APPROVED,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
      actualHours: 6,
      completedAt: new Date(),
    },
  })

  const certidaoSubtask = await prisma.subtask.create({
    data: {
      title: 'Conferir certidão negativa',
      description: 'Verificar certidão negativa de débitos junto aos órgãos competentes',
      mainTaskId: mainTask.id,
      assignedToId: agent2.id,
      priority: Priority.HIGH,
      status: SubtaskStatus.IN_PROGRESS,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      estimatedHours: 12,
    },
  })

  const contratoSubtask = await prisma.subtask.create({
    data: {
      title: 'Preparar contrato de compra',
      description: 'Elaborar contrato de compra e venda com todas as cláusulas necessárias',
      mainTaskId: mainTask.id,
      assignedToId: agent2.id,
      priority: Priority.HIGH,
      status: SubtaskStatus.TODO,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      estimatedHours: 16,
    },
  })

  // Criar subtarefas adicionais para o processo imobiliário
  const avaliacaoSubtask = await prisma.subtask.create({
    data: {
      title: 'Realizar avaliação do imóvel',
      description: 'Contratar empresa especializada para avaliação técnica do imóvel',
      mainTaskId: mainTask.id,
      assignedToId: agent1.id,
      priority: Priority.MEDIUM,
      status: SubtaskStatus.TODO,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      estimatedHours: 4,
    },
  })

  const financiamentoSubtask = await prisma.subtask.create({
    data: {
      title: 'Processar financiamento',
      description: 'Acompanhar processo de financiamento junto ao banco',
      mainTaskId: mainTask.id,
      assignedToId: agent2.id,
      priority: Priority.HIGH,
      status: SubtaskStatus.TODO,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      estimatedHours: 20,
    },
  })

  const escrituraSubtask = await prisma.subtask.create({
    data: {
      title: 'Marcar escritura',
      description: 'Agendar escritura no cartório e preparar documentação final',
      mainTaskId: mainTask.id,
      assignedToId: agent1.id,
      priority: Priority.HIGH,
      status: SubtaskStatus.TODO,
      deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
    },
  })

  console.log('✅ Subtarefas criadas.')

  // Criar dependências
  await prisma.subtaskDependency.create({
    data: {
      dependentId: certidaoSubtask.id,
      blockedById: documentosSubtask.id,
    },
  })

  await prisma.subtaskDependency.create({
    data: {
      dependentId: contratoSubtask.id,
      blockedById: certidaoSubtask.id,
    },
  })

  await prisma.subtaskDependency.create({
    data: {
      dependentId: financiamentoSubtask.id,
      blockedById: contratoSubtask.id,
    },
  })

  await prisma.subtaskDependency.create({
    data: {
      dependentId: escrituraSubtask.id,
      blockedById: financiamentoSubtask.id,
    },
  })

  console.log('🔗 Dependências criadas.')

  // Criar alguns comentários
  await prisma.comment.create({
    data: {
      content: 'Todos os documentos pessoais foram coletados com sucesso. Cliente João da Silva entregou RG, CPF e comprovante de renda.',
      subtaskId: documentosSubtask.id,
      authorId: agent1.id,
    },
  })

  await prisma.comment.create({
    data: {
      content: 'Ótimo trabalho Pedro! Agora podemos prosseguir com a verificação da certidão negativa.',
      subtaskId: documentosSubtask.id,
      authorId: manager.id,
    },
  })

  await prisma.comment.create({
    data: {
      content: 'Iniciando processo de verificação da certidão negativa junto à Receita Federal e Prefeitura.',
      subtaskId: certidaoSubtask.id,
      authorId: agent2.id,
    },
  })

  console.log('💬 Comentários adicionados.')

  // Criar notificações
  await prisma.notification.create({
    data: {
      title: 'Subtarefa Concluída',
      message: 'Pedro concluiu a tarefa "Coletar documentos pessoais"',
      type: 'SUBTASK_COMPLETED',
      userId: manager.id,
    },
  })

  await prisma.notification.create({
    data: {
      title: 'Nova Tarefa Disponível',
      message: 'A tarefa "Conferir certidão negativa" está disponível para início',
      type: 'SUBTASK_UNBLOCKED',
      userId: agent2.id,
    },
  })

  console.log('🔔 Notificações criadas.')

  console.log('🎉 Seed concluído com sucesso!')
  console.log('\n📊 Resumo dos dados criados:')
  console.log(`👥 Usuários: ${await prisma.user.count()}`)
  console.log(`📋 Tarefas principais: ${await prisma.mainTask.count()}`)
  console.log(`✅ Subtarefas: ${await prisma.subtask.count()}`)
  console.log(`🔗 Dependências: ${await prisma.subtaskDependency.count()}`)
  console.log(`💬 Comentários: ${await prisma.comment.count()}`)
  console.log(`🔔 Notificações: ${await prisma.notification.count()}`)
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
