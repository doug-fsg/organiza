'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskManagement } from '@/components/task-management'
import { TaskCalendar } from '@/components/task-calendar'
import { TasksCentralPanel } from '@/components/manager-approval-panel'
import { KanbanBoard } from '@/components/kanban-board'
import { UserManagement } from '@/components/user-management'
import { DepartmentList } from '@/components/department/department-list'
import { DepartmentForm } from '@/components/department/department-form'
import { SubtaskModelList } from '@/components/template/template-list'
import { SubtaskModelForm } from '@/components/template/template-form'
import { ClientList } from '@/components/client/client-list'
import { ClientForm } from '@/components/client/client-form'
import { CustomAttributeManager } from '@/components/client/custom-attribute-manager'
import { IntegracoesSection } from '@/components/integracoes/integracoes-section'
import { WebhooksSection } from '@/components/integracoes/webhooks-section'
import { Plus, LayoutGrid, Calendar, ClipboardList } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'

const FornecedorPage = dynamic(() => import('@/components/pages/fornecedor-page'), { ssr: false })
const GestorPage = dynamic(() => import('@/components/pages/gestor-page'), { ssr: false })
const FinanceiroPage = dynamic(() => import('@/components/pages/financeiro-page'), { ssr: false })

interface DashboardContentProps {
  activeTab: string
}

export function DashboardContent({ activeTab }: DashboardContentProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [subtaskModelFormOpen, setSubtaskModelFormOpen] = useState(false)

  const activeAccount = session?.user?.accounts?.find(
    (acc) => acc.accountId === session.user.activeAccountId
  )
  const user = {
    id: session?.user?.id ?? '',
    name: session?.user?.name ?? '',
    role: (activeAccount?.role as UserRole) || 'MEMBER',
  }

  const canManageTasks = user.role === UserRole.OWNER || user.role === UserRole.ADMIN || user.role === UserRole.MANAGER
  const isSupplier = user.role === UserRole.SUPPLIER
  const isManager = user.role === UserRole.MANAGER || user.role === UserRole.ADMIN || user.role === UserRole.OWNER
  const isFinancial = user.role === UserRole.FINANCIAL || user.role === UserRole.ADMIN || user.role === UserRole.OWNER

  const utils = api.useUtils()
  const createProjectFromModel = api.subtaskTemplate.createProjectFromModel.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      toast.success('Projeto criado! Vá para Gerenciamento de Projetos.')
      router.push('/management')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleUseModel = (modelId: string, projectTitle?: string) => {
    return createProjectFromModel.mutateAsync({
      subtaskTemplateId: modelId,
      projectTitle: projectTitle || 'Novo projeto',
    })
  }

  if (!session?.user) {
    return null
  }

  switch (activeTab) {
    case 'kanban':
      return !isSupplier ? (
        <div className="flex flex-col h-full min-h-0">
          <Tabs defaultValue="minhas-tarefas" className="flex flex-col flex-1 min-h-0">
            <TabsList className="w-fit mb-4">
              <TabsTrigger value="minhas-tarefas" className="gap-2">
                <ClipboardList className="size-4" />
                Minhas Tarefas
              </TabsTrigger>
              <TabsTrigger value="visao-projeto" className="gap-2">
                <LayoutGrid className="size-4" />
                Visão do Projeto
              </TabsTrigger>
              <TabsTrigger value="calendario" className="gap-2">
                <Calendar className="size-4" />
                Calendário
              </TabsTrigger>
            </TabsList>
            <TabsContent value="minhas-tarefas" className="flex-1 min-h-0 mt-0">
              <KanbanBoard userId={user.id} userRole={user.role} view="tasks" />
            </TabsContent>
            <TabsContent value="visao-projeto" className="flex-1 min-h-0 mt-0">
              <KanbanBoard userId={user.id} userRole={user.role} view="projects" />
            </TabsContent>
            <TabsContent value="calendario" className="flex-1 min-h-0 mt-0">
              <TaskCalendar currentUser={user} />
            </TabsContent>
          </Tabs>
        </div>
      ) : null
    case 'management':
      return canManageTasks ? <TaskManagement currentUser={user} /> : null
    case 'approvals':
      return canManageTasks ? <TasksCentralPanel currentUser={user} /> : null
    case 'departments':
      return canManageTasks ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Setores</h1>
              <p className="page-description">Organize projetos por departamento</p>
            </div>
            <DepartmentForm />
          </div>
          <DepartmentList />
        </div>
      ) : null
    case 'templates':
      return canManageTasks ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Modelos de Tarefas</h1>
              <p className="page-description">
                Defina etapas reutilizáveis. Aplique em projetos novos ou existentes. Workflow sequencial obrigatório.
              </p>
            </div>
            <Button onClick={() => setSubtaskModelFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo modelo
            </Button>
            <SubtaskModelForm
              open={subtaskModelFormOpen}
              onOpenChange={setSubtaskModelFormOpen}
            />
          </div>
          <SubtaskModelList
            onUseModel={handleUseModel}
            promptProjectTitle
            isCreating={createProjectFromModel.isPending}
            onRequestNewModel={() => setSubtaskModelFormOpen(true)}
          />
        </div>
      ) : null
    case 'contacts':
      return canManageTasks ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Contatos</h1>
              <p className="page-description">
                Gerencie seus contatos e atributos personalizados
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <CustomAttributeManager />
              <ClientForm />
            </div>
          </div>
          <ClientList />
        </div>
      ) : null
    case 'supplier':
      return isSupplier ? <FornecedorPage /> : null
    case 'manager':
      return isManager && !isSupplier ? <GestorPage /> : null
    case 'financial':
      return isFinancial && !isSupplier ? <FinanceiroPage /> : null
    case 'settings':
      return (
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Configurações da aplicação</p>
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
            <p className="text-muted-foreground">Funcionalidade em desenvolvimento...</p>
          </CardContent>
        </Card>
      ) : null
    case 'profile':
      return (
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Configurações da sua conta</p>
          </CardContent>
        </Card>
      )
    default:
      if (isSupplier) {
        return <FornecedorPage />
      }
      return <KanbanBoard userId={user.id} userRole={user.role} />
  }
}
