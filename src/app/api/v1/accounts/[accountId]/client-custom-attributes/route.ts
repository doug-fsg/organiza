import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiError } from '@/lib/api-external/response'
import { prisma } from '@/lib/prisma'

const VALID_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'FILE'] as const

/**
 * GET /api/v1/accounts/{account_id}/client-custom-attributes
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const attributes = await prisma.clientCustomAttribute.findMany({
    where: { accountId },
    orderBy: { order: 'asc' },
  })

  const payload = attributes.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    order: a.order,
    created_at: a.createdAt,
    updated_at: a.updatedAt,
  }))

  return apiSuccess(payload, { count: payload.length })
}

/**
 * POST /api/v1/accounts/{account_id}/client-custom-attributes
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  let body: { name: string; type: string; order?: number }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  if (!body?.name?.trim()) {
    return apiError('name é obrigatório', 400)
  }

  const type = body.type?.toUpperCase?.()
  if (!type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return apiError(
      `type deve ser um de: ${VALID_TYPES.join(', ')}`,
      400
    )
  }

  let order = body.order
  if (order === undefined) {
    const maxOrder = await prisma.clientCustomAttribute.findFirst({
      where: { accountId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })
    order = (maxOrder?.order ?? -1) + 1
  }

  const attribute = await prisma.clientCustomAttribute.create({
    data: {
      name: body.name.trim(),
      type: type as (typeof VALID_TYPES)[number],
      order,
      accountId,
    },
  })

  return apiSuccess({
    id: attribute.id,
    name: attribute.name,
    type: attribute.type,
    order: attribute.order,
    created_at: attribute.createdAt,
    updated_at: attribute.updatedAt,
  })
}

/**
 * DELETE /api/v1/accounts/{account_id}/client-custom-attributes
 * Body: { ids: string[] }
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  let body: { ids?: string[] }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  const ids = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return apiError('ids deve ser um array não vazio', 400)
  }

  const result = await prisma.clientCustomAttribute.deleteMany({
    where: {
      id: { in: ids },
      accountId,
    },
  })

  return apiSuccess({ success: true, deleted_count: result.count })
}
