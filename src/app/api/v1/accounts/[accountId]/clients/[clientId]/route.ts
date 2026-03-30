import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiNotFound, apiError } from '@/lib/api-external/response'
import {
  resolveCustomValuesKeys,
  getIdToNameMap,
  formatCustomValuesWithNames,
} from '@/lib/api-external/custom-values'
import { prisma } from '@/lib/prisma'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

function parseCustomValues(customValues: string | null): Record<string, unknown> {
  if (!customValues) return {}
  try {
    return JSON.parse(customValues) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * GET /api/v1/accounts/{account_id}/clients/{client_id}
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; clientId: string }> }
) {
  const { accountId, clientId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const client = await prisma.client.findFirst({
    where: { id: clientId, accountId },
  })

  if (!client) return apiNotFound('Cliente não encontrado')

  const idToName = await getIdToNameMap(accountId)
  const customValues = formatCustomValuesWithNames(
    idToName,
    parseCustomValues(client.customValues)
  )

  return apiSuccess({
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    custom_values: customValues,
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  })
}

/**
 * PATCH /api/v1/accounts/{account_id}/clients/{client_id}
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string; clientId: string }> }
) {
  const { accountId, clientId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const existing = await prisma.client.findFirst({
    where: { id: clientId, accountId },
  })
  if (!existing) return apiNotFound('Cliente não encontrado')

  let body: {
    name?: string
    phone?: string
    email?: string
    address?: string
    custom_values?: Record<string, unknown>
  }
  try {
    body = await req.json()
  } catch {
    return apiError('JSON inválido', 400)
  }

  if (body?.name !== undefined && !body.name.trim()) {
    return apiError('name não pode ser vazio', 400)
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.phone !== undefined) data.phone = body.phone || null
  if (body.email !== undefined) data.email = body.email || null
  if (body.address !== undefined) data.address = body.address || null

  let unmappedKeys: string[] = []
  if (body.custom_values !== undefined) {
    const { resolved, unmappedKeys: unmapped } = await resolveCustomValuesKeys(
      accountId,
      body.custom_values as Record<string, unknown>
    )
    data.customValues = JSON.stringify(resolved)
    unmappedKeys = unmapped
  }

  const client = await prisma.client.update({
    where: { id: clientId },
    data,
  })

  void dispatchWebhooks(accountId, 'client.updated', {
    clientId: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    updatedAt: client.updatedAt.toISOString(),
  })

  const idToName = await getIdToNameMap(accountId)
  const customValues = formatCustomValuesWithNames(
    idToName,
    parseCustomValues(client.customValues)
  )

  return apiSuccess(
    {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      custom_values: customValues,
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    },
    unmappedKeys.length > 0 ? { unmapped_keys: unmappedKeys } : undefined
  )
}
