/**
 * Ordena subtarefas por dependência (A → B → C).
 * Agrupa por projeto e aplica ordenação topológica em cada grupo.
 */
export function sortSubtasksByDependency<T extends { id: string; mainTaskId: string; dependencies?: Array<{ blocking?: { id: string } }> }>(
  subtasks: T[]
): T[] {
  if (!subtasks.length) return []

  const byProject = new Map<string, T[]>()
  const order: string[] = []
  for (const s of subtasks) {
    if (!byProject.has(s.mainTaskId)) {
      order.push(s.mainTaskId)
      byProject.set(s.mainTaskId, [])
    }
    byProject.get(s.mainTaskId)!.push(s)
  }

  return order.flatMap((mid) => {
    const list = byProject.get(mid)!
    const ids = new Set(list.map((t) => t.id))
    const done = new Set<string>()
    const sorted: T[] = []

    while (sorted.length < list.length) {
      const n = sorted.length
      for (const t of list) {
        if (done.has(t.id)) continue
        const blockers = (t.dependencies ?? []).map((d) => d.blocking?.id).filter((id): id is string => !!id && ids.has(id))
        if (blockers.every((id) => done.has(id))) {
          sorted.push(t)
          done.add(t.id)
        }
      }
      if (sorted.length === n) break
    }
    return [...sorted, ...list.filter((t) => !done.has(t.id))]
  })
}
