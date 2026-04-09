/** Contrato alinhado ao modelo Subtask.checklistItems e ao tRPC (subtask router). */
export type ChecklistItem = {
  id: string
  text: string
  checked: boolean
}

const MAX_ITEMS = 100
const MAX_TEXT_LEN = 2000

export function parseChecklistFromDb(raw: string | null): ChecklistItem[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: ChecklistItem[] = []
    for (const row of parsed) {
      if (!row || typeof row !== 'object') continue
      const o = row as Record<string, unknown>
      const id = typeof o.id === 'string' ? o.id : ''
      const text = typeof o.text === 'string' ? o.text : ''
      const checked = typeof o.checked === 'boolean' ? o.checked : false
      if (id) out.push({ id, text, checked })
    }
    return out
  } catch {
    return []
  }
}

export function validateChecklistItemsInput(
  body: unknown
): { ok: true; items: ChecklistItem[] } | { ok: false; message: string } {
  if (!Array.isArray(body)) {
    return { ok: false, message: 'checklist_items deve ser um array' }
  }
  if (body.length > MAX_ITEMS) {
    return { ok: false, message: `checklist_items: no máximo ${MAX_ITEMS} itens` }
  }
  const items: ChecklistItem[] = []
  const seenIds = new Set<string>()
  for (let i = 0; i < body.length; i++) {
    const row = body[i]
    if (!row || typeof row !== 'object') {
      return { ok: false, message: `checklist_items[${i}]: objeto esperado` }
    }
    const o = row as Record<string, unknown>
    const id = typeof o.id === 'string' ? o.id.trim() : ''
    if (!id) {
      return { ok: false, message: `checklist_items[${i}]: id é obrigatório` }
    }
    if (seenIds.has(id)) {
      return { ok: false, message: `checklist_items: id duplicado "${id}"` }
    }
    seenIds.add(id)
    if (typeof o.text !== 'string') {
      return { ok: false, message: `checklist_items[${i}]: text deve ser string` }
    }
    const text = o.text.trim()
    if (text.length > MAX_TEXT_LEN) {
      return { ok: false, message: `checklist_items[${i}]: text muito longo (máx. ${MAX_TEXT_LEN})` }
    }
    if (typeof o.checked !== 'boolean') {
      return { ok: false, message: `checklist_items[${i}]: checked deve ser boolean` }
    }
    items.push({ id, text, checked: o.checked })
  }
  return { ok: true, items }
}

/** Array vazio → null no banco (mesmo tRPC). */
export function serializeChecklistItems(items: ChecklistItem[]): string | null {
  if (items.length === 0) return null
  return JSON.stringify(items)
}
