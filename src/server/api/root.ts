import { createTRPCRouter } from '@/server/api/trpc'
import { userRouter } from '@/server/api/routers/user'
import { mainTaskRouter } from '@/server/api/routers/mainTask'
import { subtaskRouter } from '@/server/api/routers/subtask'
import { commentRouter } from '@/server/api/routers/comment'
import { notificationRouter } from '@/server/api/routers/notification'
import { userManagementRouter } from '@/server/api/routers/user-management'
import { attachmentRouter } from '@/server/api/routers/attachment'
import { servicePaymentRouter } from '@/server/api/routers/servicePayment'
import { departmentRouter } from '@/server/api/routers/department'
import { subtaskTemplateRouter } from '@/server/api/routers/subtask-template'
import { clientRouter } from '@/server/api/routers/client'
import { clientCustomAttributeRouter } from '@/server/api/routers/client-custom-attribute'
import { apiKeyRouter } from '@/server/api/routers/api-key'
import { webhookRouter } from '@/server/api/routers/webhook'
import { taskFieldRouter } from '@/server/api/routers/task-field'

/**
 * Router principal da API tRPC.
 * Define todas as rotas disponíveis na aplicação.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  mainTask: mainTaskRouter,
  subtask: subtaskRouter,
  comment: commentRouter,
  notification: notificationRouter,
  userManagement: userManagementRouter,
  attachment: attachmentRouter,
  servicePayment: servicePaymentRouter,
  department: departmentRouter,
  subtaskTemplate: subtaskTemplateRouter,
  clients: clientRouter,
  clientCustomAttribute: clientCustomAttributeRouter,
  apiKey: apiKeyRouter,
  webhook: webhookRouter,
  taskField: taskFieldRouter,
})

// Exportar tipo para o cliente
export type AppRouter = typeof appRouter
