import { z } from 'zod'
import { createTRPCRouter, accountProcedure, protectedProcedure } from '@/server/api/trpc'
import { TRPCError } from '@trpc/server'
import { UserRole } from '@prisma/client'

export const departmentRouter = createTRPCRouter({
  // Criar setor (apenas ADMIN/OWNER)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem criar setores',
        })
      }

      return ctx.prisma.department.create({
        data: {
          name: input.name,
          description: input.description,
          accountId: ctx.accountId,
        },
      })
    }),

  // Listar todos os setores da conta
  getAll: accountProcedure.query(({ ctx }) => {
    return ctx.prisma.department.findMany({
      where: { accountId: ctx.accountId },
      include: {
        _count: {
          select: {
            departmentUsers: true,
            departmentTasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Buscar setor por ID
  getById: accountProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.id },
        include: {
          departmentUsers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          departmentTasks: {
            include: {
              mainTask: {
                include: {
                  creator: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  subtasks: true,
                },
              },
            },
          },
        },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      return department
    }),

  // Atualizar setor
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem editar setores',
        })
      }

      // Verificar se o setor pertence à conta
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.id },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      return ctx.prisma.department.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
        },
      })
    }),

  // Deletar setor
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem deletar setores',
        })
      }

      // Verificar se o setor pertence à conta
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.id },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      return ctx.prisma.department.delete({
        where: { id: input.id },
      })
    }),

  // Adicionar usuário ao setor
  addUser: protectedProcedure
    .input(
      z.object({
        departmentId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem gerenciar usuários dos setores',
        })
      }

      // Verificar se o setor pertence à conta
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.departmentId },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      // Verificar se o usuário pertence à conta
      const accountUser = await ctx.prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: input.userId,
            accountId: ctx.accountId,
          },
        },
      })

      if (!accountUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado nesta conta',
        })
      }

      // Verificar se já está no setor
      const existing = await ctx.prisma.departmentUser.findUnique({
        where: {
          departmentId_userId: {
            departmentId: input.departmentId,
            userId: input.userId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Usuário já está neste setor',
        })
      }

      return ctx.prisma.departmentUser.create({
        data: {
          departmentId: input.departmentId,
          userId: input.userId,
        },
      })
    }),

  // Remover usuário do setor
  removeUser: protectedProcedure
    .input(
      z.object({
        departmentId: z.string(),
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem gerenciar usuários dos setores',
        })
      }

      // Verificar se o setor pertence à conta
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.departmentId },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      return ctx.prisma.departmentUser.delete({
        where: {
          departmentId_userId: {
            departmentId: input.departmentId,
            userId: input.userId,
          },
        },
      })
    }),

  // Atribuir projeto ao setor
  assignTask: protectedProcedure
    .input(
      z.object({
        departmentId: z.string(),
        mainTaskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão (MANAGER+)
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas gerentes ou superiores podem atribuir projetos aos setores',
        })
      }

      // Verificar se o setor pertence à conta
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.departmentId },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      // Verificar se a tarefa pertence à conta
      const mainTask = await ctx.prisma.mainTask.findUnique({
        where: { id: input.mainTaskId },
      })

      if (!mainTask || mainTask.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Projeto não encontrado',
        })
      }

      // Verificar se já está atribuído
      const existing = await ctx.prisma.departmentTask.findUnique({
        where: {
          departmentId_mainTaskId: {
            departmentId: input.departmentId,
            mainTaskId: input.mainTaskId,
          },
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Projeto já está neste setor',
        })
      }

      return ctx.prisma.departmentTask.create({
        data: {
          departmentId: input.departmentId,
          mainTaskId: input.mainTaskId,
        },
      })
    }),

  // Remover projeto do setor
  unassignTask: protectedProcedure
    .input(
      z.object({
        departmentId: z.string(),
        mainTaskId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissão (MANAGER+)
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (
        !activeAccount ||
        (activeAccount.role !== UserRole.ADMIN &&
          activeAccount.role !== UserRole.OWNER &&
          activeAccount.role !== UserRole.MANAGER)
      ) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas gerentes ou superiores podem remover projetos dos setores',
        })
      }

      // Verificar se o setor pertence à conta
      const department = await ctx.prisma.department.findUnique({
        where: { id: input.departmentId },
      })

      if (!department || department.accountId !== ctx.accountId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Setor não encontrado',
        })
      }

      return ctx.prisma.departmentTask.delete({
        where: {
          departmentId_mainTaskId: {
            departmentId: input.departmentId,
            mainTaskId: input.mainTaskId,
          },
        },
      })
    }),

  // Obter setores do usuário logado
  getUserDepartments: protectedProcedure.query(({ ctx }) => {
    return ctx.prisma.department.findMany({
      where: {
        accountId: ctx.accountId,
        departmentUsers: {
          some: {
            userId: ctx.userId,
          },
        },
      },
      orderBy: { name: 'asc' },
    })
  }),

  // Obter setores de um usuário específico (para gestão)
  getUserDepartmentsById: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verificar permissão (ADMIN/OWNER)
      const activeAccount = ctx.session.user.accounts.find(
        acc => acc.accountId === ctx.session.user.activeAccountId
      )

      if (!activeAccount || (activeAccount.role !== UserRole.ADMIN && activeAccount.role !== UserRole.OWNER)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas administradores podem ver setores de outros usuários',
        })
      }

      // Verificar se o usuário pertence à conta
      const accountUser = await ctx.prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: input.userId,
            accountId: ctx.accountId,
          },
        },
      })

      if (!accountUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado nesta conta',
        })
      }

      return ctx.prisma.department.findMany({
        where: {
          accountId: ctx.accountId,
          departmentUsers: {
            some: {
              userId: input.userId,
            },
          },
        },
        include: {
          departmentUsers: {
            where: {
              userId: input.userId,
            },
          },
        },
        orderBy: { name: 'asc' },
      })
    }),
})

