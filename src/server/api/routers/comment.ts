import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'

export const commentRouter = createTRPCRouter({
  // Criar comentário
  create: publicProcedure
    .input(
      z.object({
        content: z.string().min(1),
        subtaskId: z.string(),
        authorId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Autor já leu automaticamente (marca como lido ao criar)
      return ctx.prisma.comment.create({
        data: {
          content: input.content,
          subtaskId: input.subtaskId,
          authorId: input.authorId,
          readBy: JSON.stringify([input.authorId]), // Autor já leu
        },
        include: {
          author: true,
          subtask: true,
        },
      })
    }),

  // Listar comentários por subtarefa
  getBySubtask: publicProcedure
    .input(z.object({ subtaskId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.comment.findMany({
        where: { subtaskId: input.subtaskId },
        include: {
          author: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // Atualizar comentário
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.update({
        where: { id: input.id },
        data: { content: input.content },
        include: {
          author: true,
          subtask: true,
        },
      })
    }),

  // Deletar comentário
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.delete({
        where: { id: input.id },
      })
    }),

  // Marcar comentários como lidos
  markAsRead: publicProcedure
    .input(
      z.object({
        subtaskId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Buscar todos os comentários não lidos desta subtask
      const comments = await ctx.prisma.comment.findMany({
        where: { subtaskId: input.subtaskId },
      })

      // Atualizar cada comentário para incluir o userId no readBy
      const updatePromises = comments.map(comment => {
        let readByArray: string[] = []
        
        try {
          readByArray = comment.readBy ? JSON.parse(comment.readBy) : []
        } catch {
          readByArray = []
        }

        // Se o usuário já leu, não precisa atualizar
        if (readByArray.includes(input.userId)) {
          return Promise.resolve()
        }

        // Adicionar userId ao array
        readByArray.push(input.userId)

        return ctx.prisma.comment.update({
          where: { id: comment.id },
          data: { readBy: JSON.stringify(readByArray) },
        })
      })

      await Promise.all(updatePromises)

      return { success: true }
    }),
})
