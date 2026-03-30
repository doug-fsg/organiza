import { prisma } from '@/lib/prisma'

export interface ResolveResult {
  resolved: Record<string, unknown>
  unmappedKeys: string[]
}

/**
 * Resolve custom_values keys: aceita tanto ID do atributo quanto nome do atributo.
 * Retorna os valores resolvidos e a lista de chaves que não corresponderam a nenhum atributo.
 */
export async function resolveCustomValuesKeys(
  accountId: string,
  customValues: Record<string, unknown>
): Promise<ResolveResult> {
  if (!customValues || Object.keys(customValues).length === 0) {
    return { resolved: {}, unmappedKeys: [] }
  }

  const attributes = await prisma.clientCustomAttribute.findMany({
    where: { accountId },
    select: { id: true, name: true },
  })

  const idSet = new Set(attributes.map((a) => a.id))
  const nameToId = new Map<string, string>()
  for (const a of attributes) {
    nameToId.set(a.name, a.id)
    if (!nameToId.has(a.name.toLowerCase())) {
      nameToId.set(a.name.toLowerCase(), a.id)
    }
  }

  const resolved: Record<string, unknown> = {}
  const unmappedKeys: string[] = []
  for (const [key, value] of Object.entries(customValues)) {
    const attrId = idSet.has(key)
      ? key
      : nameToId.get(key) ?? nameToId.get(key.toLowerCase())
    if (attrId) {
      resolved[attrId] = value
    } else {
      unmappedKeys.push(key)
    }
  }
  return { resolved, unmappedKeys }
}

/**
 * Busca o mapa id->nome dos atributos da conta.
 */
export async function getIdToNameMap(accountId: string): Promise<Map<string, string>> {
  const attributes = await prisma.clientCustomAttribute.findMany({
    where: { accountId },
    select: { id: true, name: true },
  })
  return new Map(attributes.map((a) => [a.id, a.name]))
}

/**
 * Converte custom_values de IDs para nomes de atributos (para exibição na resposta da API).
 */
export function formatCustomValuesWithNames(
  idToName: Map<string, string>,
  customValues: Record<string, unknown>
): Record<string, unknown> {
  if (!customValues || Object.keys(customValues).length === 0) {
    return {}
  }
  const result: Record<string, unknown> = {}
  for (const [id, value] of Object.entries(customValues)) {
    result[idToName.get(id) ?? id] = value
  }
  return result
}
