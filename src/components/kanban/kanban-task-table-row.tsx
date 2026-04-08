'use client'

import { SubtaskStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { WorkflowProgressBar } from '@/components/workflow-progress-bar'
import { cn } from '@/lib/utils'
import { getPriorityClasses, getPriorityLabel } from '@/lib/theme-utils'
import { ClientBadge } from '@/components/client/client-badge'
import {
  Calendar,
  CheckCircle,
  Eye,
  FolderKanban,
  Lock,
  MessageSquare,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { formatDate, isOverdue } from './kanban-helpers'
import { KanbanSubtaskStatusSelect } from './kanban-subtask-status-select'

type ButtonDef = Record<string, unknown> & {
  id: string
  name: string
  projectIds?: string
  color?: string
}

interface KanbanTaskTableRowProps {
  subtask: any
  localStatuses: Record<string, string>
  buttonDefs: ButtonDef[] | undefined
  onStatusChange: (subtaskId: string, value: string) => void
  onOpenDetails: (subtask: any, tab?: 'details' | 'comments' | 'checklist') => void
}

export function KanbanTaskTableRow({
  subtask,
  localStatuses,
  buttonDefs,
  onStatusChange,
  onOpenDetails,
}: KanbanTaskTableRowProps) {
  const unreadComments =
    subtask.comments?.filter((comment: any) => {
      try {
        const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
        return !readBy.includes(subtask.assignedToId)
      } catch {
        return true
      }
    }) || []

  const hasUnread = unreadComments.length > 0
  const totalComments = subtask.comments?.length || 0

  let checklistProgress: { checked: number; total: number } | null = null
  if (subtask.checklistItems) {
    try {
      const items = JSON.parse(subtask.checklistItems)
      if (items.length > 0) {
        const checked = items.filter((item: any) => item.checked).length
        checklistProgress = { checked, total: items.length }
      }
    } catch {
      /* ignore */
    }
  }

  const blockingDependencies =
    subtask.dependencies?.filter(
      (dep: any) => dep.blocking && dep.blocking.status !== 'APPROVED'
    ) || []

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4
              className="flex-1 cursor-pointer text-left text-sm font-medium leading-tight transition-colors hover:text-primary"
              onClick={() => onOpenDetails(subtask)}
            >
              {subtask.title}
            </h4>
          </div>
          {subtask.description && (
            <p className="text-xs text-muted-foreground">{subtask.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                getPriorityClasses(subtask.priority)
              )}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-current/80" />
              {getPriorityLabel(subtask.priority)}
            </span>
            <button
              type="button"
              onClick={() => onOpenDetails(subtask, 'comments')}
              className="group relative inline-flex cursor-pointer items-center"
              title={
                hasUnread
                  ? `${unreadComments.length} comentário${unreadComments.length > 1 ? 's' : ''} não lido${unreadComments.length > 1 ? 's' : ''}`
                  : totalComments > 0
                    ? `${totalComments} comentário${totalComments > 1 ? 's' : ''}`
                    : 'Ver comentários'
              }
            >
              <div className="absolute inset-0 -m-1.5 rounded-full bg-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <MessageSquare className="relative z-10 h-4 w-4 text-muted-foreground transition-all duration-200 group-hover:scale-110 group-hover:text-foreground" />
              {hasUnread && (
                <div className="absolute -right-2 -top-2 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold text-destructive-foreground shadow-lg motion-safe:animate-pulse">
                  {unreadComments.length > 99 ? '99+' : unreadComments.length}
                </div>
              )}
            </button>
            {subtask.isRecurring && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="info" className="cursor-help gap-1 text-xs normal-case">
                      <RefreshCw className="h-3 w-3" aria-hidden />
                      Recorrente
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium">Tarefa Recorrente</p>
                      <p>
                        Tipo:{' '}
                        {subtask.recurringType === 'DAILY'
                          ? 'Diária'
                          : subtask.recurringType === 'WEEKLY'
                            ? 'Semanal'
                            : subtask.recurringType === 'BIWEEKLY'
                              ? 'Quinzenal'
                              : subtask.recurringType === 'MONTHLY'
                                ? 'Mensal'
                                : subtask.recurringType === 'CUSTOM'
                                  ? 'Personalizada'
                                  : subtask.recurringType?.toLowerCase()}
                      </p>
                      {(subtask.recurringType === 'WEEKLY' || subtask.recurringType === 'BIWEEKLY') &&
                        subtask.recurringWeekDays && (
                          <p>
                            Dias:{' '}
                            {JSON.parse(subtask.recurringWeekDays)
                              .map((day: string) => {
                                const dayNames: Record<string, string> = {
                                  SUNDAY: 'Dom',
                                  MONDAY: 'Seg',
                                  TUESDAY: 'Ter',
                                  WEDNESDAY: 'Qua',
                                  THURSDAY: 'Qui',
                                  FRIDAY: 'Sex',
                                  SATURDAY: 'Sáb',
                                }
                                return dayNames[day] || day
                              })
                              .join(', ')}
                          </p>
                        )}
                      {subtask.recurringType === 'MONTHLY' && subtask.recurringMonthDays && (
                        <p>Dias do mês: {JSON.parse(subtask.recurringMonthDays).join(', ')}</p>
                      )}
                      {(subtask.recurringType === 'CUSTOM' || subtask.recurringType === 'DAILY') &&
                        subtask.recurringInterval &&
                        subtask.recurringInterval > 1 && (
                          <p>A cada {subtask.recurringInterval} dias</p>
                        )}
                      {(subtask.skipWeekends || subtask.skipHolidays) && (
                        <p className="text-orange-600">
                          Pula:{' '}
                          {[subtask.skipWeekends ? 'fins de semana' : null, subtask.skipHolidays ? 'feriados' : null]
                            .filter(Boolean)
                            .join(' e ')}
                        </p>
                      )}
                      {subtask.nextReopenAt && <p>Próxima: {formatDate(subtask.nextReopenAt)}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!subtask.requiresApproval && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="warning" className="cursor-help gap-1 text-xs normal-case">
                      <Zap className="h-3 w-3" aria-hidden />
                      Auto
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium">Aprovação Automática</p>
                      <p>Esta tarefa será aprovada automaticamente quando concluída</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isOverdue(subtask.deadline) && (
              <Badge variant="destructive" className="text-xs">
                Atrasado
              </Badge>
            )}
            {subtask.deadline ? (
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="mr-1 h-3 w-3" aria-hidden />
                {formatDate(subtask.deadline)}
              </div>
            ) : null}
            {checklistProgress ? (
              <div className="flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-xs text-success">
                <CheckCircle className="h-3 w-3" aria-hidden />
                <span>
                  {checklistProgress.checked}/{checklistProgress.total}
                </span>
              </div>
            ) : null}
            {blockingDependencies.length > 0 ? (
              <span className="inline-flex text-muted-foreground/60">
                <Lock className="h-3 w-3" aria-hidden />
              </span>
            ) : null}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            {subtask.mainTask.title}
          </span>
          {subtask.mainTask.client && <ClientBadge name={subtask.mainTask.client.name} />}
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-[160px]">
          <WorkflowProgressBar
            status={subtask.status}
            variant="default"
            showLabels={true}
            activeCustomActionLabel={subtask.activeActionButton?.name ?? null}
          />
        </div>
      </TableCell>
      <TableCell>
        <KanbanSubtaskStatusSelect
          subtask={subtask}
          localStatuses={localStatuses}
          buttonDefs={buttonDefs}
          onStatusChange={onStatusChange}
        />
      </TableCell>
      <TableCell className="text-right">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenDetails(subtask)}
                className="h-9 gap-1.5 px-2.5 sm:px-3"
              >
                <Eye className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Detalhes</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Ver detalhes da tarefa</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  )
}
