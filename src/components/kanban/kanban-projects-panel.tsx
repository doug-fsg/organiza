'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskSequenceProgressBar } from '@/components/workflow-progress-bar'
import { ClientBadge } from '@/components/client/client-badge'
import { RotateCcw } from 'lucide-react'

type ProjectGroup = {
  mainTaskId: string
  mainTask: any
  subtasks: any[]
}

interface KanbanProjectsPanelProps {
  projectsByMainTask: ProjectGroup[]
  projectsFiltersActive: boolean
  onResetFilters: () => void
  onOpenTaskDetails: (subtask: any) => void
}

export function KanbanProjectsPanel({
  projectsByMainTask,
  projectsFiltersActive,
  onResetFilters,
  onOpenTaskDetails,
}: KanbanProjectsPanelProps) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardTitle className="text-base font-semibold tracking-tight sm:text-lg">
          Andamento dos projetos
        </CardTitle>
        <CardDescription>
          Ordem do fluxo e dependências por projeto
          {projectsByMainTask.length > 0
            ? ` · ${projectsByMainTask.length} ${projectsByMainTask.length === 1 ? 'projeto' : 'projetos'}`
            : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projectsByMainTask.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <p className="max-w-md text-sm text-muted-foreground">
                {projectsFiltersActive
                  ? 'Nenhum projeto corresponde aos filtros atuais.'
                  : 'Nenhum projeto para exibir.'}
              </p>
              {projectsFiltersActive && (
                <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onResetFilters}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            projectsByMainTask.map(({ mainTaskId, mainTask, subtasks: projectSubtasks }) => (
              <div
                key={mainTaskId}
                className="rounded-lg border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{mainTask?.title || 'Projeto'}</h3>
                    {mainTask?.client && (
                      <ClientBadge name={mainTask.client.name} className="mt-1" />
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {projectSubtasks.length} tarefa{projectSubtasks.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="mt-3">
                  {projectSubtasks.length > 0 ? (
                    <TaskSequenceProgressBar
                      subtasks={projectSubtasks.map((s: any) => ({
                        id: s.id,
                        title: s.title,
                        status: s.status,
                        mainTaskId: s.mainTaskId,
                        dependencies: s.dependencies,
                      }))}
                      className="max-w-full"
                      onTaskClick={(subtask) => {
                        const s = projectSubtasks.find((p: any) => p.id === subtask.id)
                        if (s) onOpenTaskDetails(s)
                      }}
                    />
                  ) : (
                    <div className="flex h-8 items-center justify-center rounded-md bg-muted/30 text-xs text-muted-foreground">
                      Nenhuma tarefa
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
