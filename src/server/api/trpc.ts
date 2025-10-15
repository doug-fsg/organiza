import { initTRPC, TRPCError } from '@trpc/server'
import { type NextRequest } from 'next/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

// Contexto para o tRPC com autenticação
export const createTRPCContext = async (opts: { req: NextRequest }) => {
  // Obter token do NextAuth
  const token = await getToken({
    req: opts.req,
    secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-dev-only',
  })

  // Construir session no mesmo formato do NextAuth
  const session = token ? {
    user: {
      id: token.id as string,
      email: token.email as string,
      name: token.name as string,
      image: token.picture as string | null | undefined,
      accounts: token.accounts as any[],
      activeAccountId: token.activeAccountId as string | undefined,
    }
  } : null

  return {
    db: prisma, // Usar 'db' para consistência com o resto do código
    prisma, // Manter 'prisma' para compatibilidade
    req: opts.req,
    session,
    // accountId da conta ativa do usuário (para filtros)
    accountId: session?.user?.activeAccountId,
    userId: session?.user?.id,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
})

export const createTRPCRouter = t.router

// Procedure público (sem autenticação)
export const publicProcedure = t.procedure

// Procedure que exige autenticação
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ 
      code: 'UNAUTHORIZED',
      message: 'Você precisa estar autenticado para acessar este recurso'
    })
  }
  
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

// Procedure que exige autenticação + conta ativa (multi-tenancy)
export const accountProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.accountId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Nenhuma conta ativa selecionada. Por favor, selecione uma conta.'
    })
  }
  
  return next({
    ctx: {
      ...ctx,
      accountId: ctx.accountId, // Garantir que accountId está disponível
    },
  })
})
