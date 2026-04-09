# Organiza API

API REST para integração externa com o Organiza.

## Autenticação

Use sua **API Key** no header:

```
api_access_token: sk_sua_chave_aqui
```

Ou:

```
Authorization: Bearer sk_sua_chave_aqui
```

**Como obter a API Key:** **Meu Perfil** (menu do usuário) → Integrações → Criar API Key. A chave é exibida apenas uma vez — copie e guarde em local seguro.

**Webhooks:** Em **Meu Perfil** → Integrações, configure webhooks para receber notificações em tempo real quando eventos ocorrerem. Escolha a URL de destino e os eventos desejados.

## Base URL

```
/api/v1/accounts/{account_id}/...
```

O `account_id` está em **Meu Perfil** (menu do usuário).

## Onde encontrar os IDs

- **Account ID:** Página Integrações
- **IDs de projetos, clientes, subtarefas e atributos personalizados:** Retornados nas respostas da API ao listar ou criar recursos (campo `id` em cada item)

## Endpoints

### Conta
- `GET /api/v1/accounts/{account_id}` — Detalhes da conta (valida o token)

### Projetos
- `GET /api/v1/accounts/{account_id}/projects` — Listar projetos
- `POST /api/v1/accounts/{account_id}/projects` — Criar projeto
- `GET /api/v1/accounts/{account_id}/projects/{project_id}` — Obter projeto
- `PATCH /api/v1/accounts/{account_id}/projects/{project_id}` — Atualizar projeto
- `DELETE /api/v1/accounts/{account_id}/projects/{project_id}` — Excluir projeto

### Subtarefas
- `GET /api/v1/accounts/{account_id}/projects/{project_id}/subtasks` — Listar subtarefas (cada item inclui `client_id` e `client` do projeto, quando houver contato vinculado)
- `POST /api/v1/accounts/{account_id}/projects/{project_id}/subtasks` — Criar subtarefa (resposta inclui `client_id` e `client` do projeto quando houver)
- `GET /api/v1/accounts/{account_id}/projects/{project_id}/subtasks/{subtask_id}` — Obter uma subtarefa
- `PATCH /api/v1/accounts/{account_id}/projects/{project_id}/subtasks/{subtask_id}` — Atualizar **checklist** da subtarefa (substitui o array inteiro de itens)

**Checklist (`checklist_items`):** em cada subtarefa, lista opcional de objetos `{ "id": "string", "text": "string", "checked": boolean }`. No `POST`, o campo é opcional: omitir não define checklist; `null` ou `[]` grava sem itens. No `PATCH` da subtarefa, `checklist_items` é obrigatório no body; use `null` ou `[]` para limpar. Máximo de 100 itens por subtarefa; texto de cada item até 2000 caracteres; `id` único dentro do array. Alterações de checklist **via `PATCH` desta API não disparam webhooks** (não há evento `task.updated` na lista de webhooks).

### Clientes
- `GET /api/v1/accounts/{account_id}/clients` — Listar clientes
- `POST /api/v1/accounts/{account_id}/clients` — Criar cliente
- `GET /api/v1/accounts/{account_id}/clients/{client_id}` — Obter cliente
- `PATCH /api/v1/accounts/{account_id}/clients/{client_id}` — Atualizar cliente

Respostas de cliente incluem `internal_metadata` (objeto JSON ou `null`): metadados **somente para integrações via esta API** (não disponíveis no app web). No `POST`/`PATCH`, envie `internal_metadata` como objeto ou `null` para limpar; omitir o campo não altera o valor armazenado. Tamanho máximo após serialização: 64 KiB. Nos webhooks `client.created` e `client.updated`, o campo `internalMetadata` espelha esse valor (ou `null`).

### Atributos personalizados de clientes
- `GET /api/v1/accounts/{account_id}/client-custom-attributes` — Listar atributos
- `POST /api/v1/accounts/{account_id}/client-custom-attributes` — Criar atributo
- `POST /api/v1/accounts/{account_id}/client-custom-attributes/bulk` — Criar atributos em massa
- `DELETE /api/v1/accounts/{account_id}/client-custom-attributes` — Excluir atributos em massa (body: `{ "ids": ["id1", "id2"] }`)

## Formato de resposta

Sucesso:
```json
{
  "payload": { ... }
}
```

Listas (com meta):
```json
{
  "payload": [ ... ],
  "meta": { "count": 10 }
}
```

Erro:
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "code": "UNAUTHORIZED"
}
```

## Exemplos

### Listar projetos
```bash
curl -X GET "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/projects" \
  -H "api_access_token: sk_sua_chave"
```

### Criar projeto
```bash
curl -X POST "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/projects" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"title": "Novo projeto", "description": "Descrição", "priority": "high"}'
```

### Criar subtarefa
```bash
curl -X POST "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/projects/PROJECT_ID/subtasks" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"title": "Revisar documento"}'
```

### Criar subtarefa com checklist
```bash
curl -X POST "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/projects/PROJECT_ID/subtasks" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"title": "Onboarding","checklist_items":[{"id":"a1","text":"Enviar contrato","checked":false},{"id":"a2","text":"Assinar","checked":false}]}'
```

### Atualizar checklist de uma subtarefa
```bash
curl -X PATCH "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/projects/PROJECT_ID/subtasks/SUBTASK_ID" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"checklist_items":[{"id":"a1","text":"Enviar contrato","checked":true},{"id":"a2","text":"Assinar","checked":false}]}'
```

### Atualizar cliente (adicionar atributos)
```bash
curl -X PATCH "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/clients/CLIENT_ID" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"custom_values": {"ID_ATRIBUTO_CNPJ": "12.345.678/0001-90"}}'
```
*Nota: `custom_values` substitui os valores anteriores. Para adicionar sem remover, faça GET do cliente, mescle os valores e envie o objeto completo.*

*As chaves de `custom_values` aceitam tanto o **ID do atributo** quanto o **nome do atributo** (ex.: `"tipo_garantia"` ou `"cm4abc123xyz"`).*

*Na resposta, `custom_values` retorna as chaves como **nomes dos atributos** (não IDs). Chaves enviadas que não correspondem a nenhum atributo são ignoradas; nesse caso, a resposta inclui `meta.unmapped_keys` com a lista das chaves não mapeadas.*

### Metadados internos (`internal_metadata`)

Exclusivo da API REST com API key. Exemplo no PATCH:

```bash
curl -X PATCH "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/clients/CLIENT_ID" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"internal_metadata": {"id_externo": "abc-123", "origem": "erp"}}'
```

### Criar atributo personalizado
```bash
curl -X POST "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/client-custom-attributes" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"name": "CNPJ", "type": "TEXT"}'
```

### Criar atributos em massa
```bash
curl -X POST "https://seu-dominio.com/api/v1/accounts/SEU_ACCOUNT_ID/client-custom-attributes/bulk" \
  -H "Content-Type: application/json" \
  -H "api_access_token: sk_sua_chave" \
  -d '{"attributes": [{"name": "CNPJ", "type": "TEXT"}, {"name": "Foto", "type": "FILE"}]}'
```

## Webhooks

Configure webhooks em **Meu Perfil** → Integrações para receber notificações em tempo real. Cada evento envia um POST para sua URL com o payload:

```json
{
  "event": "task.created",
  "timestamp": "2025-03-17T12:00:00Z",
  "accountId": "clx...",
  "data": { ... }
}
```

Nos eventos de **tarefa** (`task.created`, `task.started`, `task.reopened`, `task.blocked`, `task.unblocked`, `task.completed`, `task.approved`, `task.rejected`, `task.reassigned`, `task.full_completed`), o objeto `data` inclui `clientId` e `client` (`id`, `name`, `email`) do contato vinculado ao **projeto** da tarefa, ou `clientId: null` e `client: null` se não houver vínculo.

- **`task.reopened`**: quando a subtarefa volta para **A fazer** (`TODO`) a partir de outro status.
- **`task.completed`**: também pode incluir `automationSource` (ex.: desbloqueio automático por dependências ou botão inteligente).
- **`task.approved`**: em conclusão com aprovação automática, o campo `autoApproved: true` indica que não passou pelo gestor.

Nos eventos `client.created` e `client.updated`, `data` inclui os campos do contato e **`internalMetadata`** (objeto ou `null`), quando existir metadado interno gravado pela API.

**Eventos disponíveis:** `task.created`, `task.started`, `task.reopened`, `task.blocked`, `task.unblocked`, `task.completed`, `task.approved`, `task.rejected`, `task.reassigned`, `task.full_completed`, `project.created`, `project.updated`, `project.deleted`, `client.created`, `client.updated`, `service_payment.created`, `service_payment.approved`, `service_payment.rejected`, `service_payment.paid`, `comment.added`.

Se configurar um secret, o header `X-Webhook-Signature` conterá assinatura HMAC-SHA256 do body para validar a origem.

## Documentação

- **Swagger UI:** `/docs` — interface interativa para explorar e testar a API
- **Spec JSON:** `GET /api/v1/openapi` — para importar no Postman ou Insomnia
