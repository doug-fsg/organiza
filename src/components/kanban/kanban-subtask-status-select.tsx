'use client'

import { SubtaskStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getStatusClasses } from '@/lib/theme-utils'
import { CheckCircle, GitBranch, Lock } from 'lucide-react'

export type KanbanButtonDef = Record<string, unknown> & {
  id: string
  name: string
  projectIds?: string
  color?: string
}

interface KanbanSubtaskStatusSelectProps {
  subtask: any
  localStatuses: Record<string, string>
  buttonDefs: KanbanButtonDef[] | undefined
  onStatusChange: (subtaskId: string, value: string) => void
  triggerClassName?: string
}

export function KanbanSubtaskStatusSelect({
  subtask,
  localStatuses,
  buttonDefs,
  onStatusChange,
  triggerClassName,
}: KanbanSubtaskStatusSelectProps) {
  const blockingDependencies =
    subtask.dependencies?.filter(
      (dep: any) => dep.blocking && dep.blocking.status !== SubtaskStatus.APPROVED
    ) || []

  if (subtask.status === SubtaskStatus.BLOCKED) {
    return (
      <Badge variant="destructive" className="gap-1">
        <GitBranch className="h-3 w-3" aria-hidden />
        Bloqueada
      </Badge>
    )
  }
  if (subtask.status === SubtaskStatus.COMPLETED_PENDING) {
    return <Badge variant="warning">Aguardando</Badge>
  }
  if (subtask.status === SubtaskStatus.APPROVED) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" aria-hidden />
        Aprovada
      </Badge>
    )
  }
  if (blockingDependencies.length > 0) {
    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded border border-border/50 text-muted-foreground/50">
        <Lock className="h-4 w-4" aria-hidden />
      </span>
    )
  }

  const isSmartBtn =
    (localStatuses[subtask.id] || subtask.activeActionButtonId)?.startsWith('btn_')

  return (
    <Select
      value={
        localStatuses[subtask.id] ||
        (subtask.activeActionButtonId ? `btn_${subtask.activeActionButtonId}` : subtask.status)
      }
      onValueChange={(value) => onStatusChange(subtask.id, value)}
    >
      <SelectTrigger
        className={cn(
          'font-medium shadow-sm transition-all',
          isSmartBtn ? 'bg-primary font-bold text-primary-foreground' : getStatusClasses(subtask.status as string),
          triggerClassName ?? 'w-[150px] border-0'
        )}
      >
        <SelectValue placeholder="Mudar status..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={SubtaskStatus.TODO}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span>A fazer</span>
          </div>
        </SelectItem>
        <SelectItem value={SubtaskStatus.IN_PROGRESS}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span>Em andamento</span>
          </div>
        </SelectItem>
        <SelectItem value={SubtaskStatus.COMPLETED_PENDING}>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span>Concluído</span>
          </div>
        </SelectItem>
        {buttonDefs
          ?.filter((def) => {
            const btn = def as KanbanButtonDef
            if (!btn.projectIds || btn.projectIds === '[]' || btn.projectIds === '') return true
            try {
              const ids = JSON.parse(btn.projectIds) as string[]
              return ids.includes(subtask.mainTaskId)
            } catch {
              return true
            }
          })
          .map((def) => {
            const btn = def as KanbanButtonDef
            return (
              <SelectItem key={btn.id} value={`btn_${btn.id}`}>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      btn.color === 'amber'
                        ? 'bg-amber-500'
                        : btn.color === 'sky'
                          ? 'bg-sky-500'
                          : btn.color === 'rose'
                            ? 'bg-rose-500'
                            : btn.color === 'teal'
                              ? 'bg-teal-500'
                              : btn.color === 'indigo'
                                ? 'bg-indigo-500'
                                : btn.color === 'coral'
                                  ? 'bg-orange-500'
                                  : 'bg-primary'
                    )}
                  />
                  <span className="font-bold">{btn.name}</span>
                </div>
              </SelectItem>
            )
          })}
      </SelectContent>
    </Select>
  )
}
