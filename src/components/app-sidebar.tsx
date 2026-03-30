'use client'

import * as React from "react"
import Link from "next/link"
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
  Moon,
  Sun,
  Truck,
  DollarSign,
  FileCheck,
  Building2,
  FileText,
  TrendingUp,
  UserPlus,
} from "lucide-react"
import { useTheme } from "next-themes"

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
  onLogout: () => void
  unreadCommentsCount?: number
  /** Quantidade de tarefas aguardando aprovação */
  pendingApprovalCount?: number
}

export function AppSidebar({ 
  user, 
  activeTab, 
  onLogout,
  unreadCommentsCount = 0,
  pendingApprovalCount = 0,
  ...props 
}: AppSidebarProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return 'Proprietário'
      case UserRole.ADMIN:
        return 'Administrador'
      case UserRole.MANAGER:
        return 'Gerente'
      case UserRole.MEMBER:
        return 'Membro'
      case UserRole.SUPPLIER:
        return 'Fornecedor'
      case UserRole.FINANCIAL:
        return 'Financeiro'
      default:
        return role
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return 'bg-purple-100 text-purple-800'
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800'
      case UserRole.MANAGER:
        return 'bg-blue-100 text-blue-800'
      case UserRole.MEMBER:
        return 'bg-green-100 text-green-800'
      case UserRole.SUPPLIER:
        return 'bg-orange-100 text-orange-800'
      case UserRole.FINANCIAL:
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const canManageTasks = user.role === UserRole.OWNER || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER
  const isSupplier = user.role === UserRole.SUPPLIER
  const isManager = user.role === UserRole.MANAGER || user.role === UserRole.ADMIN || user.role === UserRole.OWNER
  const isFinancial = user.role === UserRole.FINANCIAL || user.role === UserRole.ADMIN || user.role === UserRole.OWNER

  // Seção Tarefas
  const taskMenuItems = [
    {
      title: "Minhas Tarefas",
      icon: BarChart3,
      value: "kanban",
      isVisible: !isSupplier,
      description: "Quadro e calendário de tarefas"
    },
    {
      title: "Central de Tarefas",
      icon: CheckCircle2,
      value: "approvals",
      isVisible: canManageTasks,
      description: "Visualizar e gerenciar todas as tarefas"
    },
  ]

  // Seção CRM
  const crmMenuItems = [
    {
      title: "Contatos",
      icon: UserPlus,
      value: "contacts",
      isVisible: canManageTasks,
      description: "Gerenciar contatos e atributos personalizados"
    },
  ]

  // Seção Pagamentos (financeiro)
  const financialMenuItems = [
    {
      title: "Fornecedor",
      icon: Truck,
      value: "supplier",
      isVisible: isSupplier,
      description: "Cadastrar serviços e acompanhar pagamentos"
    },
    {
      title: "Aprovação",
      icon: FileCheck,
      value: "manager",
      isVisible: isManager && !isSupplier,
      description: "Aprovar serviços de fornecedores"
    },
    {
      title: "Financeiro",
      icon: DollarSign,
      value: "financial",
      isVisible: isFinancial && !isSupplier,
      description: "Gerenciar pagamentos aprovados"
    },
  ]

  const visibleTaskItems = taskMenuItems.filter(item => item.isVisible)
  const visibleCrmItems = crmMenuItems.filter(item => item.isVisible)
  const visibleFinancialItems = financialMenuItems.filter(item => item.isVisible)
  const hasTaskSection = visibleTaskItems.length > 0
  const hasCrmSection = visibleCrmItems.length > 0
  const hasFinancialSection = visibleFinancialItems.length > 0

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
        {/* Seção Tarefas */}
        {hasTaskSection && (
          <SidebarGroup>
            <SidebarGroupLabel>Tarefas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleTaskItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton asChild tooltip={item.description} isActive={activeTab === item.value}>
                      <Link href={`/${item.value}`}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        {item.value === 'approvals' && pendingApprovalCount > 0 && (
                          <Badge 
                            variant="default" 
                            className="ml-auto text-xs px-1.5 py-0 min-w-[20px] justify-center bg-destructive text-destructive-foreground"
                          >
                            {pendingApprovalCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}

                {/* Configurações (apenas Admin) */}
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
                            <SidebarMenuSubButton asChild isActive={activeTab === 'management'}>
                              <Link href="/management">
                                <Users className="size-4" />
                                <span>Gerenciamento</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={activeTab === 'users'}>
                              <Link href="/users">
                                <Users className="size-4" />
                                <span>Usuários</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={activeTab === 'departments'}>
                              <Link href="/departments">
                                <Building2 className="size-4" />
                                <span>Setores</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={activeTab === 'templates'}>
                              <Link href="/templates">
                                <FileText className="size-4" />
                                <span>Modelos</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild isActive={activeTab === 'system'}>
                              <Link href="/system">
                                <Settings className="size-4" />
                                <span>Sistema</span>
                              </Link>
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
        )}

        {/* Seção CRM */}
        {hasCrmSection && (
          <SidebarGroup>
            <SidebarGroupLabel>CRM</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleCrmItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton asChild tooltip={item.description} isActive={activeTab === item.value}>
                      <Link href={`/${item.value}`}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Seção Pagamentos (financeiro) */}
        {hasFinancialSection && (
          <SidebarGroup>
            <SidebarGroupLabel>Pagamentos</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleFinancialItems.map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton asChild tooltip={item.description} isActive={activeTab === item.value}>
                      <Link href={`/${item.value}`}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
                <DropdownMenuItem asChild className="gap-2">
                  <Link href="/profile">
                    <Settings className="size-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                {mounted && (
                  <DropdownMenuItem 
                    className="gap-2" 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="size-4" />
                        Modo Claro
                      </>
                    ) : (
                      <>
                        <Moon className="size-4" />
                        Modo Escuro
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="gap-2 text-destructive" onClick={onLogout}>
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
