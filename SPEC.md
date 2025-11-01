# Spec - Sistema de Tarefas

## Modelo de Dados

**Usuários**: Autenticação multi-tenant. Papéis: OWNER, ADMIN, MANAGER, MEMBER.

**Tarefas**:
- MainTask: Projeto. Status: NOT_STARTED, IN_PROGRESS, COMPLETED, CANCELLED
- Subtask: Executável. Status: TODO → IN_PROGRESS → COMPLETED_PENDING → APPROVED/REJECTED
- Conclusão automática: MainTask completa quando todas Subtasks aprovadas

**Dependências**: Subtask pode depender de outra. Previne ciclos.

**Aprovação**: Subtask com `requiresApproval=true` precisa aprovação de MANAGER/ADMIN.

**Recorrência**: Subtask pode ser recorrente (DIALY, WEEKLY, MONTHLY, CUSTOM).

## Regras de Negócio

1. Apenas MANAGER+ pode criar MainTask
2. Subtask atribuída a MEMBER
3. Status MainTask atualizado automaticamente
4. Dependências verificadas antes de mover para IN_PROGRESS
5. Notificações criadas em mudanças de status/atribuição

## API (tRPC)

- `mainTask.*`: CRUD de tarefas principais
- `subtask.*`: CRUD, mudança de status, dependências
- `comment.*`: Comentários em subtasks
- `user.*`: Gestão de usuários (ADMIN+)
- `notification.*`: Leitura de notificações

## UI

- Kanban: Drag & drop entre colunas (TODO, IN_PROGRESS, BLOCKED, COMPLETED_PENDING)
- Dashboard: Filtros por status/prioridade/usuário
- Aprovação: Painel para MANAGER revisar tarefas pendentes
- Multi-tenant: Seleção de conta por slug

