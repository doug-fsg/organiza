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

  // EMPRESA 1
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
      status: MainTaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      createdBy: carlos.id,
      accountId: account1.id,
      subtasks: {
        create: [
          {
            title: '[CARLOS] Definir arquitetura',
            status: SubtaskStatus.IN_PROGRESS,
            priority: Priority.HIGH,
            assignedToId: carlos.id, // OWNER vê esta!
            estimatedHours: 16,
          },
          {
            title: '[MARIA] Revisar requisitos',
            status: SubtaskStatus.TODO,
            priority: Priority.MEDIUM,
            assignedToId: maria.id,
            estimatedHours: 4,
          },
          {
            title: '[PEDRO] Criar formulário',
            status: SubtaskStatus.TODO,
            priority: Priority.HIGH,
            assignedToId: pedro.id,
            estimatedHours: 8,
          },
          {
            title: '[ANA] Galeria de fotos',
            status: SubtaskStatus.TODO,
            priority: Priority.MEDIUM,
            assignedToId: ana.id,
            estimatedHours: 6,
          },
        ],
      },
    },
  })

  console.log('✅ Imobiliária criada!')

  // EMPRESA 2
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
      title: 'Migração Cloud AWS',
      status: MainTaskStatus.IN_PROGRESS,
      priority: Priority.URGENT,
      createdBy: joao.id,
      accountId: account2.id,
      subtasks: {
        create: [
          {
            title: '[JOÃO] Planejar arquitetura AWS',
            status: SubtaskStatus.IN_PROGRESS,
            priority: Priority.URGENT,
            assignedToId: joao.id, // OWNER vê esta!
            estimatedHours: 8,
          },
          {
            title: '[FERNANDA] Configurar CI/CD',
            status: SubtaskStatus.TODO,
            priority: Priority.HIGH,
            assignedToId: fernanda.id,
            estimatedHours: 6,
          },
          {
            title: '[RICARDO] Migrar banco',
            status: SubtaskStatus.TODO,
            priority: Priority.URGENT,
            assignedToId: ricardo.id,
            estimatedHours: 8,
          },
        ],
      },
    },
  })

  console.log('✅ Tech Solutions criada!')

  // CONSULTOR MULTI-EMPRESA
  const roberto = await prisma.user.create({
    data: { name: 'Roberto Consultor', email: 'roberto@consultor.com', password },
  })

  await prisma.accountUser.createMany({
    data: [
      { userId: roberto.id, accountId: account1.id, role: UserRole.MANAGER },
      { userId: roberto.id, accountId: account2.id, role: UserRole.ADMIN },
    ],
  })

  console.log('✅ Consultor criado!')

  console.log('\n📊 SEED COMPLETO!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✅ 2 empresas')
  console.log('✅ 7 usuários (1 multi-empresa)')
  console.log('✅ 2 tarefas principais')
  console.log('✅ 7 subtarefas')
  console.log('\n🔐 CREDENCIAIS (senha: password123):')
  console.log('   carlos@premium.com - Verá 1 tarefa')
  console.log('   joao@tech.com - Verá 1 tarefa')
  console.log('   pedro@premium.com - Verá 1 tarefa')
  console.log('   roberto@consultor.com - Multi-empresa')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    // eslint-disable-next-line no-undef
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
