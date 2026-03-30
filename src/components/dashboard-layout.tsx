'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { UserRole } from '@prisma/client'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { api } from '@/lib/api'

interface User {
  id: string
  name: string
  role: UserRole
}

interface DashboardLayoutProps {
  user: User
  onLogout: () => void
  pathname: string
  children: React.ReactNode
}

export function DashboardLayout({ user, onLogout, pathname, children }: DashboardLayoutProps) {
  const [defaultOpen, setDefaultOpen] = useState(true)
  const canManageTasks = user.role === UserRole.OWNER || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER

  const activeTab = pathname === '/' ? '' : pathname.slice(1).split('/')[0]

  const { data: mainTasks } = api.mainTask.getAll.useQuery(undefined, {
    enabled: canManageTasks,
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  })

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

  const pendingApprovalCount = useMemo(() => {
    if (!mainTasks || !canManageTasks) return 0
    return mainTasks.reduce(
      (count: number, task) =>
        count + task.subtasks.filter((s: any) => s.status === 'COMPLETED_PENDING').length,
      0
    )
  }, [mainTasks, canManageTasks])

  useEffect(() => {
    const sidebarState = document.cookie
      .split('; ')
      .find(row => row.startsWith('sidebar_state='))
      ?.split('=')[1]
    if (sidebarState) {
      setDefaultOpen(sidebarState === 'true')
    }
  }, [])

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        user={user}
        activeTab={activeTab}
        onLogout={onLogout}
        unreadCommentsCount={unreadCommentsCount}
        pendingApprovalCount={pendingApprovalCount}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-px bg-sidebar-border" />
            <div className="flex items-center space-x-2">
              <Link href="/" className="text-lg font-semibold hover:opacity-80 transition-opacity">
                Organiza
              </Link>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
