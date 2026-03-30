'use client'

import { SubtaskStatus } from '@prisma/client'
import { cn } from '@/lib/utils'
import { sortSubtasksByDependency } from '@/lib/task-utils'
import {
  CircleCheck,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

// Fluxo linear principal da subtarefa (estado "feliz")
const SUBTASK_STAGES = [
  { status: SubtaskStatus.TODO, label: 'A fazer', shortLabel: 'A fazer' },
  { status: SubtaskStatus.IN_PROGRESS, label: 'Em andamento', shortLabel: 'Andamento' },
  { status: SubtaskStatus.COMPLETED_PENDING, label: 'Aguardando aprovação', shortLabel: 'Aguardando' },
  { status: SubtaskStatus.APPROVED, label: 'Aprovada', shortLabel: 'Aprovada' },
] as const

// Ordem para calcular índice da etapa atual
const STAGE_ORDER: Record<SubtaskStatus, number> = {
  [SubtaskStatus.TODO]: 0,
  [SubtaskStatus.IN_PROGRESS]: 1,
  [SubtaskStatus.BLOCKED]: 1.5, // Entre andamento e aguardando
  [SubtaskStatus.COMPLETED_PENDING]: 2,
  [SubtaskStatus.APPROVED]: 3,
  [SubtaskStatus.REJECTED]: -1, // Volta ao início
}

function getCurrentStageIndex(status: SubtaskStatus): number {
  return STAGE_ORDER[status] ?? 0
}

function getStageStatus(
  stageIndex: number,
  currentStatus: SubtaskStatus
): 'completed' | 'current' | 'blocked' | 'pending' {
  const currentIndex = getCurrentStageIndex(currentStatus)
  const isBlocked = currentStatus === SubtaskStatus.BLOCKED
  const isRejected = currentStatus === SubtaskStatus.REJECTED

  if (isRejected) {
    return stageIndex === 0 ? 'blocked' : 'pending'
  }

  if (isBlocked) {
    if (stageIndex < 2) return 'completed'
    if (stageIndex === 2) return 'blocked'
    return 'pending'
  }

  if (stageIndex < currentIndex) return 'completed'
  if (stageIndex === Math.floor(currentIndex)) return 'current'
  return 'pending'
}

interface WorkflowProgressBarProps {
  /** Status atual da subtarefa */
  status: SubtaskStatus
  /** Versão compacta: barra + etapa atual sem labels */
  variant?: 'default' | 'compact'
  /** Ocultar labels nas etapas (útil em cards pequenos) */
  showLabels?: boolean
  /** Largura mínima da barra */
  className?: string
  /**
   * Nome do botão de ação ativo (ex.: "Documento faltando").
   * Na etapa "Em andamento", substitui o texto ao lado do spinner.
   */
  activeCustomActionLabel?: string | null
  /** Linha com ícone + texto da etapa e contador "n/4 etapas" (abaixo dos rótulos curtos) */
  showFooterRow?: boolean
}

/**
 * Barra de progresso linear estilo Monday.com para subtarefas.
 * Mostra as 4 etapas do workflow e em qual o item está parado.
 */
export function WorkflowProgressBar({
  status,
  variant = 'default',
  showLabels = true,
  className,
  activeCustomActionLabel,
  showFooterRow = true,
}: WorkflowProgressBarProps) {
  const currentIndex = getCurrentStageIndex(status)
  const isBlocked = status === SubtaskStatus.BLOCKED
  const isRejected = status === SubtaskStatus.REJECTED
  const stageLabelIndex = Math.max(0, Math.floor(currentIndex))
  const customReplacesInProgressLabel =
    Boolean(activeCustomActionLabel?.trim()) &&
    !isBlocked &&
    !isRejected &&
    currentIndex < 3 &&
    currentIndex >= 1 &&
    stageLabelIndex === 1
  const primaryStatusLabel = customReplacesInProgressLabel
    ? activeCustomActionLabel!.trim()
    : SUBTASK_STAGES[stageLabelIndex].label

  return (
    <div className={cn('w-full', className)}>
      {/* Barra linear com segmentos */}
      <div className="flex items-center gap-0.5 w-full">
        {SUBTASK_STAGES.map((stage, index) => {
          const stageStatus = getStageStatus(index, status)

          return (
            <div
              key={stage.status}
              className={cn(
                'flex-1 h-2 rounded-sm transition-all duration-300',
                stageStatus === 'completed' &&
                  'bg-emerald-500 dark:bg-emerald-600',
                stageStatus === 'current' &&
                  'bg-sky-500 dark:bg-sky-600 ring-2 ring-sky-400 ring-offset-1 dark:ring-offset-background',
                stageStatus === 'blocked' &&
                  'bg-amber-500 dark:bg-amber-600 animate-pulse',
                stageStatus === 'pending' &&
                  'bg-muted dark:bg-muted/50'
              )}
              title={
                isBlocked && index === 2
                  ? 'Bloqueada'
                  : isRejected && index === 0
                    ? 'Rejeitada'
                    : stage.label
              }
            />
          )
        })}
      </div>

      {/* Labels das 4 etapas (sempre visíveis quando showLabels) */}
      {showLabels && variant === 'default' && (
        <div className="mt-1 flex justify-between gap-1 text-[10px] text-muted-foreground">
          {SUBTASK_STAGES.map((stage, index) => (
            <span
              key={stage.status}
              className={cn(
                'flex-1 text-center truncate px-0.5',
                getStageStatus(index, status) === 'current' && 'font-medium text-foreground',
                getStageStatus(index, status) === 'completed' && 'text-emerald-600 dark:text-emerald-500'
              )}
              title={
                index === 1 && customReplacesInProgressLabel
                  ? primaryStatusLabel
                  : stage.label
              }
            >
              {index === 1 && customReplacesInProgressLabel
                ? primaryStatusLabel
                : stage.shortLabel}
            </span>
          ))}
        </div>
      )}

      {/* Etapa atual + contador (opcional) */}
      {showFooterRow && (showLabels || variant === 'default') && (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-xs font-medium truncate',
              isBlocked && 'text-amber-600 dark:text-amber-400',
              isRejected && 'text-destructive'
            )}
          >
            {isBlocked && (
              <>
                <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />
                Bloqueada
              </>
            )}
            {isRejected && (
              <>
                <XCircle className="inline h-3 w-3 mr-1 -mt-0.5" />
                Rejeitada
              </>
            )}
            {!isBlocked && !isRejected && (
              <>
                {currentIndex >= 3 ? (
                  <>
                    <CircleCheck className="inline h-3 w-3 mr-1 -mt-0.5 text-emerald-600" />
                    {SUBTASK_STAGES[3].label}
                  </>
                ) : (
                  <>
                    {currentIndex < 1 ? (
                      <Clock className="inline h-3 w-3 mr-1 -mt-0.5 text-muted-foreground" />
                    ) : (
                      <Loader2 className="inline h-3 w-3 mr-1 -mt-0.5 animate-spin text-sky-500" />
                    )}
                    <span className="truncate">{primaryStatusLabel}</span>
                  </>
                )}
              </>
            )}
          </span>
          {showLabels && variant === 'default' && (
            <span className="text-xs text-muted-foreground">
              {Math.min(
                Math.max(0, Math.floor(currentIndex) + 1),
                4
              )}
              /4 etapas
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// Versão agregada para MainTask (múltiplas subtarefas)
// ============================================

interface WorkflowProgressBarAggregateProps {
  subtasks: Array<{ status: SubtaskStatus; title?: string }>
  /** Etapas customizadas do template (ordem). Quando definido, usa em vez de genéricas. */
  stageLabels?: string[]
  /** Versão compacta */
  variant?: 'default' | 'compact'
  showLabels?: boolean
  className?: string
}

function getStatusColor(status: SubtaskStatus): string {
  switch (status) {
    case SubtaskStatus.APPROVED:
      return 'bg-emerald-500 dark:bg-emerald-600'
    case SubtaskStatus.COMPLETED_PENDING:
      return 'bg-amber-500 dark:bg-amber-600'
    case SubtaskStatus.IN_PROGRESS:
    case SubtaskStatus.BLOCKED:
      return 'bg-sky-500 dark:bg-sky-600'
    default:
      return 'bg-muted dark:bg-muted/50'
  }
}

/** Verde = concluído, Amarelo = em andamento, Cinza = não iniciado */
function getTaskSequenceColor(status: SubtaskStatus): string {
  switch (status) {
    case SubtaskStatus.APPROVED:
      return 'bg-emerald-500 dark:bg-emerald-600'
    case SubtaskStatus.TODO:
      return 'bg-slate-300 dark:bg-slate-600'
    default:
      // IN_PROGRESS, BLOCKED, COMPLETED_PENDING = em andamento
      return 'bg-amber-400 dark:bg-amber-500'
  }
}

/**
 * Barra única com uma faixa por tarefa na ordem A → B → C.
 * Verde = concluído, Amarelo = em andamento, Cinza = não iniciado.
 */
export function TaskSequenceProgressBar({
  subtasks,
  className,
  onTaskClick,
}: {
  subtasks: Array<{
    id: string
    title: string
    status: SubtaskStatus
    mainTaskId: string
    dependencies?: Array<{ blocking: { id: string } }>
  }>
  className?: string
  onTaskClick?: (subtask: { id: string; title: string }) => void
}) {
  const sorted = sortSubtasksByDependency(subtasks)

  const total = sorted.length
  const approved = sorted.filter((s) => s.status === SubtaskStatus.APPROVED).length
  const percentage = total > 0 ? Math.round((approved / total) * 100) : 0

  return (
    <div className={cn('w-full', className)}>
      <div className="flex w-full h-8 rounded-md overflow-hidden bg-muted/30 dark:bg-muted/20 gap-0.5">
        {sorted.map((subtask) => (
          <div
            key={subtask.id}
            className={cn(
              'h-full flex-1 min-w-[8px] transition-all duration-500 cursor-pointer hover:opacity-90',
              'flex items-center justify-center px-1 overflow-hidden',
              getTaskSequenceColor(subtask.status)
            )}
            style={{ flex: `1 1 0` }}
            title={`${subtask.title}: ${
              subtask.status === SubtaskStatus.APPROVED
                ? 'Concluída'
                : subtask.status === SubtaskStatus.TODO
                  ? 'Não iniciada'
                  : 'Em andamento'
            }`}
            onClick={() => onTaskClick?.(subtask)}
          >
            <span
              className={cn(
                'text-[10px] font-medium truncate w-full text-center',
                subtask.status === SubtaskStatus.TODO
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]'
              )}
            >
              {subtask.title}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{approved}/{total} concluídas</span>
        <span className="font-medium tabular-nums">{percentage}%</span>
      </div>
    </div>
  )
}

/**
 * Gráfico de barras horizontais estilo Monday.com.
 * Uma linha por status, com barra proporcional e contagem.
 */
export function ProjectProgressBarChart({
  subtasks,
  className,
}: {
  subtasks: Array<{ status: SubtaskStatus }>
  className?: string
}) {
  const byStatus = subtasks.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    },
    {} as Record<SubtaskStatus, number>
  )

  const rows = [
    { label: 'A fazer', count: byStatus[SubtaskStatus.TODO] || 0, color: 'bg-slate-400 dark:bg-slate-500' },
    {
      label: 'Em andamento',
      count: (byStatus[SubtaskStatus.IN_PROGRESS] || 0) + (byStatus[SubtaskStatus.BLOCKED] || 0),
      color: 'bg-sky-500 dark:bg-sky-600',
    },
    { label: 'Aguardando', count: byStatus[SubtaskStatus.COMPLETED_PENDING] || 0, color: 'bg-amber-500 dark:bg-amber-600' },
    { label: 'Aprovada', count: byStatus[SubtaskStatus.APPROVED] || 0, color: 'bg-emerald-500 dark:bg-emerald-600' },
  ]

  const total = subtasks.length
  const maxCount = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className={cn('w-full space-y-3', className)}>
      {rows.map((row) => {
        const widthPercent = maxCount > 0 ? (row.count / maxCount) * 100 : 0
        return (
          <div key={row.label} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-28 shrink-0">{row.label}</span>
            <div className="flex-1 min-w-0 h-6 rounded-md overflow-hidden bg-muted/50 dark:bg-muted/30">
              <div
                className={cn('h-full rounded-md transition-all duration-500', row.color)}
                style={{ width: `${widthPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium tabular-nums w-8 text-right shrink-0">{row.count}</span>
          </div>
        )
      })}
      <div className="pt-1 flex justify-between text-xs text-muted-foreground border-t">
        <span>{byStatus[SubtaskStatus.APPROVED] || 0}/{total} concluídas</span>
        <span className="font-medium tabular-nums">
          {total > 0 ? Math.round(((byStatus[SubtaskStatus.APPROVED] || 0) / total) * 100) : 0}%
        </span>
      </div>
    </div>
  )
}

/**
 * Barra de progresso agregada para MainTask.
 * Estilo "bateria" Monday.com: % completo + distribuição por etapa.
 * Com stageLabels (template): um segmento por etapa, cor = status daquela subtarefa.
 */
export function WorkflowProgressBarAggregate({
  subtasks,
  stageLabels,
  variant = 'default',
  showLabels = false,
  className,
}: WorkflowProgressBarAggregateProps) {
  const total = subtasks.length
  const byStatus = subtasks.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1
      return acc
    },
    {} as Record<SubtaskStatus, number>
  )

  const approved = byStatus[SubtaskStatus.APPROVED] || 0
  const completed = approved
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  const isTemplateMode = stageLabels && stageLabels.length === subtasks.length

  return (
    <div className={cn('w-full', className)}>
      {/* Labels das 4 etapas (opcional, para projetos mostra distribuição) */}
      {showLabels && variant === 'default' && !isTemplateMode && (
        <div className="mb-1 flex justify-between gap-1 text-[10px] text-muted-foreground">
          {SUBTASK_STAGES.map((stage) => (
            <span
              key={stage.status}
              className="flex-1 text-center truncate px-0.5"
              title={stage.label}
            >
              {stage.shortLabel}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-0.5 w-full h-2 rounded-sm overflow-hidden bg-muted dark:bg-muted/50">
        {isTemplateMode ? (
          // Modo template: 1 segmento por etapa, cor = status da subtarefa
          subtasks.map((subtask, index) => (
            <div
              key={index}
              className={cn('h-full flex-1 transition-all duration-500', getStatusColor(subtask.status))}
              title={`${stageLabels[index]}: ${subtask.status}`}
            />
          ))
        ) : (
          // Modo padrão: 4 buckets por status
          (() => {
            const stageCounts = [
              byStatus[SubtaskStatus.TODO] || 0,
              (byStatus[SubtaskStatus.IN_PROGRESS] || 0) + (byStatus[SubtaskStatus.BLOCKED] || 0),
              byStatus[SubtaskStatus.COMPLETED_PENDING] || 0,
              approved,
            ]
            const labels = ['A fazer', 'Em andamento', 'Aguardando', 'Aprovada']
            return stageCounts.map((count, index) => {
              const width = total > 0 ? (count / total) * 100 : 25
              return (
                <div
                  key={index}
                  className={cn(
                    'h-full transition-all duration-500',
                    index < 3
                      ? count > 0
                        ? index === 0 ? 'bg-slate-400 dark:bg-slate-500'
                          : index === 1 ? 'bg-sky-500 dark:bg-sky-600'
                          : 'bg-amber-500 dark:bg-amber-600'
                        : 'bg-muted/30'
                      : 'bg-emerald-500 dark:bg-emerald-600'
                  )}
                  style={{ width: `${width}%`, minWidth: count > 0 ? 4 : 0 }}
                  title={`${labels[index]}: ${count}`}
                />
              )
            })
          })()
        )}
      </div>

      {variant === 'default' && (
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {completed}/{total} concluídas
          </span>
          <span className="text-xs font-medium tabular-nums">{percentage}%</span>
        </div>
      )}
    </div>
  )
}
