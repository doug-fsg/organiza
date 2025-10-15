# Organiza - Sistema de Gerenciamento de Tarefas

Um sistema completo de gerenciamento de tarefas com Kanban, desenvolvido com Next.js, tRPC, Prisma e ShadCN.

## 🚀 Características

### Funcionalidades Principais

- **Usuários com Papéis Diferentes**:
  - 👨‍💼 **Administrador**: Acesso completo ao sistema
  - 👨‍💻 **Gerente**: Pode criar tarefas principais e acompanhar progresso
  - 👩‍💻 **Membro**: Executa subtarefas no quadro Kanban

- **Sistema de Tarefas Hierárquico**:
  - 📋 **Tarefas Principais**: Projetos grandes com múltiplos responsáveis
  - ✅ **Subtarefas**: Tarefas individuais atribuídas a usuários específicos
  - 🔄 **Status Automatizado**: Tarefa principal só é concluída quando todas as subtarefas estão finalizadas

- **Quadro Kanban Individual com Drag & Drop**:
  - 📝 **A Fazer**: Subtarefas aguardando início
  - ⏳ **Em Andamento**: Subtarefas sendo executadas
  - 🚫 **Bloqueado**: Subtarefas com impedimentos
  - ✅ **Concluído**: Subtarefas finalizadas
  - 🖱️ **Interface Intuitiva**: Arraste e solte tarefas entre colunas

- **Tela de Gerenciamento Completa**:
  - ➕ Criar tarefas principais e subtarefas
  - 👥 Atribuir responsáveis
  - 📊 Acompanhar progresso em tempo real
  - 🎯 Definir prioridades e prazos

- **Dashboard Global do Gestor**:
  - 🔍 Filtros avançados por status, prioridade, usuário
  - 📈 Métricas de desempenho da equipe
  - 📋 Visualização consolidada de todas as tarefas
  - 🎲 Timeline de projetos

- **Sistema de Relatórios e Analytics**:
  - 📊 Métricas detalhadas de produtividade
  - 📈 Tendências mensais de conclusão
  - 🏆 Ranking de performance da equipe
  - 💾 Exportação de relatórios em JSON
  - ⏱️ Análise de eficiência (tempo estimado vs real)

- **Sistema de Dependências**:
  - 🔗 Dependências entre subtarefas
  - ⚠️ Prevenção de dependências circulares
  - 🎯 Indicadores visuais de bloqueios

- **Notificações em Tempo Real**:
  - 🔔 Alertas automáticos sobre mudanças de status
  - 📱 Centro de notificações integrado
  - ⚡ Atualizações instantâneas via polling
  - 🎨 Notificações visuais com toast

- **Recursos Avançados**:
  - 💬 Sistema de comentários por subtarefa
  - 📅 Prazos e prioridades
  - ⏱️ Controle de horas estimadas/reais
  - 🎨 Interface moderna e responsiva
  - 🔄 Atualizações automáticas em tempo real

## 🛠️ Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI**: ShadCN UI, Tailwind CSS, Lucide Icons
- **Backend**: tRPC, Prisma ORM
- **Banco de Dados**: SQLite
- **Validação**: Zod

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Passos

1. **Clone o repositório**:
```bash
git clone <url-do-repositorio>
cd organiza
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
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 👥 Usuários de Exemplo

Após executar o seed, você terá acesso aos seguintes usuários:

### Administrador
- **Nome**: João Silva
- **Email**: joao@exemplo.com
- **Papel**: Administrador

### Gerente
- **Nome**: Maria Santos  
- **Email**: maria@exemplo.com
- **Papel**: Gerente

### Desenvolvedores
- **Nome**: Pedro Backend
- **Email**: pedro@exemplo.com
- **Papel**: Membro (Backend)

- **Nome**: Ana Frontend
- **Email**: ana@exemplo.com
- **Papel**: Membro (Frontend)

## 🎯 Como Usar

### 1. Seleção de Usuário
- Na tela inicial, escolha um usuário existente ou crie um novo
- Cada usuário tem diferentes permissões e visualizações

### 2. Quadro Kanban Pessoal
- Visualize suas subtarefas organizadas por status
- Arraste e mova tarefas entre as colunas
- Veja dependências e bloqueios

### 3. Gerenciamento (Para Gerentes/Admins)
- Crie tarefas principais
- Atribua subtarefas aos membros da equipe
- Acompanhe o progresso geral

### 4. Colaboração
- Adicione comentários nas subtarefas
- Receba notificações sobre atualizações
- Gerencie dependências entre tarefas

## 🗂️ Estrutura do Projeto

```
src/
├── app/                    # Rotas da aplicação
├── components/             # Componentes React
│   ├── ui/                # Componentes base do ShadCN
│   ├── dashboard-layout.tsx
│   ├── kanban-board.tsx
│   └── user-selector.tsx
├── lib/                   # Utilitários
│   ├── api.ts            # Cliente tRPC
│   ├── prisma.ts         # Cliente Prisma
│   └── utils.ts          # Utilitários gerais
├── providers/             # Providers React
│   └── trpc-provider.tsx
└── server/                # Servidor tRPC
    └── api/
        ├── routers/       # Routers da API
        ├── root.ts        # Router principal
        └── trpc.ts        # Configuração tRPC

prisma/
├── schema.prisma          # Schema do banco
└── migrations/            # Migrações

scripts/
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

# Produção
npm run build           # Build para produção
npm run start           # Inicia servidor de produção

# Linting
npm run lint            # Executa ESLint
```

## 🔧 Configuração do Banco

O sistema usa SQLite por padrão. Para usar outro banco:

1. Altere o `provider` no `schema.prisma`
2. Configure a `DATABASE_URL` no arquivo `.env`
3. Execute as migrações: `npm run db:migrate`

## 🎨 Personalização

### Temas
O sistema usa Tailwind CSS e ShadCN. Para personalizar:
- Edite `globals.css` para cores customizadas
- Modifique `components.json` para configurações do ShadCN

### Funcionalidades
- Adicione novos routers em `src/server/api/routers/`
- Crie novos componentes em `src/components/`
- Estenda o schema Prisma conforme necessário

## 🚀 Próximos Passos

### Funcionalidades Planejadas
- [x] Sistema de notificações em tempo real ✅
- [x] Relatórios e dashboard do gestor ✅
- [x] Drag & drop no Kanban ✅
- [x] Dashboard global com filtros ✅
- [ ] Upload de arquivos anexos
- [ ] Integração com calendário
- [ ] API de webhooks
- [ ] Modo offline (PWA)
- [ ] Notificações push do navegador
- [ ] Gráficos interativos com Chart.js

### Melhorias Técnicas
- [ ] Autenticação JWT
- [ ] Cache com Redis
- [ ] Deploy automatizado
- [ ] Testes automatizados
- [ ] Monitoring e logs

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

---

**Organiza** - Sistema de Gerenciamento de Tarefas Moderno e Escalável