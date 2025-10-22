'use client'

import { useState, useEffect, useMemo } from 'react'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TaskManagement } from '@/components/task-management'
import { TaskCalendar } from '@/components/task-calendar'
import { AppSidebar } from '@/components/app-sidebar'
import { ManagerApprovalPanel } from '@/components/manager-approval-panel'
import { KanbanBoard } from '@/components/kanban-board'
import { UserManagement } from '@/components/user-management'
import { api } from '@/lib/api'

interface User {
  id: string
  name: string
  role: UserRole
}

interface DashboardLayoutProps {
  user: User
  onLogout: () => void
}

export function DashboardLayout({ user, onLogout }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState('kanban')
  const [defaultOpen, setDefaultOpen] = useState(true)

  const canManageTasks = user.role === UserRole.OWNER || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER

  // Buscar tarefas para calcular comentários não lidos
  const { data: mainTasks } = api.mainTask.getAll.useQuery(undefined, {
    enabled: canManageTasks,
    refetchInterval: 20000, // Reduzido para 20 segundos
    refetchIntervalInBackground: false, // Só atualiza quando componente visível
  })

  // Calcular quantidade de tarefas com comentários não lidos
  const unreadCommentsCount = useMemo(() => {
    if (!mainTasks || !canManageTasks) return 0
    
    return mainTasks.reduce((count: number, task) => {
      const subtasksWithUnread = task.subtasks.filter((subtask: any) => {
        const hasComments = subtask.comments && subtask.comments.length > 0
        if (!hasComments) return false
        
        const unreadComments = subtask.comments.filter((comment: any) => {
          if (comment.authorId === user.id) return false
          try {
            const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
            return !readBy.includes(user.id)
          } catch {
            return true
          }
        })
        
        return unreadComments.length > 0
      })
      return count + subtasksWithUnread.length
    }, 0)
  }, [mainTasks, canManageTasks, user.id])

  // Ler o estado inicial da sidebar dos cookies
  useEffect(() => {
    const sidebarState = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1]
    
    if (sidebarState) {
      setDefaultOpen(sidebarState === 'true')
    }
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'kanban':
        return <KanbanBoard userId={user.id} userRole={user.role} />
      case 'management':
        return canManageTasks ? <TaskManagement currentUser={user} /> : null
      case 'calendar':
        return <TaskCalendar currentUser={user} />
      case 'approvals':
        return canManageTasks ? <ManagerApprovalPanel currentUser={user} /> : null
      case 'settings':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Configurações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Configurações da aplicação</p>
            </CardContent>
          </Card>
        )
      case 'users':
        return (user.role === UserRole.ADMIN || user.role === UserRole.OWNER) ? (
          <UserManagement currentUserId={user.id} />
        ) : null
      case 'system':
        return user.role === UserRole.ADMIN ? (
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Funcionalidade em desenvolvimento...</p>
            </CardContent>
          </Card>
        ) : null
      case 'profile':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Meu Perfil</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Perfil do usuário</p>
            </CardContent>
          </Card>
        )
      default:
        return <KanbanBoard userId={user.id} userRole={user.role} />
    }
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar 
        user={user} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={onLogout}
        unreadCommentsCount={unreadCommentsCount}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" />
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">Organiza</h1>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
