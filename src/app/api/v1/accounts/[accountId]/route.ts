import { NextRequest } from 'next/server'
import { validateApiKey } from '@/lib/api-external/auth'
import { apiSuccess, apiUnauthorized, apiNotFound } from '@/lib/api-external/response'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/v1/accounts/{account_id}
 * Retorna detalhes da conta. Útil para validar o token.
 * GET /api/v1/accounts/{account_id}
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params
  const auth = await validateApiKey(req, accountId)
  if (!auth) return apiUnauthorized()

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
    },
  })

  if (!account || account.id !== auth.accountId) {
    return apiNotFound('Conta não encontrada')
  }

  return apiSuccess({
    id: account.id,
    name: account.name,
    slug: account.slug,
    created_at: account.createdAt,
  })
}
