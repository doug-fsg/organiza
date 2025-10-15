'use client'

import { useState, useEffect } from 'react'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { TaskManagement } from '@/components/task-management'
import { TaskCalendar } from '@/components/task-calendar'
import { AppSidebar } from '@/components/app-sidebar'
import { ManagerApprovalPanel } from '@/components/manager-approval-panel'
import { KanbanBoard } from '@/components/kanban-board'
import { UserManagement } from '@/components/user-management'

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
