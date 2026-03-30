import { z } from 'zod'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'
import { ALL_WEBHOOK_EVENT_IDS } from '@/lib/webhook-events'

export const webhookRouter = createTRPCRouter({
  list: accountProcedure.query(async ({ ctx }) => {
    const webhooks = await ctx.prisma.webhook.findMany({
      where: { accountId: ctx.accountId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        name: true,
        createdAt: true,
      },
    })

    return {
      webhooks: webhooks.map((w) => ({
        ...w,
        events: parseEvents(w.events),
      })),
      accountId: ctx.accountId,
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url('URL inválida'),
        name: z.string().min(1, 'Nome é obrigatório').optional(),
        events: z.array(z.string()).refine(
          (arr) => arr.length > 0 && arr.every((e) => ALL_WEBHOOK_EVENT_IDS.includes(e as (typeof ALL_WEBHOOK_EVENT_IDS)[number])),
          { message: 'Selecione pelo menos um evento válido' }
        ),
        secret: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.accountId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Selecione uma conta ativa',
        })
      }

      const activeAccount = ctx.session.user.accounts.find(
        (acc) => acc.accountId === ctx.session.user.activeAccountId
      )

      if (
        !activeAccount ||
        ![UserRole.ADMIN, UserRole.OWNER, UserRole.MANAGER].includes(activeAccount.role)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores e gerentes podem criar webhooks',
        })
      }

      return ctx.prisma.webhook.create({
        data: {
          accountId: ctx.accountId,
          url: input.url,
          name: input.name ?? 'Webhook',
          events: JSON.stringify(input.events),
          secret: input.secret ?? null,
        },
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().url('URL inválida').optional(),
        name: z.string().min(1).optional(),
        events: z
          .array(z.string())
          .refine(
            (arr) =>
              arr.length === 0 ||
              arr.every((e) => ALL_WEBHOOK_EVENT_IDS.includes(e as (typeof ALL_WEBHOOK_EVENT_IDS)[number]))
          )
          .optional(),
        secret: z.string().nullable().optional(),
      })
    )
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
          message: 'Apenas administradores e gerentes podem atualizar webhooks',
        })
      }

      const webhook = await ctx.prisma.webhook.findFirst({
        where: { id: input.id, accountId: ctx.accountId },
      })

      if (!webhook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook não encontrado',
        })
      }

      const data: Record<string, unknown> = {}
      if (input.url !== undefined) data.url = input.url
      if (input.name !== undefined) data.name = input.name
      if (input.events !== undefined) data.events = JSON.stringify(input.events)
      if (input.secret !== undefined) data.secret = input.secret

      return ctx.prisma.webhook.update({
        where: { id: input.id },
        data,
      })
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
          message: 'Apenas administradores e gerentes podem excluir webhooks',
        })
      }

      const webhook = await ctx.prisma.webhook.findFirst({
        where: { id: input.id, accountId: ctx.accountId },
      })

      if (!webhook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook não encontrado',
        })
      }

      await ctx.prisma.webhook.delete({ where: { id: input.id } })
      return { success: true }
    }),
})

function parseEvents(eventsJson: string): string[] {
  try {
    const parsed = JSON.parse(eventsJson) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
