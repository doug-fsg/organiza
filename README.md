# Organiza - Sistema de Gerenciamento de Tarefas Multi-Tenant

Um sistema completo de gestão de tarefas e projetos para equipes, com controle de pagamentos a fornecedores, desenvolvido com Next.js, tRPC, Prisma e ShadCN UI.

## 📋 O que é e para que serve?

O **Organiza** é uma plataforma de gestão de tarefas e projetos que permite:

- **Organizar tarefas da equipe**: Criar projetos, dividir em subtarefas e atribuir responsáveis
- **Aprovar trabalhos**: Sistema de aprovação onde gestores revisam e aprovam tarefas concluídas
- **Gerenciar pagamentos a fornecedores**: Fluxo completo de cadastro → aprovação → pagamento de serviços
- **Trabalhar com múltiplas empresas**: Arquitetura multi-tenant onde cada empresa tem seus dados isolados

### 🎯 Casos de Uso

- **Empresas** que precisam organizar projetos e equipes
- **Equipes de desenvolvimento** gerenciando sprints e tarefas
- **Gestão de fornecedores** com controle de pagamentos
- **Controle financeiro** de serviços prestados

## 🔄 Sistemas Similares

O Organiza se inspira e oferece funcionalidades similares a:

- **[Trello](https://trello.com)**: Quadro Kanban com drag & drop para organização visual de tarefas
- **[Asana](https://asana.com)**: Gestão de projetos hierárquicos com tarefas principais e subtarefas
- **[Jira](https://www.atlassian.com/software/jira)**: Sistema de aprovação e workflow para equipes
- **[Monday.com](https://monday.com)**: Dashboard unificado com múltiplas visualizações e filtros
- **[ClickUp](https://clickup.com)**: Tarefas recorrentes e dependências entre tarefas
- **[Notion](https://www.notion.so)**: Sistema de comentários e colaboração em tempo real
- **[Basecamp](https://basecamp.com)**: Multi-tenancy e isolamento de dados por empresa

### 🆚 Diferenças Principais

- ✅ **Multi-tenancy nativo**: Cada empresa tem seus dados completamente isolados
- ✅ **Sistema de pagamentos integrado**: Fluxo completo de fornecedores → gestores → financeiro
- ✅ **Aprovação obrigatória**: Workflow de aprovação para garantir qualidade
- ✅ **Open source**: Código aberto e totalmente customizável
- ✅ **Self-hosted**: Você controla seus próprios dados

## 🚀 Características Principais

### 📊 Gestão de Tarefas Hierárquica

- **Tarefas Principais (Projetos)**: Projetos grandes com múltiplos responsáveis
- **Subtarefas**: Tarefas individuais atribuídas a membros específicos
- **Status Automático**: Tarefa principal só é concluída quando todas as subtarefas são aprovadas
- **Prioridades**: LOW, MEDIUM, HIGH, URGENT
- **Prazos**: Controle de deadlines e alertas

### 🎯 Quadro Kanban com Drag & Drop

- **TODO**: Subtarefas aguardando início
- **IN_PROGRESS**: Subtarefas sendo executadas
- **BLOCKED**: Subtarefas com impedimentos
- **COMPLETED_PENDING**: Aguardando aprovação
- **APPROVED/REJECTED**: Aprovadas ou recusadas por gestores

### ✅ Sistema de Aprovação

- Subtarefas podem exigir aprovação de gestores antes de serem consideradas concluídas
- Painel dedicado para gestores revisarem tarefas pendentes
- Motivos de rejeição e feedback para membros
- Notificações automáticas sobre aprovações/rejeições

### 💰 Sistema de Pagamentos a Fornecedores

- **Fornecedores**: Cadastram serviços prestados com anexos
- **Gestores**: Aprovam ou recusam serviços
- **Financeiro**: Marca como pago e anexa comprovantes
- Fluxo completo: PENDING → APPROVED → PAID
- Upload de arquivos e comprovantes

### 🏢 Multi-Tenancy

- Múltiplas empresas/contas isoladas
- Usuários podem pertencer a várias empresas com papéis diferentes
- Isolamento completo de dados por conta
- Troca de conta sem logout

### 👥 Gestão de Usuários e Permissões

- **OWNER**: Dono da conta (acesso total)
- **ADMIN**: Administrador (gerenciamento completo)
- **MANAGER**: Gerente (criar tarefas e aprovar)
- **MEMBER**: Membro (executar subtarefas)
- **SUPPLIER**: Fornecedor (cadastrar serviços)
- **FINANCIAL**: Financeiro (processar pagamentos)

### 🔗 Recursos Avançados

- **Dependências entre subtarefas**: Prevenção de dependências circulares
- **Tarefas recorrentes**: Diárias, semanais, mensais ou customizadas
- **Comentários**: Sistema de discussão por subtarefa com anexos
- **Checklist**: Itens de verificação por subtarefa
- **Notificações em tempo real**: Alertas sobre mudanças de status
- **Logs de atividade**: Histórico completo de ações
- **Controle de horas**: Estimadas vs reais
- **Dashboard unificado**: Métricas, filtros e relatórios

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: ShadCN UI, Tailwind CSS, Lucide Icons
- **Backend**: tRPC, Prisma ORM
- **Banco de Dados**: SQLite (configurável para PostgreSQL/MySQL)
- **Autenticação**: NextAuth.js com JWT
- **Validação**: Zod
- **Outros**: bcryptjs, date-fns, node-cron, nodemailer

## 📦 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn

### Passos

1. **Clone o repositório**:
```bash
git clone <url-do-repositorio>
cd <pasta-do-projeto>
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure o banco de dados**:
```bash
npm run db:migrate
npm run db:seed
```

4. **Inicie o servidor de desenvolvimento**:
```bash
npm run dev
```

5. **Acesse a aplicação**:
Abra [http://localhost:3000](http://localhost:3000) no navegador (se configurou `PORT` no `.env`, use essa porta e alinhe `NEXTAUTH_URL` — veja [Variáveis de Ambiente](#variáveis-de-ambiente)).

## 👥 Usuários de Exemplo

Após executar o seed, você terá acesso aos seguintes usuários (senha: `password123`):

### Empresa 1: Imobiliária Premium
- **carlos@premium.com** (OWNER)
- **maria@premium.com** (ADMIN)
- **pedro@premium.com** (MANAGER)
- **ana@premium.com** (MEMBER)

### Empresa 2: Tech Solutions
- **joao@tech.com** (OWNER)
- **fernanda@tech.com** (MANAGER)
- **ricardo@tech.com** (MEMBER)

### Consultor Multi-Empresa
- **roberto@consultor.com** (trabalha nas 2 empresas)

## 🎯 Como Usar

### 1. Autenticação
- Faça login com suas credenciais
- Se você pertence a múltiplas empresas, selecione a conta ativa
- O sistema mostra apenas dados da empresa selecionada

### 2. Quadro Kanban Pessoal
- Visualize suas subtarefas organizadas por status
- Arraste e solte tarefas entre as colunas para mudar o status
- Veja dependências e bloqueios visuais

### 3. Gerenciamento (Para Gerentes/Admins)
- Crie tarefas principais (projetos)
- Atribua subtarefas aos membros da equipe
- Acompanhe o progresso geral no dashboard
- Revise e aprove tarefas pendentes

### 4. Sistema de Pagamentos

#### Para Fornecedores:
- Acesse a área "Fornecedor"
- Cadastre novos serviços prestados
- Anexe fotos/notas fiscais
- Acompanhe o status dos pagamentos

#### Para Gestores:
- Revise serviços pendentes de aprovação
- Aprove ou recuse com motivo
- Visualize anexos e detalhes

#### Para Financeiro:
- Veja serviços aprovados aguardando pagamento
- Marque como pago e anexe comprovante
- Controle histórico de pagamentos

### 5. Colaboração
- Adicione comentários nas subtarefas
- Receba notificações sobre atualizações
- Gerencie dependências entre tarefas
- Use checklist para organizar tarefas complexas

## 🗂️ Estrutura do Projeto

```
organiza/
├── src/
│   ├── app/                    # Rotas Next.js
│   │   ├── api/               # API routes (NextAuth)
│   │   ├── auth/              # Páginas de autenticação
│   │   ├── fornecedor/        # Área do fornecedor
│   │   ├── gestor/            # Área do gestor
│   │   └── financeiro/        # Área financeiro
│   ├── components/            # Componentes React
│   │   ├── ui/               # Componentes base ShadCN
│   │   ├── kanban-board.tsx
│   │   ├── unified-dashboard.tsx
│   │   └── ...
│   ├── lib/                   # Utilitários
│   │   ├── api.ts            # Cliente tRPC
│   │   ├── prisma.ts         # Cliente Prisma
│   │   └── auth.ts           # Configuração NextAuth
│   ├── server/                # Servidor tRPC
│   │   └── api/
│   │       ├── routers/      # Routers da API
│   │       └── trpc.ts       # Configuração tRPC
│   └── middleware.ts          # Middleware Next.js
├── prisma/
│   ├── schema.prisma          # Schema do banco
│   └── migrations/            # Migrações
└── scripts/
    └── seed.ts               # Script de população inicial
```

## 📱 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor de desenvolvimento

# Banco de dados
npm run db:generate      # Gera cliente Prisma
npm run db:migrate       # Executa migrações
npm run db:seed          # Popula banco com dados exemplo
npm run db:reset         # Reseta banco e reexecuta seed
npm run db:migrate-from-sqlite  # Copia dados de prisma/dev.db para PostgreSQL (ver script)

# Produção
npm run build           # Build para produção
npm run start           # Inicia servidor de produção

# Linting
npm run lint            # Executa ESLint
```

## 🔧 Configuração

### Banco de Dados

O projeto usa **PostgreSQL** com Prisma. Há backup das migrações antigas em `prisma/migrations_sqlite_backup` se precisar consultar o histórico SQLite.

1. Configure `DATABASE_URL` no `.env` (ex.: `postgresql://usuario:senha@localhost:5432/organiza`)
2. `pnpm prisma migrate deploy` (ou `db:migrate` em dev)
3. Para importar dados de um `dev.db` antigo: `pnpm run db:migrate-from-sqlite` (banco alvo vazio; use `--force` para truncar e reimportar)

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/organiza"
NEXTAUTH_SECRET="seu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Opcional: porta do servidor Next.js (padrão 3000). O Next.js lê do .env em dev e start.
PORT=3000
```

Se definir outra porta (por exemplo `PORT=4000`), use **a mesma origem** em `NEXTAUTH_URL` (ex.: `http://localhost:4000`), senão login e links de e-mail podem apontar para a porta errada. Em hospedagens (Vercel, Railway, etc.), a porta costuma ser definida pela plataforma — não é necessário fixar `PORT` no `.env` local delas se o host já injeta a variável.

## 🎨 Personalização

### Temas
O sistema usa Tailwind CSS e ShadCN. Para personalizar:
- Edite `src/app/globals.css` para cores customizadas
- Modifique `components.json` para configurações do ShadCN

### Funcionalidades
- Adicione novos routers em `src/server/api/routers/`
- Crie novos componentes em `src/components/`
- Estenda o schema Prisma conforme necessário

## 📊 Funcionalidades Implementadas

- [x] Sistema multi-tenant completo ✅
- [x] Autenticação com NextAuth ✅
- [x] Quadro Kanban com drag & drop ✅
- [x] Sistema de aprovação de tarefas ✅
- [x] Sistema de pagamentos a fornecedores ✅
- [x] Notificações em tempo real ✅
- [x] Dashboard unificado com métricas ✅
- [x] Tarefas recorrentes ✅
- [x] Dependências entre subtarefas ✅
- [x] Sistema de comentários com anexos ✅
- [x] Upload de arquivos ✅
- [x] Logs de atividade ✅
- [x] Relatórios e analytics ✅

## 🚀 Próximos Passos

### Funcionalidades Planejadas
- [ ] Integração com calendário
- [ ] API de webhooks
- [ ] Modo offline (PWA)
- [ ] Notificações push do navegador
- [ ] Gráficos interativos com Chart.js
- [ ] Exportação de relatórios em PDF/Excel

### Melhorias Técnicas
- [ ] Cache com Redis
- [ ] Deploy automatizado
- [ ] Testes automatizados (Jest/Vitest)
- [ ] Monitoring e logs estruturados
- [ ] Documentação da API (Swagger)

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

**Organiza** - Sistema de Gerenciamento de Tarefas Moderno e Escalável

Desenvolvido com ❤️ usando Next.js, tRPC, Prisma e ShadCN UI
