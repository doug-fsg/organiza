import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc'
import { ServicePaymentStatus, UserRole } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { dispatchWebhooks } from '@/lib/webhook-dispatch'

export const servicePaymentRouter = createTRPCRouter({
  // FORNECEDOR: Criar serviço
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1, 'Descrição é obrigatória'),
        value: z.number().min(0.01, 'Valor deve ser maior que zero'),
        serviceDate: z.date(),
        attachments: z.array(
          z.object({
            fileName: z.string(),
            fileSize: z.number(),
            mimeType: z.string(),
            filePath: z.string(),
          })
        ).min(1, 'Pelo menos um anexo é obrigatório (NFS-e, DANFE, Recibo ou Fatura)'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é fornecedor
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || userAccount.role !== UserRole.SUPPLIER) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas fornecedores podem criar serviços' 
        })
      }

      const servicePayment = await prisma.servicePayment.create({
        data: {
          description: input.description,
          value: input.value,
          serviceDate: input.serviceDate,
          accountId: session.user.activeAccountId,
          supplierId: session.user.id,
          attachments: input.attachments ? {
            create: input.attachments.map(att => ({
              ...att,
              uploadedBy: session.user.id,
            }))
          } : undefined,
        },
        include: {
          supplier: { select: { name: true } },
          attachments: true,
        },
      })

      // Notificar gestores
      const managers = await prisma.accountUser.findMany({
        where: {
          accountId: session.user.activeAccountId,
          role: { in: [UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER] },
        },
        include: { user: true },
      })

      await prisma.notification.createMany({
        data: managers.map(manager => ({
          userId: manager.userId,
          title: 'Novo serviço cadastrado',
          message: `${servicePayment.supplier.name} cadastrou: ${input.description}`,
          type: 'SERVICE_PAYMENT_CREATED',
        })),
      })

      void dispatchWebhooks(servicePayment.accountId, 'service_payment.created', {
        servicePaymentId: servicePayment.id,
        description: servicePayment.description,
        value: servicePayment.value,
        serviceDate: servicePayment.serviceDate.toISOString(),
        status: servicePayment.status,
        supplierName: servicePayment.supplier.name,
        createdAt: servicePayment.createdAt.toISOString(),
      })

      return servicePayment
    }),

  // FORNECEDOR: Criar múltiplos serviços em lote
  createBulk: protectedProcedure
    .input(
      z.object({
        services: z.array(
          z.object({
            description: z.string().min(1, 'Descrição é obrigatória'),
            value: z.number().min(0.01, 'Valor deve ser maior que zero'),
            serviceDate: z.date(),
            attachments: z.array(
              z.object({
                fileName: z.string(),
                fileSize: z.number(),
                mimeType: z.string(),
                filePath: z.string(),
              })
            ).min(1, 'Pelo menos um anexo é obrigatório para cada serviço'),
          })
        ).min(1, 'Pelo menos um serviço deve ser cadastrado'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é fornecedor
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || userAccount.role !== UserRole.SUPPLIER) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas fornecedores podem criar serviços' 
        })
      }

      // Criar todos os serviços
      const createdServices = await Promise.all(
        input.services.map(service => 
          prisma.servicePayment.create({
            data: {
              description: service.description,
              value: service.value,
              serviceDate: service.serviceDate,
              accountId: session.user.activeAccountId,
              supplierId: session.user.id,
              attachments: {
                create: service.attachments.map(att => ({
                  ...att,
                  uploadedBy: session.user.id,
                }))
              },
            },
            include: {
              supplier: { select: { name: true } },
              attachments: true,
            },
          })
        )
      )

      // Notificar gestores sobre os novos serviços
      const managers = await prisma.accountUser.findMany({
        where: {
          accountId: session.user.activeAccountId,
          role: { in: [UserRole.MANAGER, UserRole.ADMIN, UserRole.OWNER] },
        },
        include: { user: true },
      })

      if (managers.length > 0) {
        await prisma.notification.createMany({
          data: managers.map(manager => ({
            userId: manager.userId,
            title: `${createdServices.length} novo(s) serviço(s) cadastrado(s)`,
            message: `${createdServices[0].supplier.name} cadastrou ${createdServices.length} serviço(s) em lote`,
            type: 'SERVICE_PAYMENT_CREATED' as const,
          })),
        })
      }

      for (const svc of createdServices) {
        void dispatchWebhooks(svc.accountId, 'service_payment.created', {
          servicePaymentId: svc.id,
          description: svc.description,
          value: svc.value,
          serviceDate: svc.serviceDate.toISOString(),
          status: svc.status,
          supplierName: svc.supplier.name,
          createdAt: svc.createdAt.toISOString(),
        })
      }

      return {
        count: createdServices.length,
        services: createdServices,
      }
    }),

  // FORNECEDOR: Deletar serviço pendente
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é fornecedor e se o serviço pertence a ele
      const servicePayment = await prisma.servicePayment.findUnique({
        where: { id: input.id },
      })

      if (!servicePayment) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Serviço não encontrado' 
        })
      }

      if (servicePayment.accountId !== session.user.activeAccountId) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Serviço não pertence à sua conta' 
        })
      }

      if (servicePayment.supplierId !== session.user.id) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas o fornecedor que criou o serviço pode deletá-lo' 
        })
      }

      if (servicePayment.status !== ServicePaymentStatus.PENDING) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas serviços pendentes podem ser deletados' 
        })
      }

      await prisma.servicePayment.delete({
        where: { id: input.id },
      })

      return { success: true }
    }),

  // FORNECEDOR: Listar meus serviços
  listMyServices: protectedProcedure
    .input(
      z.object({
        status: z.nativeEnum(ServicePaymentStatus).optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().min(2000).max(2100).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Construir filtro de data se mês e ano forem fornecidos
      const dateFilter: any = {}
      if (input.month !== undefined && input.year !== undefined) {
        // Mês em JavaScript é 0-indexed, então subtraímos 1
        const startDate = new Date(input.year, input.month - 1, 1)
        startDate.setHours(0, 0, 0, 0)
        // Para obter o último dia do mês, usamos o próximo mês e dia 0
        const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999)
        dateFilter.serviceDate = {
          gte: startDate,
          lte: endDate,
        }
      }

      return prisma.servicePayment.findMany({
        where: {
          accountId: session.user.activeAccountId,
          supplierId: session.user.id,
          ...(input.status && { status: input.status }),
          ...dateFilter,
        },
        include: {
          attachments: true,
          paymentReceipt: true,
          approvedBy: { select: { name: true } },
          rejectedBy: { select: { name: true } },
          paidBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }),

  // GESTOR: Listar serviços pendentes
  listPending: protectedProcedure
    .query(async ({ ctx }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é gestor
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || !['MANAGER', 'ADMIN', 'OWNER'].includes(userAccount.role)) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas gestores podem ver serviços pendentes' 
        })
      }

      return prisma.servicePayment.findMany({
        where: {
          accountId: session.user.activeAccountId,
          status: ServicePaymentStatus.PENDING,
        },
        include: {
          supplier: { select: { name: true, email: true } },
          attachments: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // GESTOR: Aprovar serviço
  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é gestor
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || !['MANAGER', 'ADMIN', 'OWNER'].includes(userAccount.role)) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas gestores podem aprovar serviços' 
        })
      }

      const servicePayment = await prisma.servicePayment.update({
        where: { 
          id: input.id,
          accountId: session.user.activeAccountId,
          status: ServicePaymentStatus.PENDING,
        },
        data: {
          status: ServicePaymentStatus.APPROVED,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
        include: {
          supplier: { select: { name: true } },
        },
      })

      // Notificar fornecedor e financeiro
      const financialUsers = await prisma.accountUser.findMany({
        where: {
          accountId: session.user.activeAccountId,
          role: { in: [UserRole.FINANCIAL, UserRole.ADMIN, UserRole.OWNER] },
        },
      })

      const notifications = [
        // Notificar fornecedor
        {
          userId: servicePayment.supplierId,
          title: 'Serviço aprovado',
          message: `Seu serviço "${servicePayment.description}" foi aprovado`,
          type: 'SERVICE_PAYMENT_APPROVED' as const,
        },
        // Notificar financeiro
        ...financialUsers.map(user => ({
          userId: user.userId,
          title: 'Pagamento aprovado',
          message: `Serviço de ${servicePayment.supplier.name} aprovado para pagamento`,
          type: 'SERVICE_PAYMENT_APPROVED' as const,
        })),
      ]

      await prisma.notification.createMany({ data: notifications })

      void dispatchWebhooks(servicePayment.accountId, 'service_payment.approved', {
        servicePaymentId: servicePayment.id,
        description: servicePayment.description,
        value: servicePayment.value,
        status: servicePayment.status,
        approvedAt: servicePayment.approvedAt?.toISOString(),
      })

      return servicePayment
    }),

  // GESTOR: Recusar serviço
  reject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, 'Motivo é obrigatório'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é gestor
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || !['MANAGER', 'ADMIN', 'OWNER'].includes(userAccount.role)) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas gestores podem recusar serviços' 
        })
      }

      const servicePayment = await prisma.servicePayment.update({
        where: { 
          id: input.id,
          accountId: session.user.activeAccountId,
          status: ServicePaymentStatus.PENDING,
        },
        data: {
          status: ServicePaymentStatus.REJECTED,
          rejectedById: session.user.id,
          rejectedAt: new Date(),
          rejectionReason: input.reason,
        },
        include: {
          supplier: { select: { name: true } },
        },
      })

      // Notificar fornecedor
      await prisma.notification.create({
        data: {
          userId: servicePayment.supplierId,
          title: '❌ Serviço recusado',
          message: `Seu serviço "${servicePayment.description}" foi recusado: ${input.reason}`,
          type: 'SERVICE_PAYMENT_REJECTED',
        },
      })

      void dispatchWebhooks(servicePayment.accountId, 'service_payment.rejected', {
        servicePaymentId: servicePayment.id,
        description: servicePayment.description,
        value: servicePayment.value,
        status: servicePayment.status,
        rejectionReason: input.reason,
        rejectedAt: servicePayment.rejectedAt?.toISOString(),
      })

      return servicePayment
    }),

  // FINANCEIRO: Listar serviços aprovados
  listApproved: protectedProcedure
    .query(async ({ ctx }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é financeiro
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || !['FINANCIAL', 'ADMIN', 'OWNER'].includes(userAccount.role)) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas financeiro pode ver serviços aprovados' 
        })
      }

      return prisma.servicePayment.findMany({
        where: {
          accountId: session.user.activeAccountId,
          status: ServicePaymentStatus.APPROVED,
        },
        include: {
          supplier: { select: { name: true, email: true } },
          approvedBy: { select: { name: true } },
          attachments: true,
        },
        orderBy: { approvedAt: 'asc' },
      })
    }),

  // FINANCEIRO: Marcar como pago
  markAsPaid: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        receipt: z.object({
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          filePath: z.string(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      // Verificar se é financeiro
      const userAccount = await prisma.accountUser.findUnique({
        where: {
          userId_accountId: {
            userId: session.user.id,
            accountId: session.user.activeAccountId,
          },
        },
      })

      if (!userAccount || !['FINANCIAL', 'ADMIN', 'OWNER'].includes(userAccount.role)) {
        throw new TRPCError({ 
          code: 'FORBIDDEN', 
          message: 'Apenas financeiro pode marcar como pago' 
        })
      }

      const servicePayment = await prisma.servicePayment.update({
        where: { 
          id: input.id,
          accountId: session.user.activeAccountId,
          status: ServicePaymentStatus.APPROVED,
        },
        data: {
          status: ServicePaymentStatus.PAID,
          paidById: session.user.id,
          paidAt: new Date(),
          paymentReceipt: {
            create: {
              ...input.receipt,
              uploadedBy: session.user.id,
            },
          },
        },
        include: {
          supplier: { select: { name: true } },
          paymentReceipt: true,
        },
      })

      // Notificar fornecedor
      await prisma.notification.create({
        data: {
          userId: servicePayment.supplierId,
          title: 'Pagamento realizado',
          message: `Seu serviço "${servicePayment.description}" foi pago`,
          type: 'SERVICE_PAYMENT_PAID',
        },
      })

      void dispatchWebhooks(servicePayment.accountId, 'service_payment.paid', {
        servicePaymentId: servicePayment.id,
        description: servicePayment.description,
        value: servicePayment.value,
        status: servicePayment.status,
        paidAt: servicePayment.paidAt?.toISOString(),
      })

      return servicePayment
    }),

  // FORNECEDOR: Baixar comprovante
  getReceipt: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const servicePayment = await prisma.servicePayment.findFirst({
        where: {
          id: input.id,
          accountId: session.user.activeAccountId,
          // Fornecedor só pode ver seus próprios comprovantes
          supplierId: session.user.id,
          status: ServicePaymentStatus.PAID,
        },
        include: {
          paymentReceipt: true,
        },
      })

      if (!servicePayment?.paymentReceipt) {
        throw new TRPCError({ 
          code: 'NOT_FOUND', 
          message: 'Comprovante não encontrado' 
        })
      }

      return servicePayment.paymentReceipt
    }),

  // ADMIN: Estatísticas
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      const [pending, approved, paid, rejected, totalValue] = await Promise.all([
        prisma.servicePayment.count({
          where: {
            accountId: session.user.activeAccountId,
            status: ServicePaymentStatus.PENDING,
          },
        }),
        prisma.servicePayment.count({
          where: {
            accountId: session.user.activeAccountId,
            status: ServicePaymentStatus.APPROVED,
          },
        }),
        prisma.servicePayment.count({
          where: {
            accountId: session.user.activeAccountId,
            status: ServicePaymentStatus.PAID,
          },
        }),
        prisma.servicePayment.count({
          where: {
            accountId: session.user.activeAccountId,
            status: ServicePaymentStatus.REJECTED,
          },
        }),
        prisma.servicePayment.aggregate({
          where: {
            accountId: session.user.activeAccountId,
            status: ServicePaymentStatus.PAID,
          },
          _sum: { value: true },
        }),
      ])

      return {
        pending,
        approved,
        paid,
        rejected,
        totalValue: totalValue._sum.value || 0,
      }
    }),

  // Buscar por ID (qualquer role autorizado)
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { session, prisma } = ctx
      
      if (!session?.user?.activeAccountId) {
        throw new TRPCError({ code: 'UNAUTHORIZED' })
      }

      return prisma.servicePayment.findFirst({
        where: {
          id: input.id,
          accountId: session.user.activeAccountId,
        },
        include: {
          supplier: { select: { name: true, email: true } },
          approvedBy: { select: { name: true } },
          rejectedBy: { select: { name: true } },
          paidBy: { select: { name: true } },
          attachments: true,
          paymentReceipt: true,
        },
      })
    }),
})