import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiError } from '@/lib/api-external/response'
import {
  resolveCustomValuesKeys,
  getIdToNameMap,
  formatCustomValuesWithNames,
} from '@/lib/api-external/custom-values'
import { prisma } from '@/lib/prisma'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'
import {
  parseInternalMetadataFromDb,
  validateInternalMetadataBody,
} from '@/lib/client-internal-metadata'

/**
 * GET /api/v1/accounts/{account_id}/clients
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)

  const [clients, total, idToName] = await Promise.all([
    prisma.client.findMany({
      where: { accountId },
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.client.count({ where: { accountId } }),
    getIdToNameMap(accountId),
  ])

  const payload = clients.map((c) => {
    let customValues: Record<string, unknown> = {}
    if (c.customValues) {
      try {
        customValues = JSON.parse(c.customValues) as Record<string, unknown>
      } catch {
        // ignore parse errors
      }
    }
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      custom_values: formatCustomValuesWithNames(idToName, customValues),
      internal_metadata: parseInternalMetadataFromDb(c.internalMetadata),
      created_at: c.createdAt,
      updated_at: c.updatedAt,
    }
  })

  return apiSuccess(payload, { count: total })
}

/**
 * POST /api/v1/accounts/{account_id}/clients
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return apiError('JSON inválido', 400)
  }

  const name = typeof body.name === 'string' ? body.name : ''
  if (!name.trim()) {
    return apiError('name é obrigatório', 400)
  }

  const metaRes = validateInternalMetadataBody(body)
  if (!metaRes.ok) {
    return apiError(metaRes.message, 400)
  }

  const { resolved, unmappedKeys } = body.custom_values
    ? await resolveCustomValuesKeys(accountId, body.custom_values as Record<string, unknown>)
    : { resolved: {}, unmappedKeys: [] }

  const createData: Parameters<typeof prisma.client.create>[0]['data'] = {
    name: name.trim(),
    phone: typeof body.phone === 'string' ? body.phone || null : null,
    email: typeof body.email === 'string' ? body.email || null : null,
    address: typeof body.address === 'string' ? body.address || null : null,
    customValues: Object.keys(resolved).length > 0 ? JSON.stringify(resolved) : null,
    accountId,
  }
  if (metaRes.mode === 'set') {
    createData.internalMetadata = metaRes.serialized
  }

  const client = await prisma.client.create({
    data: createData,
  })

  void dispatchWebhooks(accountId, 'client.created', {
    clientId: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    createdAt: client.createdAt.toISOString(),
    internalMetadata: parseInternalMetadataFromDb(client.internalMetadata),
  })

  const idToName = await getIdToNameMap(accountId)
  const customValuesParsed = client.customValues ? JSON.parse(client.customValues) : {}

  return apiSuccess(
    {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      custom_values: formatCustomValuesWithNames(idToName, customValuesParsed),
      internal_metadata: parseInternalMetadataFromDb(client.internalMetadata),
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    },
    unmappedKeys.length > 0 ? { unmapped_keys: unmappedKeys } : undefined
  )
}
