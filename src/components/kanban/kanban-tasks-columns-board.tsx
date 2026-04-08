'use client'

import { useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Eye, FolderKanban, Home, LayoutGrid } from 'lucide-react'
import {
  computeOrderedStageTitles,
  isSubtaskBlockedByDependencies,
  mergeStageColumnsWithOrphans,
} from './kanban-helpers'
import { KanbanSubtaskStatusSelect } from './kanban-subtask-status-select'

const COLUMN_THEME = [
  {
    dot: 'bg-amber-500',
    headBg: 'bg-amber-100/80 dark:bg-amber-950/35',
    border: 'border-l-amber-500',
    count: 'bg-amber-200/90 text-amber-950 dark:bg-amber-900/50 dark:text-amber-100',
  },
  {
    dot: 'bg-sky-500',
    headBg: 'bg-sky-100/80 dark:bg-sky-950/35',
    border: 'border-l-sky-500',
    count: 'bg-sky-200/90 text-sky-950 dark:bg-sky-900/50 dark:text-sky-100',
  },
  {
    dot: 'bg-violet-500',
    headBg: 'bg-violet-100/80 dark:bg-violet-950/35',
    border: 'border-l-violet-500',
    count: 'bg-violet-200/90 text-violet-950 dark:bg-violet-900/50 dark:text-violet-100',
  },
] as const

interface KanbanTasksColumnsBoardProps {
  tasks: any[]
  localStatuses: Record<string, string>
  buttonDefs: any[] | undefined
  onStatusChange: (subtaskId: string, value: string) => void
  onOpenDetails: (subtask: any, tab?: 'details' | 'comments' | 'checklist') => void
  hasAssignedSubtasks: boolean
  tasksFiltersActive: boolean
  onResetFilters: () => void
}

export function KanbanTasksColumnsBoard({
  tasks,
  localStatuses,
  buttonDefs,
  onStatusChange,
  onOpenDetails,
  hasAssignedSubtasks,
  tasksFiltersActive,
  onResetFilters,
}: KanbanTasksColumnsBoardProps) {
  const { tasksOnBoard, columns, byColumn } = useMemo(() => {
    const onBoard = tasks.filter((t: any) => !isSubtaskBlockedByDependencies(t))
    const ordered = computeOrderedStageTitles(onBoard)
    const titles = onBoard.map((t: any) => t.title as string)
    const columns = mergeStageColumnsWithOrphans(ordered, titles)
    const byColumn = new Map<string, any[]>()
    for (const col of columns) {
      byColumn.set(col, [])
    }
    for (const t of onBoard) {
      const key = t.title as string
      const list = byColumn.get(key) ?? []
      list.push(t)
      byColumn.set(key, list)
    }
    return { tasksOnBoard: onBoard, columns, byColumn }
  }, [tasks])

  if (tasksOnBoard.length === 0) {
    const allHiddenBehindDependencies = tasks.length > 0
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <LayoutGrid className="h-10 w-10 text-muted-foreground/50" aria-hidden />
        <p className="max-w-md text-sm text-muted-foreground">
          {allHiddenBehindDependencies
            ? 'Nenhuma tarefa no quadro: as que você tem estão aguardando a conclusão de etapas anteriores. Use a visualização em tabela para vê-las (ícone de cadeado).'
            : !hasAssignedSubtasks && !tasksFiltersActive
              ? 'Você ainda não tem tarefas atribuídas.'
              : tasksFiltersActive
                ? 'Nenhuma tarefa corresponde aos filtros atuais.'
                : 'Nenhuma tarefa na lista com os critérios selecionados.'}
        </p>
        {tasksFiltersActive && (
          <Button type="button" variant="outline" size="sm" onClick={onResetFilters}>
            Limpar filtros
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-h-[320px] gap-4" role="list" aria-label="Quadro kanban por etapa">
        {columns.map((title, colIndex) => {
          const theme = COLUMN_THEME[colIndex % COLUMN_THEME.length]
          const columnTasks = byColumn.get(title) ?? []
          return (
            <section
              key={title}
              className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border bg-muted/20"
              role="listitem"
            >
              <header
                className={cn(
                  'flex items-center justify-between gap-2 border-b px-3 py-2.5 rounded-t-xl',
                  theme.headBg
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn('size-2 shrink-0 rounded-full', theme.dot)} aria-hidden />
                  <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-foreground/90">
                    {title}
                  </h3>
                </div>
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                    theme.count
                  )}
                >
                  {columnTasks.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {columnTasks.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Nenhuma tarefa</p>
                ) : (
                  columnTasks.map((subtask: any) => (
                    <article
                      key={subtask.id}
                      className={cn(
                        'rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
                        'border-l-4',
                        theme.border
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            {subtask.mainTask?.client?.name ? (
                              <p className="truncate text-sm font-semibold leading-tight">
                                {subtask.mainTask.client.name}
                              </p>
                            ) : null}
                            <p
                              className={cn(
                                'text-sm font-medium leading-tight',
                                subtask.mainTask?.client?.name ? 'text-muted-foreground' : 'font-semibold text-foreground'
                              )}
                            >
                              {subtask.title}
                            </p>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <FolderKanban className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                              <span className="truncate">{subtask.mainTask?.title ?? 'Projeto'}</span>
                            </span>
                            {subtask.mainTask?.client?.address ? (
                              <span className="flex items-start gap-1 text-xs text-muted-foreground">
                                <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                                <span className="line-clamp-2">{subtask.mainTask.client.address}</span>
                              </span>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 shrink-0 text-muted-foreground"
                            onClick={() => onOpenDetails(subtask)}
                            aria-label="Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                        <KanbanSubtaskStatusSelect
                          subtask={subtask}
                          localStatuses={localStatuses}
                          buttonDefs={buttonDefs}
                          onStatusChange={onStatusChange}
                          triggerClassName="h-9 w-full min-w-0 border border-border/70 bg-background text-left text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          Atualizado{' '}
                          {formatDistanceToNow(new Date(subtask.updatedAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
