import { PrismaClient, UserRole, Priority, SubtaskStatus, MainTaskStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed MULTI-TENANT...')

  // Limpar dados
  await prisma.activityLog.deleteMany()
  await prisma.subtaskDependency.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.subtask.deleteMany()
  await prisma.mainTask.deleteMany()
  await prisma.accountUser.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  console.log('🧹 Limpo!')

  const password = await bcrypt.hash('password123', 10)

  // ============================================
  // EMPRESA 1: Imobiliária Premium
  // ============================================
  console.log('🏢 Criando Imobiliária Premium...')
  
  const account1 = await prisma.account.create({
    data: { name: 'Imobiliária Premium', slug: 'imobiliaria-premium' },
  })

  const carlos = await prisma.user.create({
    data: { name: 'Carlos Silva', email: 'carlos@premium.com', password },
  })
  const maria = await prisma.user.create({
    data: { name: 'Maria Santos', email: 'maria@premium.com', password },
  })
  const pedro = await prisma.user.create({
    data: { name: 'Pedro Alves', email: 'pedro@premium.com', password },
  })
  const ana = await prisma.user.create({
    data: { name: 'Ana Costa', email: 'ana@premium.com', password },
  })

  await prisma.accountUser.createMany({
    data: [
      { userId: carlos.id, accountId: account1.id, role: UserRole.OWNER },
      { userId: maria.id, accountId: account1.id, role: UserRole.ADMIN },
      { userId: pedro.id, accountId: account1.id, role: UserRole.MANAGER },
      { userId: ana.id, accountId: account1.id, role: UserRole.MEMBER },
    ],
  })

  await prisma.mainTask.create({
    data: {
      title: 'Sistema de Cadastro de Imóveis',
      description: 'Desenvolver sistema completo para gestão de imóveis',
      status: MainTaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      deadline: new Date('2025-12-31'),
      createdBy: carlos.id,
      accountId: account1.id,
      subtasks: {
        create: [
          {
            title: 'Definir arquitetura do sistema',
            description: 'Desenhar arquitetura e fluxos principais',
            status: SubtaskStatus.IN_PROGRESS,
            priority: Priority.HIGH,
            assignedToId: carlos.id,
            estimatedHours: 16,
          },
          {
            title: 'Revisar requisitos com cliente',
            description: 'Meeting para validar funcionalidades',
            status: SubtaskStatus.TODO,
            priority: Priority.MEDIUM,
            assignedToId: maria.id,
            estimatedHours: 4,
          },
          {
            title: 'Criar formulário de cadastro',
            description: 'Formulário com fotos, descrição, preço',
            status: SubtaskStatus.TODO,
            priority: Priority.HIGH,
            assignedToId: pedro.id,
            estimatedHours: 8,
          },
          {
            title: 'Implementar galeria de fotos',
            description: 'Upload múltiplo com preview',
            status: SubtaskStatus.TODO,
            priority: Priority.MEDIUM,
            assignedToId: ana.id,
            estimatedHours: 6,
          },
        ],
      },
    },
  })

  console.log('✅ Imobiliária Premium criada (4 usuários, 1 tarefa, 4 subtarefas)')

  // ============================================
  // EMPRESA 2: Tech Solutions
  // ============================================
  console.log('🏢 Criando Tech Solutions...')
  
  const account2 = await prisma.account.create({
    data: { name: 'Tech Solutions', slug: 'tech-solutions' },
  })

  const joao = await prisma.user.create({
    data: { name: 'João Oliveira', email: 'joao@tech.com', password },
  })
  const fernanda = await prisma.user.create({
    data: { name: 'Fernanda Lima', email: 'fernanda@tech.com', password },
  })
  const ricardo = await prisma.user.create({
    data: { name: 'Ricardo Souza', email: 'ricardo@tech.com', password },
  })

  await prisma.accountUser.createMany({
    data: [
      { userId: joao.id, accountId: account2.id, role: UserRole.OWNER },
      { userId: fernanda.id, accountId: account2.id, role: UserRole.MANAGER },
      { userId: ricardo.id, accountId: account2.id, role: UserRole.MEMBER },
    ],
  })

  await prisma.mainTask.create({
    data: {
      title: 'Migração para Cloud AWS',
      description: 'Migrar toda infraestrutura para AWS',
      status: MainTaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      deadline: new Date('2025-11-30'),
      createdBy: joao.id,
      accountId: account2.id,
      subtasks: {
        create: [
          {
            title: 'Planejar arquitetura AWS',
            description: 'Definir serviços, custos e estratégia',
            status: SubtaskStatus.IN_PROGRESS,
            priority: Priority.URGENT,
            assignedToId: joao.id,
            estimatedHours: 8,
          },
          {
            title: 'Configurar CI/CD Pipeline',
            description: 'GitHub Actions com deploy automático',
            status: SubtaskStatus.TODO,
            priority: Priority.HIGH,
            assignedToId: fernanda.id,
            estimatedHours: 6,
          },
          {
            title: 'Migrar banco de dados',
            description: 'PostgreSQL na RDS',
            status: SubtaskStatus.TODO,
            priority: Priority.URGENT,
            assignedToId: ricardo.id,
            estimatedHours: 8,
          },
          {
            title: 'Configurar monitoramento',
            description: 'CloudWatch e alertas',
            status: SubtaskStatus.TODO,
            priority: Priority.MEDIUM,
            assignedToId: fernanda.id,
            estimatedHours: 4,
          },
        ],
      },
    },
  })

  console.log('✅ Tech Solutions criada (3 usuários, 1 tarefa, 4 subtarefas)')

  // ============================================
  // CONSULTOR MULTI-EMPRESA
  // ============================================
  console.log('👨‍💼 Criando consultor multi-empresa...')
  
  const roberto = await prisma.user.create({
    data: { name: 'Roberto Consultor', email: 'roberto@consultor.com', password },
  })

  await prisma.accountUser.createMany({
    data: [
      { userId: roberto.id, accountId: account1.id, role: UserRole.MANAGER },
      { userId: roberto.id, accountId: account2.id, role: UserRole.ADMIN },
    ],
  })

  console.log('✅ Consultor criado (trabalha nas 2 empresas)')

  // ============================================
  // RESUMO FINAL
  // ============================================
  console.log('\n📊 RESUMO DO SEED:')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`✅ ${await prisma.account.count()} empresas`)
  console.log(`✅ ${await prisma.user.count()} usuários (1 multi-empresa)`)
  console.log(`✅ ${await prisma.mainTask.count()} tarefas principais`)
  console.log(`✅ ${await prisma.subtask.count()} subtarefas`)
  console.log('')
  console.log('🔐 CREDENCIAIS DE ACESSO (senha: password123):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('🏢 Imobiliária Premium:')
  console.log('   • carlos@premium.com (OWNER) - 1 tarefa')
  console.log('   • maria@premium.com (ADMIN) - 1 tarefa')
  console.log('   • pedro@premium.com (MANAGER) - 1 tarefa')
  console.log('   • ana@premium.com (MEMBER) - 1 tarefa')
  console.log('')
  console.log('🏢 Tech Solutions:')
  console.log('   • joao@tech.com (OWNER) - 1 tarefa')
  console.log('   • fernanda@tech.com (MANAGER) - 2 tarefas')
  console.log('   • ricardo@tech.com (MEMBER) - 1 tarefa')
  console.log('')
  console.log('👨‍💼 Multi-empresa:')
  console.log('   • roberto@consultor.com')
  console.log('     - MANAGER na Imobiliária Premium')
  console.log('     - ADMIN na Tech Solutions')
  console.log('')
  console.log('✨ Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
