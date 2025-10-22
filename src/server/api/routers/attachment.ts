import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '@/server/api/trpc'
import { unlink } from 'fs/promises'
import path from 'path'

export const attachmentRouter = createTRPCRouter({
  // Criar anexo (vinculado a um comentário)
  create: publicProcedure
    .input(
      z.object({
        commentId: z.string(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        filePath: z.string(),
        uploadedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.commentAttachment.create({
        data: {
          commentId: input.commentId,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          filePath: input.filePath,
          uploadedBy: input.uploadedBy,
        },
      })
    }),

  // Criar múltiplos anexos de uma vez
  createMany: publicProcedure
    .input(
      z.object({
        commentId: z.string(),
        attachments: z.array(
          z.object({
            fileName: z.string(),
            fileSize: z.number(),
            mimeType: z.string(),
            filePath: z.string(),
            uploadedBy: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const createdAttachments = await Promise.all(
        input.attachments.map((attachment) =>
          ctx.prisma.commentAttachment.create({
            data: {
              commentId: input.commentId,
              ...attachment,
            },
          })
        )
      )
      return createdAttachments
    }),

  // Deletar anexo (apenas o autor pode deletar)
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(), // Para verificar se é o autor
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Buscar anexo
      const attachment = await ctx.prisma.commentAttachment.findUnique({
        where: { id: input.id },
      })

      if (!attachment) {
        throw new Error('Anexo não encontrado')
      }

      // Verificar se o usuário é o autor
      if (attachment.uploadedBy !== input.userId) {
        throw new Error('Você não tem permissão para deletar este anexo')
      }

      // Deletar arquivo físico
      try {
        const filePath = path.join(process.cwd(), 'public', attachment.filePath)
        await unlink(filePath)
      } catch (error) {
        console.error('Erro ao deletar arquivo físico:', error)
        // Continua mesmo se falhar (arquivo pode já não existir)
      }

      // Deletar registro do banco
      await ctx.prisma.commentAttachment.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // Listar anexos por comentário
  getByComment: publicProcedure
    .input(z.object({ commentId: z.string() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.commentAttachment.findMany({
        where: { commentId: input.commentId },
        orderBy: { uploadedAt: 'asc' },
      })
    }),
})


