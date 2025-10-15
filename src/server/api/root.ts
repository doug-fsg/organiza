import { createTRPCRouter } from '@/server/api/trpc'
import { userRouter } from '@/server/api/routers/user'
import { mainTaskRouter } from '@/server/api/routers/mainTask'
import { subtaskRouter } from '@/server/api/routers/subtask'
import { commentRouter } from '@/server/api/routers/comment'
import { notificationRouter } from '@/server/api/routers/notification'
import { userManagementRouter } from '@/server/api/routers/user-management'

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
})

// Exportar tipo para o cliente
export type AppRouter = typeof appRouter
