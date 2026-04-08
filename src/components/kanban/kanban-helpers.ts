import { SubtaskStatus } from '@prisma/client'
import { sortSubtasksByDependency } from '@/lib/task-utils'

/** Indica se a subtarefa não pode avançar até predecessores aprovarem (estado do cadeado na lista). */
export function isSubtaskBlockedByDependencies(subtask: {
  dependencies?: Array<{ blocking?: { status?: SubtaskStatus } | null } | null>
}): boolean {
  return Boolean(
    subtask.dependencies?.some(
      (dep) => dep?.blocking && dep.blocking.status !== SubtaskStatus.APPROVED
    )
  )
}

type StageSubtask = {
  id: string
  title: string
  mainTaskId: string
  dependencies?: Array<{ blocking?: { id: string } }>
}

/** Ordena títulos de etapa pelo fluxo (dependências) em cada projeto visível. */
export function computeOrderedStageTitles(
  rows: Array<{ mainTaskId: string; mainTask?: { subtasks?: StageSubtask[] } | null }>
): string[] {
  const titleToMinOrder = new Map<string, number>()
  const seenProjects = new Set<string>()
  for (const row of rows) {
    if (seenProjects.has(row.mainTaskId)) continue
    seenProjects.add(row.mainTaskId)
    const subs = row.mainTask?.subtasks
    if (!subs?.length) continue
    const sorted = sortSubtasksByDependency(subs)
    sorted.forEach((s, idx) => {
      const prev = titleToMinOrder.get(s.title)
      titleToMinOrder.set(s.title, prev === undefined ? idx : Math.min(prev, idx))
    })
  }
  return [...titleToMinOrder.keys()].sort((a, b) => {
    const ia = titleToMinOrder.get(a)!
    const ib = titleToMinOrder.get(b)!
    if (ia !== ib) return ia - ib
    return a.localeCompare(b, 'pt-BR')
  })
}

/** Inclui etapas presentes nas tarefas mas fora do grafo carregado (fallback). */
export function mergeStageColumnsWithOrphans(ordered: string[], taskTitles: string[]): string[] {
  const set = new Set(ordered)
  const orphans = [...new Set(taskTitles.filter((t) => !set.has(t)))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )
  return [...ordered, ...orphans]
}

export function formatDate(date: Date | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('pt-BR')
}

export function isOverdue(deadline: Date | null) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

/** Status considerados "abertos" no filtro padrão */
export const OPEN_STATUSES: SubtaskStatus[] = [
  SubtaskStatus.TODO,
  SubtaskStatus.IN_PROGRESS,
  SubtaskStatus.BLOCKED,
  SubtaskStatus.COMPLETED_PENDING,
]
