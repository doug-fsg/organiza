import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

const KEY_PREFIX_LENGTH = 12 // "sk_" + 9 chars para lookup

export interface ApiAuthResult {
  accountId: string
  userId: string
}

/**
 * Extrai o access_token da requisição.
 * Suporta: Authorization: Bearer <token> ou api_access_token: <token>
 */
function extractAccessToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim()
  }
  const apiToken = req.headers.get('api_access_token')
  if (apiToken) {
    return apiToken.trim()
  }
  return null
}

/**
 * Valida o access_token (API Key) e retorna accountId e userId se válido.
 * Valida access_token (API Key) para requisições externas.
 */
export async function validateApiKey(
  req: NextRequest,
  pathAccountId: string
): Promise<ApiAuthResult | null> {
  const token = extractAccessToken(req)
  if (!token || token.length < KEY_PREFIX_LENGTH) return null

  const keyPrefix = token.substring(0, KEY_PREFIX_LENGTH)
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      accountId: pathAccountId,
      keyPrefix,
    },
    include: { account: true },
  })

  if (!apiKey) return null
  const isValid = await bcrypt.compare(token, apiKey.keyHash)
  if (!isValid) return null

  // Atualizar lastUsedAt (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  return {
    accountId: apiKey.accountId,
    userId: apiKey.createdBy,
  }
}
