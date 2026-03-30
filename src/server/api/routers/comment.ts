import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

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
      const comment = await ctx.prisma.comment.create({
        data: {
          content: input.content,
          subtaskId: input.subtaskId,
          authorId: input.authorId,
          readBy: JSON.stringify([input.authorId]), // Autor já leu
        },
        include: {
          author: true,
          subtask: {
            include: {
              mainTask: true,
            },
          },
        },
      })

      void dispatchWebhooks(comment.subtask.mainTask.accountId, 'comment.added', {
        commentId: comment.id,
        subtaskId: comment.subtaskId,
        mainTaskId: comment.subtask.mainTaskId,
        authorId: comment.authorId,
        authorName: comment.author.name,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
      })

      return comment
    }),

  // Listar comentรกrios por subtarefa
  getBySubtask: publicProcedure
    .input(z.object({ subtaskId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.comment.findMany({
        where: { subtaskId: input.subtaskId },
        include: {
          author: true,
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // Atualizar comentรกrio
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

  // Deletar comentรกrio
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.comment.delete({
        where: { id: input.id },
      })
    }),

  // Marcar comentรกrios como lidos
  markAsRead: publicProcedure
    .input(
      z.object({
        subtaskId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Buscar todos os comentรกrios nรฃo lidos desta subtask
      const comments = await ctx.prisma.comment.findMany({
        where: { subtaskId: input.subtaskId },
      })

      // Atualizar cada comentรกrio para incluir o userId no readBy
      const updatePromises = comments.map(comment => {
        let readByArray: string[] = []
        
        try {
          readByArray = comment.readBy ? JSON.parse(comment.readBy) : []
        } catch {
          readByArray = []
        }

        // Se o usuรกrio jรก leu, nรฃo precisa atualizar
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
