'use client'

import { useSession, signOut } from 'next-auth/react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { KanbanBoard } from '@/components/kanban-board'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return null // Middleware vai redirecionar
  }

  // Pegar conta ativa
  const activeAccount = session.user.accounts.find(
    acc => acc.accountId === session.user.activeAccountId
  )

  // Criar user object no formato antigo para compatibilidade
  const user = {
    id: session.user.id,
    name: session.user.name,
    role: activeAccount?.role || 'MEMBER',
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' })
  }

  return (
    <DashboardLayout user={user} onLogout={handleLogout} />
  )
}