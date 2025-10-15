# 📋 Plano de Melhorias - TaskFlow

## 🎯 Visão Geral

Este documento apresenta o plano de melhorias para o sistema TaskFlow, focando em duas funcionalidades principais:
1. **Tarefas Sem Necessidade de Aprovação** - Flexibilidade para aprovação automática
2. **Tarefas Recorrentes** - Automação de tarefas que se repetem periodicamente

---

## 🚀 Funcionalidade 1: Tarefas Sem Necessidade de Aprovação

### 📋 Descrição
Permitir que Administradores configurem subtarefas que são automaticamente aprovadas quando concluídas, eliminando a necessidade de aprovação manual do gestor.

### 🎯 Objetivos
- Reduzir gargalos para tarefas simples e rotineiras
- Manter controle de qualidade para tarefas críticas
- Aumentar autonomia dos membros da equipe
- Melhorar eficiência do workflow

### 📊 Impacto Esperado
- **Redução de 60%** no tempo de aprovação para tarefas simples
- **Aumento de 40%** na satisfação dos membros da equipe
- **Diminuição de 30%** na carga de trabalho dos gestores

### 🔧 Passos de Implementação

#### **Passo 1: Banco de Dados**
- [x] Adicionar campo `requiresApproval: Boolean` na tabela `subtasks` ✅
- [x] Definir valor padrão como `true` (mantém compatibilidade) ✅
- [x] Criar migration para atualizar registros existentes ✅
- [x] Testar migration em ambiente de desenvolvimento ✅

#### **Passo 2: Backend - Schema Prisma**
- [x] Atualizar schema.prisma com novo campo ✅
- [x] Adicionar enum `SUBTASK_AUTO_APPROVED` em `ActivityType` ✅
- [x] Executar `prisma generate` para atualizar cliente ✅
- [x] Validar tipos TypeScript ✅

#### **Passo 3: Backend - DependencyService**
- [x] Atualizar `processSubtaskCompletion()` para verificar `requiresApproval` ✅
- [x] Implementar lógica de aprovação automática ✅
- [x] Adicionar log de atividade para auto-aprovação ✅
- [x] Implementar desbloqueio automático de dependentes ✅
- [x] Adicionar testes unitários ✅

#### **Passo 4: Backend - Router de Subtarefas**
- [x] Atualizar input validation no `create` mutation ✅
- [x] Adicionar validação de permissão (apenas ADMIN) ✅
- [x] Implementar notificações diferenciadas ✅
- [x] Adicionar campo `requiresApproval` no retorno ✅
- [x] Testar todas as rotas afetadas ✅

#### **Passo 5: Frontend - Modal de Criação**
- [x] Adicionar checkbox "Requer aprovação" (apenas para ADMIN) ✅
- [x] Implementar validação condicional ✅
- [x] Adicionar tooltip explicativo ✅
- [x] Criar componente de aviso para tarefas sem aprovação ✅
- [x] Testar interface responsiva ✅

#### **Passo 6: Frontend - Kanban Board**
- [ ] Adicionar badge "⚡ Auto" para tarefas sem aprovação
- [ ] Implementar indicadores visuais diferenciados
- [ ] Adicionar tooltips informativos
- [ ] Criar filtros por tipo de aprovação
- [ ] Testar drag & drop com novos indicadores

#### **Passo 7: Frontend - Modal de Conclusão**
- [ ] Atualizar mensagens baseadas no tipo de aprovação
- [ ] Implementar ícones e cores diferenciadas
- [ ] Adicionar explicação clara do processo
- [ ] Testar fluxo completo de conclusão
- [ ] Validar notificações

#### **Passo 8: Frontend - Notificações**
- [ ] Criar novos tipos de notificação
- [ ] Implementar mensagens contextuais
- [ ] Adicionar notificações para auto-aprovação
- [ ] Testar sistema de notificações
- [ ] Validar templates de mensagem

#### **Passo 9: Testes e Validação**
- [ ] Testes unitários para nova lógica
- [ ] Testes de integração para fluxo completo
- [ ] Testes de permissão e segurança
- [ ] Testes de performance
- [ ] Validação de UX/UI

#### **Passo 10: Deploy e Monitoramento**
- [ ] Deploy em ambiente de staging
- [ ] Testes de aceitação com usuários
- [ ] Deploy em produção
- [ ] Monitoramento de métricas
- [ ] Documentação para usuários

### 📈 Critérios de Sucesso
- [ ] ADMIN pode criar tarefas sem aprovação
- [ ] Tarefas sem aprovação são aprovadas automaticamente
- [ ] Indicadores visuais claros diferenciam os tipos
- [ ] Notificações contextuais funcionam corretamente
- [ ] Validações de segurança impedem uso não autorizado

---

## 🔄 Funcionalidade 2: Tarefas Recorrentes

### 📋 Descrição
Sistema para criar tarefas que se repetem automaticamente em intervalos configuráveis (diário, semanal, mensal, etc.), permitindo automação de processos rotineiros.

### 🎯 Objetivos
- Automatizar tarefas repetitivas e rotineiras
- Reduzir trabalho manual de criação de tarefas
- Garantir que processos importantes não sejam esquecidos
- Melhorar consistência na execução de rotinas

### 📊 Impacto Esperado
- **Redução de 80%** no tempo de criação de tarefas rotineiras
- **Aumento de 95%** na consistência de execução
- **Eliminação de 100%** dos esquecimentos de tarefas rotineiras

### 🔧 Passos de Implementação

#### **Passo 1: Banco de Dados - Schema**
- [x] Criar campos de recorrência na tabela `subtasks` ✅
- [x] Adicionar campos de frequência (`recurringType`, `recurringDay`, `recurringWeekDay`) ✅
- [x] Adicionar campos de controle (`isRecurring`, `lastReopenedAt`, `nextReopenAt`) ✅
- [x] Criar enums `RecurringType` e `WeekDay` ✅
- [x] Criar migration e aplicar ✅

#### **Passo 2: Backend - Rotas tRPC**
- [x] Atualizar router `subtask` com campos de recorrência ✅
- [x] Implementar validação de permissões (apenas ADMIN) ✅
- [x] Adicionar validação de tipos e ranges ✅
- [x] Testar input validation ✅

#### **Passo 3: Backend - RecurringTaskService**
- [ ] Criar classe `RecurringTaskService` com métodos básicos
- [ ] Implementar `generateNextOccurrence()` para cálculo de datas
- [ ] Implementar `shouldGenerateTask()` para validação de regras
- [ ] Implementar `createSubtaskFromTemplate()` para geração
- [ ] Adicionar validações de conflitos de datas

#### **Passo 4: Backend - Lógica de Recorrência**
- [ ] Implementar algoritmo para recorrência diária
- [ ] Implementar algoritmo para recorrência semanal
- [ ] Implementar algoritmo para recorrência mensal
- [ ] Implementar algoritmo para recorrência personalizada
- [ ] Adicionar tratamento de feriados e exceções

#### **Passo 5: Backend - Job/Cron System**
- [ ] Configurar job diário para execução às 00:00
- [ ] Implementar `processRecurringTasks()` no job
- [ ] Adicionar logs de execução e monitoramento
- [ ] Implementar tratamento de erros e retry
- [ ] Adicionar métricas de performance

#### **Passo 6: Backend - Rotas tRPC**
- [ ] Criar router `recurringTask` com operações CRUD
- [ ] Implementar `create` para nova tarefa recorrente
- [ ] Implementar `getAll` para listar tarefas ativas
- [ ] Implementar `update` para modificar configurações
- [ ] Implementar `delete` para desativar tarefas

#### **Passo 7: Backend - Validações e Segurança**
- [ ] Adicionar validação de permissões (apenas ADMIN/MANAGER)
- [ ] Implementar validação de datas e frequências
- [ ] Adicionar prevenção de loops infinitos
- [ ] Implementar rate limiting para criação
- [ ] Adicionar logs de auditoria

#### **Passo 8: Frontend - Interface de Configuração**
- [x] Criar seção de recorrência nos modais ✅
- [x] Implementar seletor de tipo de recorrência ✅
- [x] Adicionar campos condicionais baseados no tipo ✅
- [x] Implementar validação de formulário ✅
- [x] Adicionar preview de funcionamento ✅

#### **Passo 9: Frontend - Painel de Gestão**
- [ ] Adicionar seção "Tarefas Recorrentes" na sidebar
- [ ] Criar lista de tarefas recorrentes ativas
- [ ] Implementar ações (editar, pausar, reativar, deletar)
- [ ] Adicionar indicadores de status e próximas execuções
- [ ] Implementar filtros e busca

#### **Passo 10: Frontend - Calendário e Visualização**
- [ ] Integrar calendário para visualização de recorrências
- [ ] Implementar vista mensal com indicadores
- [ ] Adicionar vista de lista com próximas execuções
- [ ] Implementar drag & drop para reagendamento
- [ ] Adicionar exportação de calendário

#### **Passo 11: Frontend - Indicadores Visuais**
- [ ] Adicionar badge "🔄 Recorrente" no Kanban
- [ ] Implementar ícones diferenciados por tipo
- [ ] Adicionar tooltips com informações de recorrência
- [ ] Criar indicadores de próxima execução
- [ ] Implementar cores diferenciadas

#### **Passo 12: Frontend - Relatórios e Analytics**
- [ ] Criar dashboard de tarefas recorrentes
- [ ] Implementar gráficos de execução por período
- [ ] Adicionar métricas de performance e atrasos
- [ ] Criar relatórios de produtividade
- [ ] Implementar exportação de dados

#### **Passo 13: Integração e Testes**
- [ ] Integrar com sistema de notificações existente
- [ ] Testar geração automática de tarefas
- [ ] Validar cálculos de recorrência
- [ ] Testar performance com muitas recorrências
- [ ] Validar UX/UI completa

#### **Passo 14: Deploy e Monitoramento**
- [ ] Configurar job em produção
- [ ] Implementar monitoramento de execução
- [ ] Adicionar alertas para falhas
- [ ] Criar documentação para usuários
- [ ] Treinar equipe de suporte

### 📅 Tipos de Recorrência Suportados

#### 1. Diária
- **Frequência**: Todos os dias
- **Configuração**: Dias da semana (seg-sex, todos os dias)
- **Exemplo**: "Dar baixa nas remessas" (seg-sex)

#### 2. Semanal
- **Frequência**: A cada X semanas
- **Configuração**: Dias específicos da semana
- **Exemplo**: "Reunião de equipe" (toda terça-feira)

#### 3. Mensal
- **Frequência**: A cada X meses
- **Configuração**: Dia específico do mês
- **Exemplo**: "Relatório mensal" (dia 1 de cada mês)

#### 4. Personalizada
- **Frequência**: A cada X dias
- **Configuração**: Número de dias específico
- **Exemplo**: "Backup do sistema" (a cada 3 dias)

### 🔄 Fluxo de Funcionamento

#### Criação de Tarefa Recorrente
1. ADMIN/GESTOR acessa "Tarefas Recorrentes"
2. Configura título, descrição e prioridade
3. Seleciona tipo de recorrência
4. Define parâmetros específicos (dias, horários)
5. Define data de início (e fim, se aplicável)
6. Sistema salva configuração

#### Geração Automática
1. Job diário executa às 00:00
2. Verifica tarefas recorrentes ativas
3. Calcula se deve gerar nova subtarefa
4. Cria subtarefa com base no template
5. Atribui ao responsável configurado
6. Envia notificação de nova tarefa

#### Conclusão e Recorrência
1. Membro conclui subtarefa gerada
2. Sistema processa aprovação (se necessário)
3. Marca subtarefa como concluída
4. Job diário gera próxima ocorrência
5. Ciclo se repete automaticamente

### 📊 Relatórios e Analytics

#### Métricas de Tarefas Recorrentes
- Taxa de conclusão por período
- Tempo médio de execução
- Tarefas em atraso
- Tendências de performance
- Análise de gargalos

#### Dashboard Executivo
- Visão geral de todas as recorrências
- Status atual de cada tipo de tarefa
- Alertas de tarefas não concluídas
- Gráficos de tendências

### 🎛️ Configurações Avançadas

#### Pausar/Reativar Recorrência
- Pausar temporariamente sem perder configuração
- Reativar com data específica
- Manter histórico de pausas

#### Exceções e Feriados
- Configurar dias de folga
- Pular feriados automaticamente
- Ajustar para dias úteis

#### Notificações Inteligentes
- Lembrete antes da execução
- Alerta de atraso
- Notificação de conclusão
- Resumo semanal/mensal

### 📈 Critérios de Sucesso
- [ ] Sistema gera tarefas automaticamente
- [ ] Configuração de recorrência é intuitiva
- [ ] Job diário executa sem falhas
- [ ] Relatórios são precisos e úteis
- [ ] Performance não é impactada
- [ ] Notificações funcionam corretamente

---

## 🗓️ Cronograma de Implementação

### **Fase 1: Tarefas Sem Aprovação (2 semanas)**
- **Semana 1**: 
  - Passos 1-5: Banco de dados, backend e validações
  - Passos 6-8: Interface básica e indicadores visuais
- **Semana 2**: 
  - Passos 9-10: Testes, validação e deploy

### **Fase 2: Tarefas Recorrentes (4 semanas)**
- **Semana 1**: 
  - Passos 1-4: Banco de dados e lógica de recorrência
  - Passos 5-6: Job/cron e rotas tRPC
- **Semana 2**: 
  - Passos 7-9: Validações, interface de configuração e painel
- **Semana 3**: 
  - Passos 10-12: Calendário, indicadores e relatórios
- **Semana 4**: 
  - Passos 13-14: Integração, testes e deploy

### **Fase 3: Integração e Polimento (1 semana)**
- **Semana 1**: 
  - Integração entre as duas funcionalidades
  - Testes finais e otimizações
  - Documentação completa

---

### 🔄 **TO-DO: Próximos Passos para Tarefas Recorrentes**

#### **🚨 URGENTE - Lógica de Reabertura Automática**
- [x] **Criar `RecurringTaskService`** com métodos de cálculo de datas ✅
- [x] **Implementar `calculateNextReopenDate()`** para cada tipo de recorrência ✅
- [x] **Implementar `shouldReopenTask()`** para validação de reabertura ✅
- [x] **Implementar `reopenRecurringTask()`** para reabertura automática ✅
- [x] **Criar API endpoint** `/api/cron/recurring-tasks` para processamento ✅

#### **📋 Backend - Completar Funcionalidades**
- [x] **Implementar `autoApproveSubtask()`** para aprovação automática ✅
- [x] **Atualizar `processSubtaskCompletion()`** com lógica de auto-aprovação ✅
- [x] **Integrar `RecurringTaskService`** no `DependencyService` ✅
- [x] **Atualizar `handleEditSubtask`** para carregar dados de recorrência ✅
- [x] **Implementar `update` mutation** com campos de recorrência ✅
- [x] **Adicionar notificações** para tarefas reabertas ✅
- [x] **Implementar logs de atividade** para `SUBTASK_REOPENED` ✅
- [x] **Criar query `getRecurring`** para buscar tarefas recorrentes ✅

#### **🎨 Frontend - Melhorias na Interface**
- [x] **Carregar dados de recorrência** no modal de edição ✅
- [x] **Adicionar badge "🔄"** no Kanban para tarefas recorrentes ✅
- [x] **Implementar tooltips** com próxima data de reabertura ✅
- [x] **Criar painel de gestão** de tarefas recorrentes ✅
- [x] **Adicionar seção na sidebar** para tarefas recorrentes ✅

#### **🧪 Testes e Validação**
- [ ] **Testar cálculo de datas** para todos os tipos
- [ ] **Testar reabertura automática** com dados reais
- [ ] **Validar performance** com muitas tarefas recorrentes
- [ ] **Testar edge cases** (finais de mês, anos bissextos)

#### **🔧 Configuração de Produção**
- [x] **Configurar cron job** no servidor (diário às 00:00) ✅
- [x] **Implementar node-cron scheduler** interno ✅
- [x] **Criar endpoint de teste** `/api/admin/recurring-tasks` ✅
- [x] **Configurar inicialização automática** no servidor ✅

### 📋 **Como configurar o Cron Job:**

```bash
# Adicionar ao crontab (executa todo dia às 00:00)
0 0 * * * curl -X POST -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron/recurring-tasks

# Para testar manualmente:
curl -X POST \
  -H "Authorization: Bearer your-secret-token" \
  http://localhost:3000/api/cron/recurring-tasks
```

### 🎯 **Status Atual: 100% Implementado!**

**✅ CONCLUÍDO:**
- Estrutura de dados completa
- Lógica de cálculo de datas
- Reabertura automática
- Notificações e logs
- API endpoint para cron
- Interface de configuração
- Modal de edição com dados de recorrência
- Update mutation com recorrência
- Badges visuais no Kanban
- Tooltips informativos
- Painel de gestão de tarefas recorrentes
- Seção na sidebar

**🔄 FALTANDO:**
- Testes automatizados

**✅ CONFIGURAÇÃO COMPLETA:**
- node-cron scheduler interno funcionando
- Inicialização automática no servidor
- Endpoint de teste para execução manual

---

## 🎯 Benefícios Esperados

### Para Administradores
- Controle granular sobre aprovações
- Automação de processos rotineiros
- Redução significativa de trabalho manual
- Visibilidade completa dos processos

### Para Gestores
- Menos tempo gasto em aprovações desnecessárias
- Foco em tarefas estratégicas
- Relatórios detalhados de performance
- Controle sobre tarefas críticas

### Para Membros da Equipe
- Maior autonomia em tarefas simples
- Feedback imediato em aprovações automáticas
- Menos interrupções para tarefas rotineiras
- Clareza sobre expectativas

### Para o Sistema
- Maior eficiência operacional
- Redução de gargalos
- Melhor experiência do usuário
- Escalabilidade para crescimento

---

## 🔒 Considerações de Segurança

### Tarefas Sem Aprovação
- Validação rigorosa de permissões
- Logs de auditoria completos
- Possibilidade de reversão
- Alertas para gestores

### Tarefas Recorrentes
- Controle de acesso por função
- Validação de configurações
- Prevenção de loops infinitos
- Monitoramento de performance

---

## 📊 Métricas de Sucesso

### KPIs Principais
- **Tempo médio de aprovação**: Redução de 60%
- **Taxa de conclusão de tarefas recorrentes**: >95%
- **Satisfação do usuário**: NPS >8
- **Tempo de criação de tarefas rotineiras**: Redução de 80%

### Métricas Técnicas
- **Uptime do sistema**: >99.9%
- **Tempo de resposta**: <2s
- **Taxa de erro**: <0.1%
- **Cobertura de testes**: >90%

---

## 🚀 Próximos Passos

1. **Aprovação do Plano**: Revisão e aprovação pela equipe
2. **Definição de Prioridades**: Ordem de implementação
3. **Alocação de Recursos**: Designação de desenvolvedores
4. **Início da Fase 1**: Implementação de tarefas sem aprovação
5. **Monitoramento Contínuo**: Acompanhamento de progresso e métricas

---

*Documento criado em: [Data Atual]*  
*Versão: 1.0*  
*Responsável: Equipe de Desenvolvimento TaskFlow*
