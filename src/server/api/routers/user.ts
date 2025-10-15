import { z } from 'zod'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { UserRole } from '@prisma/client'

export const userRouter = createTRPCRouter({
  // Listar todos os usuários da conta ativa
  getAll: accountProcedure.query(async ({ ctx }) => {
    // Buscar usuários que fazem parte da conta ativa
    const accountUsers = await ctx.prisma.accountUser.findMany({
      where: { accountId: ctx.accountId },
      include: {
        user: {
          include: {
            assignedSubtasks: {
              where: {
                mainTask: {
                  accountId: ctx.accountId, // Apenas subtarefas da conta ativa
                },
              },
              include: {
                mainTask: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transformar para incluir o role da conta
    return accountUsers.map(au => ({
      ...au.user,
      role: au.role, // Role específico da conta
    }))
  }),

  // Buscar usuário por ID (apenas se estiver na mesma conta)
  getById: accountProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const accountUser = await ctx.prisma.accountUser.findFirst({
        where: {
          userId: input.id,
          accountId: ctx.accountId,
        },
        include: {
          user: {
            include: {
              assignedSubtasks: {
                where: {
                  mainTask: {
                    accountId: ctx.accountId,
                  },
                },
                include: {
                  mainTask: true,
                },
              },
            },
          },
        },
      })

      if (!accountUser) {
        throw new Error('Usuário não encontrado nesta conta')
      }

      return {
        ...accountUser.user,
        role: accountUser.role,
      }
    }),

  // Obter informações do usuário logado
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      include: {
        accounts: {
          include: {
            account: true,
          },
        },
      },
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    return {
      ...user,
      activeAccountId: ctx.accountId,
    }
  }),
})
