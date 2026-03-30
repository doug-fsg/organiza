import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiError } from '@/lib/api-external/response'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'FILE'] as const

type AttributeInput = { name: string; type: string; order?: number }

/**
 * POST /api/v1/accounts/{account_id}/client-custom-attributes/bulk
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  let body: { attributes: AttributeInput[] }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  const attributes = body?.attributes
  if (!Array.isArray(attributes) || attributes.length === 0) {
    return apiError('attributes deve ser um array não vazio', 400)
  }

  if (attributes.length > 50) {
    return apiError('Máximo de 50 atributos por requisição', 400)
  }

  const maxOrder = await prisma.clientCustomAttribute.findFirst({
    where: { accountId },
    orderBy: { order: 'desc' },
    select: { order: true },
  })
  let nextOrder = (maxOrder?.order ?? -1) + 1

  const data: { name: string; type: (typeof VALID_TYPES)[number]; order: number; accountId: string }[] = []
  for (let i = 0; i < attributes.length; i++) {
    const a = attributes[i]
    const type = a.type?.toUpperCase?.()
    if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return apiError(
        `Atributo "${a.name ?? '?'}": type deve ser um de ${VALID_TYPES.join(', ')}`,
        400
      )
    }
    if (!a.name?.trim()) {
      return apiError(`Atributo na posição ${i + 1}: name é obrigatório`, 400)
    }
    data.push({
      name: a.name.trim(),
      type: type as (typeof VALID_TYPES)[number],
      order: a.order ?? nextOrder++,
      accountId,
    })
  }

  const created = await prisma.clientCustomAttribute.createManyAndReturn({
    data,
  })

  const payload = created.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    order: a.order,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  }))

  return apiSuccess(payload, { count: payload.length })
}
