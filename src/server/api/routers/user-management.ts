import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import nodemailer from 'nodemailer'

// Configurar transporter de email
const getEmailTransporter = () => {
  const emailServer = process.env.EMAIL_SERVER
  if (!emailServer) {
    throw new Error('EMAIL_SERVER não configurado no .env')
  }

  return nodemailer.createTransport(emailServer)
}

// Função para enviar email de convite
async function sendInviteEmail(email: string, name: string, token: string) {
  const transporter = getEmailTransporter()
  const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/setup-password?token=${token}`

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@organiza.com',
    to: email,
    subject: 'Convite para Organiza - Crie sua senha',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bem-vindo ao Organiza!</h1>
            </div>
            <div class="content">
              <p>Olá <strong>${name}</strong>,</p>
              
              <p>Você foi convidado para fazer parte da equipe no <strong>Organiza</strong>!</p>
              
              <p>Para começar a usar a plataforma, você precisa criar sua senha de acesso clicando no botão abaixo:</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Criar Minha Senha</a>
              </div>
              
              <p style="color: #666; font-size: 14px;">
                Ou copie e cole este link no seu navegador:<br>
                <code style="background: #e0e0e0; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-top: 10px;">${inviteUrl}</code>
              </p>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 13px;">
                ⚠️ <strong>Importante:</strong> Este link expira em 7 dias por motivos de segurança.
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} Organiza. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Olá ${name},

Você foi convidado para fazer parte da equipe no Organiza!

Para começar a usar a plataforma, você precisa criar sua senha de acesso através do link abaixo:

${inviteUrl}

Importante: Este link expira em 7 dias por motivos de segurança.

---
Este é um email automático, por favor não responda.
© ${new Date().getFullYear()} Organiza. Todos os direitos reservados.
    `.trim()
  }

  await transporter.sendMail(mailOptions)
}

export const userManagementRouter = createTRPCRouter({
  // Listar todos os usuários (apenas admin)
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Verificar se o usuário é admin
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem listar usuários',
        })
      }

      // Buscar todos os usuários da conta ativa
      const accountUsers = await ctx.db.accountUser.findMany({
        where: {
          accountId: ctx.session.user.activeAccountId,
        },
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return accountUsers.map(au => ({
        id: au.user.id,
        name: au.user.name,
        email: au.user.email,
        role: au.role,
        emailVerified: au.user.emailVerified,
        createdAt: au.createdAt,
        updatedAt: au.updatedAt,
      }))
    }),

  // Listar convites pendentes
  listInvites: protectedProcedure
    .query(async ({ ctx }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem listar convites',
        })
      }

      return await ctx.db.userInvite.findMany({
        where: {
          accountId: ctx.session.user.activeAccountId,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    }),

  // Convidar novo usuário
  invite: protectedProcedure
    .input(z.object({
      name: z.string().min(1, 'Nome é obrigatório'),
      email: z.string().email('Email inválido'),
      role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
    }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem convidar usuários',
        })
      }

      // Verificar se o email já está em uso
      const existingUser = await ctx.db.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        // Verificar se já está nesta conta
        const existingAccountUser = await ctx.db.accountUser.findUnique({
          where: {
            userId_accountId: {
              userId: existingUser.id,
              accountId: ctx.session.user.activeAccountId,
            },
          },
        })

        if (existingAccountUser) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Este usuário já faz parte desta conta',
          })
        }
      }

      // Verificar se já existe um convite pendente
      const existingInvite = await ctx.db.userInvite.findFirst({
        where: {
          email: input.email,
          accountId: ctx.session.user.activeAccountId,
          usedAt: null,
          expiresAt: {
            gt: new Date(),
          },
        },
      })

      if (existingInvite) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Já existe um convite pendente para este email',
        })
      }

      // Gerar token único
      const token = randomBytes(32).toString('hex')
      
      // Data de expiração: 7 dias
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Criar convite
      const invite = await ctx.db.userInvite.create({
        data: {
          email: input.email,
          name: input.name,
          accountId: ctx.session.user.activeAccountId,
          role: input.role,
          token,
          expiresAt,
          createdBy: ctx.session.user.id,
        },
      })

      // Enviar email
      try {
        await sendInviteEmail(input.email, input.name, token)
      } catch (error) {
        // Se falhar ao enviar email, deletar o convite
        await ctx.db.userInvite.delete({
          where: { id: invite.id },
        })

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao enviar email de convite: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        })
      }

      return {
        success: true,
        message: 'Convite enviado com sucesso!',
        invite,
      }
    }),

  // Cancelar convite
  cancelInvite: protectedProcedure
    .input(z.object({
      inviteId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem cancelar convites',
        })
      }

      const invite = await ctx.db.userInvite.findUnique({
        where: { id: input.inviteId },
      })

      if (!invite || invite.accountId !== ctx.session.user.activeAccountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Convite não encontrado',
        })
      }

      await ctx.db.userInvite.delete({
        where: { id: input.inviteId },
      })

      return { success: true, message: 'Convite cancelado' }
    }),

  // Atualizar role do usuário
  updateRole: protectedProcedure
    .input(z.object({
      userId: z.string(),
      role: z.nativeEnum(UserRole),
    }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem atualizar roles',
        })
      }

      // Não permitir que o usuário mude sua própria role
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Você não pode alterar sua própria role',
        })
      }

      // Atualizar a role
      await ctx.db.accountUser.update({
        where: {
          userId_accountId: {
            userId: input.userId,
            accountId: ctx.session.user.activeAccountId,
          },
        },
        data: {
          role: input.role,
        },
      })

      return { success: true, message: 'Role atualizada com sucesso' }
    }),

  // Remover usuário da conta
  remove: protectedProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem remover usuários',
        })
      }

      // Não permitir que o usuário remova a si mesmo
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Você não pode remover a si mesmo',
        })
      }

      // Verificar se é o único OWNER
      const accountUser = await ctx.db.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: input.userId,
            accountId: ctx.session.user.activeAccountId,
          },
        },
      })

      if (accountUser?.role === UserRole.OWNER) {
        const ownerCount = await ctx.db.accountUser.count({
          where: {
            accountId: ctx.session.user.activeAccountId,
            role: UserRole.OWNER,
          },
        })

        if (ownerCount === 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Não é possível remover o único proprietário da conta',
          })
        }
      }

      // Remover o usuário da conta
      await ctx.db.accountUser.delete({
        where: {
          userId_accountId: {
            userId: input.userId,
            accountId: ctx.session.user.activeAccountId,
          },
        },
      })

      return { success: true, message: 'Usuário removido com sucesso' }
    }),

  // Reenviar convite
  resendInvite: protectedProcedure
    .input(z.object({
      inviteId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem reenviar convites',
        })
      }

      const invite = await ctx.db.userInvite.findUnique({
        where: { id: input.inviteId },
      })

      if (!invite || invite.accountId !== ctx.session.user.activeAccountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Convite não encontrado',
        })
      }

      if (invite.usedAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Este convite já foi utilizado',
        })
      }

      // Atualizar data de expiração
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)

      await ctx.db.userInvite.update({
        where: { id: invite.id },
        data: {
          expiresAt: newExpiresAt,
        },
      })

      // Reenviar email
      await sendInviteEmail(invite.email, invite.name, invite.token)

      return { success: true, message: 'Convite reenviado com sucesso' }
    }),
})


