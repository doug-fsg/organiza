import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { NotificationType } from '@prisma/client'

export const notificationRouter = createTRPCRouter({
  // Criar notificação
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.nativeEnum(NotificationType),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.create({
        data: {
          title: input.title,
          message: input.message,
          type: input.type,
          userId: input.userId,
        },
        include: {
          user: true,
        },
      })
    }),

  // Listar notificações por usuário
  getByUser: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        read: z.boolean().optional(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.notification.findMany({
        where: {
          userId: input.userId,
          ...(input.read !== undefined && { read: input.read }),
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // Marcar notificação como lida
  markAsRead: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id },
        data: { read: true },
      })
    }),

  // Marcar todas as notificações de um usuário como lidas
  markAllAsRead: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.updateMany({
        where: { userId: input.userId, read: false },
        data: { read: true },
      })
    }),

  // Deletar notificação
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.delete({
        where: { id: input.id },
      })
    }),

  // Contar notificações não lidas
  getUnreadCount: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.notification.count({
        where: { userId: input.userId, read: false },
      })
    }),
})
