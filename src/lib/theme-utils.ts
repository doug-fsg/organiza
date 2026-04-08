import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { UserRole } from "@prisma/client"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Retorna as classes Tailwind para prioridades de tarefas
 */
export function getPriorityClasses(priority: string): string {
  const priorities: Record<string, string> = {
    URGENT: 'bg-priority-urgent text-priority-urgent-foreground',
    HIGH: 'bg-priority-high text-priority-high-foreground',
    MEDIUM: 'bg-priority-medium text-priority-medium-foreground',
    LOW: 'bg-priority-low text-priority-low-foreground',
  }
  return priorities[priority] || priorities.MEDIUM
}

const ROLE_BADGE_SOFT: Record<UserRole, string> = {
  OWNER:
    "border border-teal/25 bg-teal/15 text-teal dark:border-teal/30 dark:bg-teal/20 dark:text-teal-foreground",
  ADMIN:
    "border border-indigo/25 bg-indigo/15 text-indigo dark:border-indigo/30 dark:bg-indigo/20 dark:text-indigo-foreground",
  MANAGER:
    "border border-primary/25 bg-primary/15 text-primary dark:border-primary/30 dark:bg-primary/20 dark:text-primary-foreground",
  MEMBER: "border border-border bg-muted text-muted-foreground",
  SUPPLIER:
    "border border-coral/25 bg-coral/15 text-coral dark:border-coral/30 dark:bg-coral/20 dark:text-coral-foreground",
  FINANCIAL:
    "border border-amber/25 bg-amber/15 text-amber dark:border-amber/30 dark:bg-amber/20 dark:text-amber-foreground",
}

const ROLE_BADGE_SOLID: Record<UserRole, string> = {
  OWNER: "border-transparent bg-teal text-teal-foreground",
  ADMIN: "border-transparent bg-indigo text-indigo-foreground",
  MANAGER: "border-transparent bg-primary text-primary-foreground",
  MEMBER: "border-transparent bg-secondary text-secondary-foreground",
  SUPPLIER: "border-transparent bg-coral text-coral-foreground",
  FINANCIAL: "border-transparent bg-amber text-amber-foreground",
}

/**
 * Cores de papel (papéis de usuário) alinhadas aos tokens do tema — evite duplicar mapas por componente.
 */
export function getRoleBadgeClasses(role: UserRole, tone: "soft" | "solid" = "soft"): string {
  return tone === "solid"
    ? (ROLE_BADGE_SOLID[role] ?? "bg-muted text-muted-foreground")
    : (ROLE_BADGE_SOFT[role] ?? "border border-border bg-muted text-muted-foreground")
}

/**
 * Retorna as classes Tailwind para status de tarefas
 */
export function getStatusClasses(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: 'bg-status-pending text-status-pending-foreground',
    TODO: 'bg-status-pending text-status-pending-foreground',
    IN_PROGRESS: 'bg-status-in-progress text-status-in-progress-foreground',
    DOING: 'bg-status-in-progress text-status-in-progress-foreground',
    COMPLETED: 'bg-status-completed text-status-completed-foreground',
    COMPLETED_PENDING: 'bg-warning text-warning-foreground',
    DONE: 'bg-status-completed text-status-completed-foreground',
    APPROVED: 'bg-status-completed text-status-completed-foreground',
    REJECTED: 'bg-destructive text-destructive-foreground',
    BLOCKED: 'bg-status-blocked text-status-blocked-foreground',
    CANCELLED: 'bg-status-blocked text-status-blocked-foreground',
  }
  return statuses[status] || statuses.PENDING
}

/**
 * Retorna as classes Tailwind para badges de variante
 */
export function getBadgeVariantClasses(
  variant:
    | 'default'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'destructive'
    | 'info'
    | 'outline'
    | 'violet'
    | 'amber'
    | 'sky'
    | 'rose'
    | 'teal'
    | 'indigo'
    | 'coral'
): string {
  const variants: Record<string, string> = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    info: 'bg-info text-info-foreground',
    outline: 'border border-border bg-background text-foreground',
    violet: 'bg-violet text-violet-foreground',
    amber: 'bg-amber text-amber-foreground',
    sky: 'bg-sky text-sky-foreground',
    rose: 'bg-rose text-rose-foreground',
    teal: 'bg-teal text-teal-foreground',
    indigo: 'bg-indigo text-indigo-foreground',
    coral: 'bg-coral text-coral-foreground',
  }
  return variants[variant] || variants.default
}

/**
 * Retorna o ícone de cor para prioridade (para borda ou indicador)
 */
export function getPriorityBorderClass(priority: string): string {
  const priorities: Record<string, string> = {
    URGENT: 'border-l-priority-urgent-foreground',
    HIGH: 'border-l-priority-high-foreground',
    MEDIUM: 'border-l-priority-medium-foreground',
    LOW: 'border-l-priority-low-foreground',
  }
  return priorities[priority] || priorities.MEDIUM
}

/**
 * Retorna as classes para botões com cores de status
 */
export function getStatusButtonClasses(status: string): string {
  const statuses: Record<string, string> = {
    PENDING: 'hover:bg-status-pending hover:text-status-pending-foreground',
    TODO: 'hover:bg-status-pending hover:text-status-pending-foreground',
    IN_PROGRESS: 'hover:bg-status-in-progress hover:text-status-in-progress-foreground',
    DOING: 'hover:bg-status-in-progress hover:text-status-in-progress-foreground',
    COMPLETED: 'hover:bg-status-completed hover:text-status-completed-foreground',
    DONE: 'hover:bg-status-completed hover:text-status-completed-foreground',
    BLOCKED: 'hover:bg-status-blocked hover:text-status-blocked-foreground',
    CANCELLED: 'hover:bg-status-blocked hover:text-status-blocked-foreground',
  }
  return statuses[status] || ''
}

/**
 * Retorna a label traduzida para prioridade
 */
export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    URGENT: 'Urgente',
    HIGH: 'Alta',
    MEDIUM: 'Média',
    LOW: 'Baixa',
  }
  return labels[priority] || priority
}

/**
 * Retorna a label traduzida para status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendente',
    TODO: 'A Fazer',
    IN_PROGRESS: 'Em Progresso',
    DOING: 'Fazendo',
    COMPLETED: 'Concluído',
    DONE: 'Feito',
    BLOCKED: 'Bloqueado',
    CANCELLED: 'Cancelado',
  }
  return labels[status] || status
}

/**
 * Retorna classes para cards de progresso
 */
export function getProgressClasses(percentage: number): string {
  if (percentage === 0) return 'bg-muted'
  if (percentage < 50) return 'bg-warning'
  if (percentage < 100) return 'bg-info'
  return 'bg-success'
}

/**
 * Retorna classes para texto baseado em porcentagem
 */
export function getProgressTextClasses(percentage: number): string {
  if (percentage === 0) return 'text-muted-foreground'
  if (percentage < 50) return 'text-warning-foreground'
  if (percentage < 100) return 'text-info-foreground'
  return 'text-success-foreground'
}
