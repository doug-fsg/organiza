import { z } from 'zod'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

const customAttributeTypeSchema = z.enum(['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'FILE'])

export const clientCustomAttributeRouter = createTRPCRouter({
  getAll: accountProcedure.query(({ ctx }) => {
    return ctx.prisma.clientCustomAttribute.findMany({
      where: { accountId: ctx.accountId },
      orderBy: { order: 'asc' },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        type: customAttributeTypeSchema,
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || 
          (activeAccount.role !== UserRole.ADMIN && 
           activeAccount.role !== UserRole.OWNER && 
           activeAccount.role !== UserRole.MANAGER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem criar atributos',
        })
      }

      let order = input.order
      if (order === undefined) {
        const maxOrder = await ctx.prisma.clientCustomAttribute.findFirst({
          where: { accountId: ctx.accountId },
          orderBy: { order: 'desc' },
          select: { order: true },
        })
        order = (maxOrder?.order ?? -1) + 1
      }

      return ctx.prisma.clientCustomAttribute.create({
        data: {
          name: input.name,
          type: input.type,
          order,
          accountId: ctx.accountId,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Nome é obrigatório').optional(),
        type: customAttributeTypeSchema.optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || 
          (activeAccount.role !== UserRole.ADMIN && 
           activeAccount.role !== UserRole.OWNER && 
           activeAccount.role !== UserRole.MANAGER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem atualizar atributos',
        })
      }

      const attribute = await ctx.prisma.clientCustomAttribute.findUnique({
        where: { id: input.id },
      })

      if (!attribute || attribute.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Atributo não encontrado',
        })
      }

      const { id, ...updateData } = input

      return ctx.prisma.clientCustomAttribute.update({
        where: { id },
        data: updateData,
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || 
          (activeAccount.role !== UserRole.ADMIN && 
           activeAccount.role !== UserRole.OWNER && 
           activeAccount.role !== UserRole.MANAGER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem deletar atributos',
        })
      }

      const attribute = await ctx.prisma.clientCustomAttribute.findUnique({
        where: { id: input.id },
      })

      if (!attribute || attribute.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Atributo não encontrado',
        })
      }

      await ctx.prisma.clientCustomAttribute.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  deleteBulk: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1, 'Selecione ao menos um atributo') }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount ||
          (activeAccount.role !== UserRole.ADMIN &&
           activeAccount.role !== UserRole.OWNER &&
           activeAccount.role !== UserRole.MANAGER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem deletar atributos',
        })
      }

      const result = await ctx.prisma.clientCustomAttribute.deleteMany({
        where: {
          id: { in: input.ids },
          accountId: ctx.accountId,
        },
      })

      return { success: true, deletedCount: result.count }
    }),
})
