import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

const KEY_PREFIX = 'sk_'
const KEY_PREFIX_LENGTH = 12

export const apiKeyRouter = createTRPCRouter({
  list: accountProcedure.query(async ({ ctx }) => {
    const keys = await ctx.prisma.apiKey.findMany({
      where: { accountId: ctx.accountId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
    })
    return { keys, accountId: ctx.accountId }
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1, 'Nome é obrigatório') }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        (acc) => acc.accountId === ctx.session.user.activeAccountId
      )

      if (
        !activeAccount ||
        ![UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(activeAccount.role)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem criar API Keys',
        })
      }

      if (!ctx.accountId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selecione uma conta ativa',
        })
      }

      const rawKey = `${KEY_PREFIX}${nanoid(32)}`
      const keyHash = await bcrypt.hash(rawKey, 10)
      const keyPrefix = rawKey.substring(0, KEY_PREFIX_LENGTH)

      await ctx.prisma.apiKey.create({
        data: {
          accountId: ctx.accountId,
          name: input.name,
          keyPrefix,
          keyHash,
          createdBy: ctx.userId!,
        },
      })

      return { api_key: rawKey, message: 'Guarde esta chave. Ela não será exibida novamente.' }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        (acc) => acc.accountId === ctx.session.user.activeAccountId
      )

      if (
        !activeAccount ||
        ![UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(activeAccount.role)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem revogar API Keys',
        })
      }

      const apiKey = await ctx.prisma.apiKey.findFirst({
        where: { id: input.id, accountId: ctx.accountId },
      })

      if (!apiKey) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API Key não encontrada',
        })
      }

      await ctx.prisma.apiKey.delete({ where: { id: input.id } })
      return { success: true }
    }),
})
