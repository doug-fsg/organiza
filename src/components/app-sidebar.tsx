'use client'

import * as React from "react"
import { UserRole } from "@prisma/client"
import {
  Calendar,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronUp,
  User2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { NotificationCenter } from "@/components/notification-center"

interface User {
  id: string
  name: string
  role: UserRole
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User
  activeTab: string
  onTabChange: (tab: string) => void
  onLogout: () => void
  unreadCommentsCount?: number
}

export function AppSidebar({ 
  user, 
  activeTab, 
  onTabChange, 
  onLogout,
  unreadCommentsCount = 0,
  ...props 
}: AppSidebarProps) {
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador'
      case UserRole.MANAGER:
        return 'Gerente'
      case UserRole.MEMBER:
        return 'Membro'
      default:
        return role
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case UserRole.MEMBER:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const canManageTasks = user.role === UserRole.OWNER || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER

  // Menu items baseados no role do usuário
  const menuItems = [
    {
      title: "Calendário",
      icon: Calendar,
      value: "calendar",
      isVisible: true,
      description: "Visualizar tarefas no calendário"
    },
    {
      title: "Minhas Tarefas",
      icon: BarChart3,
      value: "kanban",
      isVisible: true,
      description: "Visualizar e gerenciar suas tarefas"
    },
    {
      title: "Gerenciamento",
      icon: ClipboardList,
      value: "management",
      isVisible: canManageTasks,
      description: "Criar e gerenciar tarefas principais"
    },
    {
      title: "Central de Tarefas",
      icon: CheckCircle2,
      value: "approvals",
      isVisible: canManageTasks,
      description: "Visualizar e gerenciar todas as tarefas"
    },
  ]

  const visibleMenuItems = menuItems.filter(item => item.isVisible)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Calendar className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Organiza</span>
                <span className="truncate text-xs">Produtividade que se vê</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    tooltip={item.description}
                    isActive={activeTab === item.value}
                    onClick={() => onTabChange(item.value)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    {item.value === 'approvals' && unreadCommentsCount > 0 && (
                      <Badge 
                        variant="default" 
                        className="ml-auto bg-purple-600 text-white text-xs px-1.5 py-0 min-w-[20px] justify-center"
                      >
                        {unreadCommentsCount}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Seção específica para Administradores */}
              {user.role === UserRole.ADMIN && (
                <Collapsible className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton>
                        <Settings className="size-4" />
                        <span>Configurações</span>
                        <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onTabChange('management')}
                            isActive={activeTab === 'management'}
                            className="cursor-default"
                          >
                            <Users className="size-4" />
                            <span>Gerenciamento</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onTabChange('users')}
                            isActive={activeTab === 'users'}
                            className="cursor-default"
                          >
                            <Users className="size-4" />
                            <span>Usuários</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton
                            onClick={() => onTabChange('system')}
                            isActive={activeTab === 'system'}
                            className="cursor-default"
                          >
                            <Settings className="size-4" />
                            <span>Sistema</span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="truncate text-xs">{getRoleLabel(user.role)}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem className="gap-2">
                  <User2 className="size-4" />
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <Badge variant="secondary" className={`text-xs w-fit ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => onTabChange('profile')}>
                  <Settings className="size-4" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-red-600" onClick={onLogout}>
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
