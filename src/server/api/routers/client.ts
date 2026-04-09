import { z } from 'zod'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'
import { clientPublicSelect } from '@/lib/client-public-fields'
import { parseInternalMetadataFromDb } from '@/lib/client-internal-metadata'

export const clientRouter = createTRPCRouter({
  list: accountProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50
      const offset = input?.offset ?? 0

      const [clients, total] = await Promise.all([
        ctx.prisma.client.findMany({
          where: { accountId: ctx.accountId },
          orderBy: { name: 'asc' },
          take: limit,
          skip: offset,
          select: clientPublicSelect,
        }),
        ctx.prisma.client.count({
          where: { accountId: ctx.accountId },
        }),
      ])

      return {
        clients,
        total,
        hasMore: offset + limit < total,
      }
    }),

  getById: accountProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
        select: clientPublicSelect,
      })

      if (!client || client.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        })
      }

      return client
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        phone: z.string().optional(),
        email: z.string().email('Email inválido').optional().or(z.literal('')),
        address: z.string().optional(),
        customValues: z.record(z.string(), z.any()).optional(),
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
          message: 'Apenas administradores e gerentes podem criar clientes',
        })
      }

      const client = await ctx.prisma.client.create({
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email || null,
          address: input.address,
          customValues: input.customValues ? JSON.stringify(input.customValues) : null,
          accountId: ctx.accountId,
        },
        select: { ...clientPublicSelect, internalMetadata: true },
      })

      const { internalMetadata: createdMeta, ...publicClient } = client

      void dispatchWebhooks(ctx.accountId!, 'client.created', {
        clientId: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        createdAt: client.createdAt.toISOString(),
        internalMetadata: parseInternalMetadataFromDb(createdMeta),
      })

      return publicClient
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, 'Nome é obrigatório').optional(),
        phone: z.string().optional(),
        email: z.string().email('Email inválido').optional().or(z.literal('')),
        address: z.string().optional(),
        customValues: z.record(z.string(), z.any()).optional(),
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
          message: 'Apenas administradores e gerentes podem atualizar clientes',
        })
      }

      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
      })

      if (!client || client.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        })
      }

      const { id, ...updateData } = input

      const updated = await ctx.prisma.client.update({
        where: { id },
        data: {
          ...updateData,
          email: updateData.email === '' ? null : updateData.email,
          customValues: updateData.customValues ? JSON.stringify(updateData.customValues) : undefined,
        },
        select: { ...clientPublicSelect, internalMetadata: true },
      })

      const { internalMetadata: updatedMeta, ...publicUpdated } = updated

      void dispatchWebhooks(ctx.accountId!, 'client.updated', {
        clientId: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        updatedAt: updated.updatedAt.toISOString(),
        internalMetadata: parseInternalMetadataFromDb(updatedMeta),
      })

      return publicUpdated
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
          message: 'Apenas administradores e gerentes podem deletar clientes',
        })
      }

      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
      })

      if (!client || client.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Cliente não encontrado',
        })
      }

      await ctx.prisma.client.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),
})
