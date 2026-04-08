'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { LayoutGrid, RotateCcw, Table2 } from 'lucide-react'
import { KanbanTaskTableRow } from './kanban-task-table-row'
import { KanbanTasksColumnsBoard } from './kanban-tasks-columns-board'

interface KanbanTasksPanelProps {
  getTabSubtasks: any[]
  hasAssignedSubtasks: boolean
  tasksFiltersActive: boolean
  onResetFilters: () => void
  localStatuses: Record<string, string>
  buttonDefs: any[] | undefined
  onStatusChange: (subtaskId: string, value: string) => void
  onOpenDetails: (subtask: any, tab?: 'details' | 'comments' | 'checklist') => void
}

export function KanbanTasksPanel({
  getTabSubtasks,
  hasAssignedSubtasks,
  tasksFiltersActive,
  onResetFilters,
  localStatuses,
  buttonDefs,
  onStatusChange,
  onOpenDetails,
}: KanbanTasksPanelProps) {
  const [taskView, setTaskView] = useState<'table' | 'kanban'>('table')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
        <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">Lista de tarefas</CardTitle>
        <div
          className="inline-flex shrink-0 rounded-md border border-border/50 p-px"
          role="group"
          aria-label="Modo de visualização"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'relative h-7 w-7 rounded-[5px] text-muted-foreground hover:text-foreground',
              taskView === 'table' && 'bg-background text-foreground shadow-sm'
            )}
            aria-pressed={taskView === 'table'}
            aria-label="Tabela"
            title="Tabela"
            onClick={() => setTaskView('table')}
          >
            <Table2 className="size-3.5" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'relative h-7 w-7 rounded-[5px] text-muted-foreground hover:text-foreground',
              taskView === 'kanban' && 'bg-background text-foreground shadow-sm'
            )}
            aria-pressed={taskView === 'kanban'}
            aria-label="Kanban (beta)"
            title="Kanban (beta)"
            onClick={() => setTaskView('kanban')}
          >
            <LayoutGrid className="size-3.5" aria-hidden />
            <span
              className="pointer-events-none absolute right-0.5 top-0.5 size-1 rounded-full bg-amber-500 opacity-90"
              aria-hidden
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-0">
        {taskView === 'kanban' ? (
          <KanbanTasksColumnsBoard
            tasks={getTabSubtasks}
            localStatuses={localStatuses}
            buttonDefs={buttonDefs}
            onStatusChange={onStatusChange}
            onOpenDetails={onOpenDetails}
            hasAssignedSubtasks={hasAssignedSubtasks}
            tasksFiltersActive={tasksFiltersActive}
            onResetFilters={onResetFilters}
          />
        ) : (
        <Table>
          <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-card [&_th]:align-middle">
            <TableRow className="border-b bg-card hover:bg-card">
              <TableHead className="min-w-[200px]">Tarefa</TableHead>
              <TableHead className="min-w-[140px]">Projeto</TableHead>
              <TableHead className="min-w-[180px] w-[180px]">Progresso</TableHead>
              <TableHead className="min-w-[160px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {getTabSubtasks.map((subtask: any) => (
              <KanbanTaskTableRow
                key={subtask.id}
                subtask={subtask}
                localStatuses={localStatuses}
                buttonDefs={buttonDefs}
                onStatusChange={onStatusChange}
                onOpenDetails={onOpenDetails}
              />
            ))}
            {getTabSubtasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10">
                  <div className="flex flex-col items-center justify-center gap-3 px-4 text-center">
                    <p className="max-w-md text-sm text-muted-foreground">
                      {!hasAssignedSubtasks && !tasksFiltersActive
                        ? 'Você ainda não tem tarefas atribuídas.'
                        : tasksFiltersActive
                          ? 'Nenhuma tarefa corresponde aos filtros atuais.'
                          : 'Nenhuma tarefa na lista com os critérios selecionados.'}
                    </p>
                    {tasksFiltersActive && (
                      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onResetFilters}>
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        )}
      </CardContent>
    </Card>
  )
}
