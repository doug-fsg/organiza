/**
 * Eventos disponíveis para webhooks.
 * Nomenclatura: usamos "task" (tarefa) em vez de "subtask".
 */
export const WEBHOOK_EVENTS = {
  task: [
    { id: 'task.created', label: 'Tarefa criada' },
    { id: 'task.started', label: 'Tarefa iniciada' },
    { id: 'task.reopened', label: 'Tarefa retornada a fazer' },
    { id: 'task.blocked', label: 'Tarefa bloqueada' },
    { id: 'task.unblocked', label: 'Tarefa desbloqueada' },
    { id: 'task.completed', label: 'Tarefa concluída' },
    { id: 'task.approved', label: 'Tarefa aprovada' },
    { id: 'task.rejected', label: 'Tarefa rejeitada' },
    { id: 'task.reassigned', label: 'Tarefa reatribuída' },
  ],
  project: [
    { id: 'project.created', label: 'Projeto criado' },
    { id: 'project.updated', label: 'Projeto atualizado' },
    { id: 'project.deleted', label: 'Projeto excluído' },
  ],
  client: [
    { id: 'client.created', label: 'Cliente criado' },
    { id: 'client.updated', label: 'Cliente atualizado' },
  ],
  service_payment: [
    { id: 'service_payment.created', label: 'Pagamento cadastrado' },
    { id: 'service_payment.approved', label: 'Pagamento aprovado' },
    { id: 'service_payment.rejected', label: 'Pagamento rejeitado' },
    { id: 'service_payment.paid', label: 'Pagamento pago' },
  ],
  comment: [
    { id: 'comment.added', label: 'Comentário adicionado' },
  ],
} as const

export type WebhookEventId = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS][number]['id']

export const ALL_WEBHOOK_EVENT_IDS: WebhookEventId[] = Object.values(WEBHOOK_EVENTS).flatMap(
  (group) => group.map((e) => e.id as WebhookEventId)
)
