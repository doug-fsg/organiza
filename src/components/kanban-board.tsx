'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { SubtaskStatus, Priority } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorkflowProgressBar, WorkflowProgressBarAggregate, TaskSequenceProgressBar } from '@/components/workflow-progress-bar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Clock, MessageSquare, CheckCircle, GitBranch, Eye, LayoutGrid, Lock, Filter, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import toast from 'react-hot-toast'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { SubtaskDetailsModal } from '@/components/subtask-details-modal'
import { SubtaskCompletionModal } from '@/components/subtask-completion-modal'
import { cn } from '@/lib/utils'
import { getPriorityClasses, getStatusClasses, getPriorityLabel } from '@/lib/theme-utils'
import { sortSubtasksByDependency } from '@/lib/task-utils'
import { ClientBadge } from './client/client-badge'
import { SmartActionButtons } from './smart-action-buttons'

interface KanbanBoardProps {
  userId: string
  userRole?: string
  /** Quando definido, mostra apenas esta visão (sem abas internas) - usado pelo dashboard */
  view?: 'tasks' | 'projects'
}

// Funções auxiliares para formatação (extraídas do SubtaskCardContent)
function formatDate(date: Date | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('pt-BR')
}

function isOverdue(deadline: Date | null) {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// Status "abertas" = TODO, IN_PROGRESS, BLOCKED, COMPLETED_PENDING (exclui APPROVED, REJECTED)
const OPEN_STATUSES: SubtaskStatus[] = [
  SubtaskStatus.TODO,
  SubtaskStatus.IN_PROGRESS,
  SubtaskStatus.BLOCKED,
  SubtaskStatus.COMPLETED_PENDING,
]

export function KanbanBoard({ userId, userRole, view }: KanbanBoardProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>(view ?? 'tasks')

  // Quando view é passado (uso pelo dashboard), forçar a aba ativa
  useEffect(() => {
    if (view) setActiveTab(view)
  }, [view])
  // Filtros da aba Minhas Tarefas
  const [tasksProjectFilter, setTasksProjectFilter] = useState<string>('all')
  const [tasksClientFilter, setTasksClientFilter] = useState<string>('all')
  const [tasksStatusFilter, setTasksStatusFilter] = useState<'open' | 'all' | 'approved' | 'rejected'>('open')
  // Filtros da aba Visão do Projeto
  const [projectsProjectFilter, setProjectsProjectFilter] = useState<string>('all')
  const [projectsClientFilter, setProjectsClientFilter] = useState<string>('all')
  const [projectsAttrFilter, setProjectsAttrFilter] = useState<{ attrId: string; value: string } | null>(null)
  const [selectedSubtask, setSelectedSubtask] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [initialModalTab, setInitialModalTab] = useState<'details' | 'comments' | 'checklist'>('details')
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean
    subtaskId: string
    subtaskTitle: string
  }>({
    isOpen: false,
    subtaskId: '',
    subtaskTitle: ''
  })
  const utils = api.useUtils()
  const { playNotificationSound } = useNotificationSound()
  
  // Ref para armazenar contagem anterior de comentários não lidos
  const previousUnreadCountRef = useRef<Record<string, number>>({})
  
  const canSeeAllProjects = ['ADMIN', 'OWNER', 'MANAGER'].includes(userRole || '')
  const { data: subtasks, isLoading } = api.subtask.getByUser.useQuery({
    userRole: userRole as any,
  }, {
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  })

  const { data: allMainTasks } = api.mainTask.getAll.useQuery(undefined, {
    enabled: canSeeAllProjects,
  })

  const { data: customAttributes } = api.clientCustomAttribute.getAll.useQuery()

  // Detectar novos comentários não lidos e tocar som
  useEffect(() => {
    if (!subtasks) return

    subtasks.forEach((subtask) => {
      const unreadCount = subtask.comments?.filter((comment: any) => {
        try {
          const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
          return !readBy.includes(subtask.assignedToId)
        } catch {
          return true
        }
      }).length || 0

      const previousCount = previousUnreadCountRef.current[subtask.id]

      // Se aumentou o número de não lidos, tocar som
      // Toca desde o primeiro comentário (previousCount pode ser undefined ou menor)
      // MAS NÃO toca se o modal desta subtarefa estiver aberto
      const isModalOpenForThisSubtask = isDetailsModalOpen && selectedSubtask?.id === subtask.id
      
      if (previousCount !== undefined && unreadCount > previousCount && !isModalOpenForThisSubtask) {
        playNotificationSound()
        
        // Mensagem específica se for tarefa aguardando aprovação
        if (subtask.status === SubtaskStatus.COMPLETED_PENDING) {
          toast('Novo comentário', {
            icon: '💬',
            duration: 4000,
          })
        } else {
          toast('Novo comentário em sua tarefa', {
            icon: '💬',
            duration: 3000,
          })
        }
      }

      // Atualizar contagem anterior
      previousUnreadCountRef.current[subtask.id] = unreadCount
    })
  }, [subtasks, playNotificationSound, isDetailsModalOpen, selectedSubtask])
  
  const updateSubtask = api.subtask.update.useMutation({
    onMutate: async (variables) => {
      // Snapshot dos dados anteriores para rollback em caso de erro
      const previousSubtasks = utils.subtask.getByUser.getData({ userRole: userRole as any })

      // Atualização otimista: atualizar o cache imediatamente
      if (previousSubtasks && variables.status) {
        utils.subtask.getByUser.setData(
          { userRole: userRole as any },
          (old) => {
            if (!old) return old
            
            // Atualizar o status da subtarefa no array
            return old.map((subtask) =>
              subtask.id === variables.id
                ? { ...subtask, status: variables.status! }
                : subtask
            )
          }
        )
      }

      // Retornar contexto com os dados anteriores para rollback
      return { previousSubtasks }
    },
    onError: (error, variables, context) => {
      // Rollback: restaurar os dados anteriores em caso de erro
      if (context?.previousSubtasks) {
        utils.subtask.getByUser.setData(
          { userRole: userRole as any },
          context.previousSubtasks
        )
      }
      toast.error(`Erro ao atualizar tarefa: ${error.message}`)
    },
    onSuccess: () => {
      // Não mostrar toast imediato, apenas sincronizar silenciosamente
      // O usuário já viu a mudança otimista, então não precisa de feedback adicional
    },
    onSettled: () => {
      // Invalidar e refetch apenas após sucesso/erro para garantir sincronização com o servidor
      utils.subtask.getByUser.invalidate({ userRole: userRole as any })
    },
  })

  const { data: buttonDefs } = api.taskField.getDefinitions.useQuery()

  const executeSmartButton = api.taskField.executeSmartButton.useMutation({
    onSuccess: (_, variables) => {
      toast.success('Ação executada!')
      // Limpar estado local para este subtask para que ele volte a ler do subtasks.status (agora atualizado)
      setLocalStatuses(prev => {
        const next = { ...prev }
        delete next[variables.subtaskId]
        return next
      })
      utils.subtask.invalidate()
      utils.comment.invalidate()
      utils.mainTask.invalidate()
    },
    onError: (err, variables) => {
      toast.error('Erro ao executar: ' + err.message)
      // Opcional: manter o valor local ou resetar. Resetar é mais seguro.
      setLocalStatuses(prev => {
        const next = { ...prev }
        delete next[variables.subtaskId]
        return next
      })
    }
  })

  // Opções de filtro extraídas dos dados (inclui mainTasks quando admin/manager)
  const filterOptions = useMemo(() => {
    const projectMap = new Map<string, string>()
    const clientMap = new Map<string, string>()
    for (const s of subtasks || []) {
      projectMap.set(s.mainTaskId, s.mainTask?.title || 'Projeto')
      if (s.mainTask?.client) clientMap.set(s.mainTask.client.id, s.mainTask.client.name)
    }
    if (canSeeAllProjects && allMainTasks) {
      for (const mt of allMainTasks) {
        projectMap.set(mt.id, mt.title || 'Projeto')
        if (mt.client) clientMap.set(mt.client.id, mt.client.name)
      }
    }
    return {
      projects: Array.from(projectMap.entries()).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title)),
      clients: Array.from(clientMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [subtasks, canSeeAllProjects, allMainTasks])

  // Aplicar filtros da aba Minhas Tarefas (projeto, cliente, status)
  const filteredSubtasks = useMemo(() => {
    if (!subtasks) return []
    return subtasks.filter((s) => {
      if (tasksProjectFilter !== 'all' && s.mainTaskId !== tasksProjectFilter) return false
      if (tasksClientFilter !== 'all') {
        const clientId = s.mainTask?.client?.id
        if (!clientId || clientId !== tasksClientFilter) return false
      }
      if (tasksStatusFilter === 'open' && !OPEN_STATUSES.includes(s.status)) return false
      if (tasksStatusFilter === 'approved' && s.status !== SubtaskStatus.APPROVED) return false
      if (tasksStatusFilter === 'rejected' && s.status !== SubtaskStatus.REJECTED) return false
      return true
    })
  }, [subtasks, tasksProjectFilter, tasksClientFilter, tasksStatusFilter])

  const matchesCustomAttr = useMemo(() => {
    return (client: { customValues?: string | null } | null) => {
      if (!projectsAttrFilter?.attrId || !projectsAttrFilter?.value?.trim()) return true
      if (!client?.customValues) return false
      try {
        const cv = JSON.parse(client.customValues) as Record<string, unknown>
        const val = cv[projectsAttrFilter.attrId]
        if (val == null) return false
        const strVal = Array.isArray(val)
          ? val.map((f: { fileName?: string }) => f?.fileName ?? '').join(' ').toLowerCase()
          : String(val).toLowerCase()
        return strVal.includes(projectsAttrFilter.value.trim().toLowerCase())
      } catch {
        return false
      }
    }
  }, [projectsAttrFilter])

  // Agrupar por projeto para a aba Visão do Projeto (usa filtros da aba projetos)
  const projectsByMainTask = useMemo(() => {
    if (canSeeAllProjects && allMainTasks?.length) {
      return allMainTasks
        .filter((mt) => {
          if (projectsProjectFilter !== 'all' && mt.id !== projectsProjectFilter) return false
          if (projectsClientFilter !== 'all') {
            const cid = mt.client?.id
            if (!cid || cid !== projectsClientFilter) return false
          }
          return matchesCustomAttr(mt.client)
        })
        .map((mt) => ({
          mainTaskId: mt.id,
          mainTask: mt,
          subtasks: mt.subtasks || [],
        }))
    }
    const grouped = new Map<string, any[]>()
    for (const s of subtasks ?? []) {
      const mt = s.mainTask
      if (projectsProjectFilter !== 'all' && s.mainTaskId !== projectsProjectFilter) continue
      if (projectsClientFilter !== 'all') {
        const cid = mt?.client?.id
        if (!cid || cid !== projectsClientFilter) continue
      }
      if (!matchesCustomAttr(mt?.client)) continue
      const list = grouped.get(s.mainTaskId) || []
      list.push(s)
      grouped.set(s.mainTaskId, list)
    }
    return Array.from(grouped.entries()).map(([mainTaskId, subs]) => ({
      mainTaskId,
      mainTask: subs[0]?.mainTask,
      subtasks: subs,
    }))
  }, [subtasks, canSeeAllProjects, allMainTasks, projectsProjectFilter, projectsClientFilter, matchesCustomAttr])

  const tabCounts = useMemo(() => ({
    tasks: filteredSubtasks.length,
    projects: projectsByMainTask.length,
  }), [filteredSubtasks.length, projectsByMainTask.length])

  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

  const getTabSubtasks = useMemo(() => {
    if (activeTab !== 'tasks') return []
    return sortSubtasksByDependency(filteredSubtasks)
  }, [filteredSubtasks, activeTab]) as any[]

  const handleStatusChange = (subtaskId: string, newValue: string) => {
    // Atualizar estado local para feedback imediato na UI
    setLocalStatuses(prev => ({ ...prev, [subtaskId]: newValue }))

    // Se for um botão de ação (prefixo btn_)
    if (newValue.startsWith('btn_')) {
      const buttonId = newValue.substring(4)
      // Feedback visual imediato: mantém o valor do botão selecionado
      setLocalStatuses(prev => ({ ...prev, [subtaskId]: newValue }))
      executeSmartButton.mutate({ buttonId, subtaskId })
      return
    }

    const newStatus = newValue as SubtaskStatus
    // Validações de mudança de status
    const currentSubtask = subtasks?.find(s => s.id === subtaskId)
    if (!currentSubtask) return
    
    if (currentSubtask.status === newStatus) return

    // Verificar se é um movimento válido
    const validStatuses = Object.values(SubtaskStatus)
    if (!validStatuses.includes(newStatus)) return

    // Se estiver tentando iniciar (Em andamento) mas há dependências pendentes
    const blockingDeps = currentSubtask.dependencies?.filter(
      (dep: any) => dep.blocking && dep.blocking.status !== SubtaskStatus.APPROVED
    ) || []
    if (newStatus === SubtaskStatus.IN_PROGRESS && blockingDeps.length > 0) {
      toast.error('Aguarde a conclusão da tarefa anterior')
      return
    }

    // Se estiver tentando concluir a subtarefa (mover para "Aguardando Aprovação")
    if (newStatus === SubtaskStatus.COMPLETED_PENDING) {
      // Abrir modal de confirmação irreversível
      setCompletionModal({
        isOpen: true,
        subtaskId: subtaskId,
        subtaskTitle: currentSubtask?.title || ''
      })
      return
    }

    // Não permitir mover para outros status de conclusão via dropdown na aba tasks
    if (newStatus === SubtaskStatus.APPROVED || newStatus === SubtaskStatus.BLOCKED) {
      toast.error('Esta ação deve ser feita pelo gestor ou automaticamente pelo sistema.')
      return
    }

    // Se passou por todas as verificações, pode mudar o status
    updateSubtask.mutate({
      id: subtaskId,
      status: newStatus,
    })
  }

  const handleOpenDetails = (subtask: any, tab: 'details' | 'comments' | 'checklist' = 'details') => {
    setSelectedSubtask(subtask)
    setInitialModalTab(tab)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false)
    setSelectedSubtask(null)
    setInitialModalTab('details')
  }

  const handleCompleteTask = (subtask: any) => {
    // Abrir modal de confirmação irreversível
    setCompletionModal({
      isOpen: true,
      subtaskId: subtask.id,
      subtaskTitle: subtask.title
    })
    
    // Toast motivacional imediato
    toast.success('🎯 Preparando para concluir tarefa!', {
      duration: 2000,
      icon: '🚀'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton para Tabs */}
        <div className="bg-muted/50 rounded-lg p-1 h-10 animate-pulse" />
        
        {/* Skeleton para cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="flex items-center py-0.5 px-6">
              <div className="flex items-center space-x-2 w-full">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-muted rounded w-12 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-16 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center py-0.5 px-6">
              <div className="flex items-center space-x-2 w-full">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-muted rounded w-12 animate-pulse" />
                  <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Skeleton para tabela */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-muted rounded w-32 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Header da tabela */}
              <div className="grid grid-cols-4 gap-4 pb-2 border-b">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                ))}
              </div>
              {/* Linhas da tabela */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-4 gap-4 py-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-muted/50 rounded animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Calcular total de mensagens não lidas em tarefas aguardando aprovação
  const totalUnreadMessagesInWaiting = filteredSubtasks.reduce((total, s) => {
    if (s.status !== SubtaskStatus.COMPLETED_PENDING) return total
    
    const unreadCount = s.comments?.filter((comment: any) => {
      if (comment.authorId === userId) return false
      try {
        const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
        return !readBy.includes(userId)
      } catch {
        return true
      }
    }).length || 0
    
    return total + unreadCount
  }, 0) || 0

  const showInternalTabs = !view

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => showInternalTabs && setActiveTab(value as typeof activeTab)}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {showInternalTabs && (
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              Minhas Tarefas
              <div className="flex items-center gap-1">
                {tabCounts.tasks > 0 && (
                  <Badge variant="info" className="ml-1">
                    {tabCounts.tasks}
                  </Badge>
                )}
                {totalUnreadMessagesInWaiting > 0 && (
                  <Badge variant="default" className="animate-pulse">
                    💬 {totalUnreadMessagesInWaiting}
                  </Badge>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              Visão do Projeto
              {tabCounts.projects > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tabCounts.projects}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          )}
          {/* Filtros na mesma linha das abas */}
          <div className="flex items-center justify-end gap-1.5 shrink-0">
            {activeTab === 'tasks' ? (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground',
                        (tasksProjectFilter !== 'all' || tasksClientFilter !== 'all' || tasksStatusFilter !== 'open') &&
                          'text-foreground'
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span className="text-xs">Filtros</span>
                      {(tasksProjectFilter !== 'all' || tasksClientFilter !== 'all' || tasksStatusFilter !== 'open') && (
                        <span className="size-1.5 rounded-full bg-primary/60" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <div className="space-y-2.5">
                      <Label className="text-xs text-muted-foreground">Projeto</Label>
                      <Select value={tasksProjectFilter} onValueChange={setTasksProjectFilter}>
                        <SelectTrigger className="h-8 border-0 bg-muted/40 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Label className="text-xs text-muted-foreground">Contato</Label>
                      <Select value={tasksClientFilter} onValueChange={setTasksClientFilter}>
                        <SelectTrigger className="h-8 border-0 bg-muted/40 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Select value={tasksStatusFilter} onValueChange={(v) => setTasksStatusFilter(v as typeof tasksStatusFilter)}>
                        <SelectTrigger className="h-8 border-0 bg-muted/40 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Abertas</SelectItem>
                          <SelectItem value="all">Todas</SelectItem>
                          <SelectItem value="approved">Aprovadas</SelectItem>
                          <SelectItem value="rejected">Rejeitadas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
                {(tasksProjectFilter !== 'all' || tasksClientFilter !== 'all' || tasksStatusFilter !== 'open') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setTasksProjectFilter('all')
                      setTasksClientFilter('all')
                      setTasksStatusFilter('open')
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Limpar
                  </Button>
                )}
              </>
            ) : (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground',
                        (projectsProjectFilter !== 'all' || projectsClientFilter !== 'all' || projectsAttrFilter?.attrId) &&
                          'text-foreground'
                      )}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span className="text-xs">Filtros</span>
                      {(projectsProjectFilter !== 'all' || projectsClientFilter !== 'all' || projectsAttrFilter?.attrId) && (
                        <span className="size-1.5 rounded-full bg-primary/60" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <div className="space-y-2.5">
                      <Label className="text-xs text-muted-foreground">Projeto</Label>
                      <Select value={projectsProjectFilter} onValueChange={setProjectsProjectFilter}>
                        <SelectTrigger className="h-8 border-0 bg-muted/40 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Label className="text-xs text-muted-foreground">Cliente</Label>
                      <Select value={projectsClientFilter} onValueChange={setProjectsClientFilter}>
                        <SelectTrigger className="h-8 border-0 bg-muted/40 text-xs">
                          <SelectValue placeholder="Todos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          {filterOptions.clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {customAttributes && customAttributes.length > 0 && (
                        <>
                          <Label className="text-xs text-muted-foreground">Atributo</Label>
                          <Select
                            value={projectsAttrFilter?.attrId ?? 'all'}
                            onValueChange={(v) =>
                              setProjectsAttrFilter(v === 'all' ? null : { attrId: v, value: projectsAttrFilter?.value ?? '' })
                            }
                          >
                            <SelectTrigger className="h-8 border-0 bg-muted/40 text-xs">
                              <SelectValue placeholder="Nenhum" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Nenhum</SelectItem>
                              {customAttributes.map((attr) => (
                                <SelectItem key={attr.id} value={attr.id}>{attr.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {projectsAttrFilter?.attrId && (
                            <>
                              <Label className="text-xs text-muted-foreground">Valor</Label>
                              <Input
                                placeholder="Buscar..."
                                className="h-8 border-0 bg-muted/40 text-xs"
                                value={projectsAttrFilter.value}
                                onChange={(e) =>
                                  setProjectsAttrFilter((prev) =>
                                    prev ? { ...prev, value: e.target.value } : null
                                  )
                                }
                              />
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                {(projectsProjectFilter !== 'all' || projectsClientFilter !== 'all' || projectsAttrFilter?.attrId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setProjectsProjectFilter('all')
                      setProjectsClientFilter('all')
                      setProjectsAttrFilter(null)
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Limpar
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Aba Minhas Tarefas - Tabela */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Tabela de Tarefas */}
          <Card>
            <CardHeader>
              <CardTitle>Minhas Tarefas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead className="w-[180px]">Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTabSubtasks.map((subtask: any) => {
                    // Calcular comentários não lidos
                    const unreadComments = subtask.comments?.filter((comment: any) => {
                      try {
                        const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
                        return !readBy.includes(subtask.assignedToId)
                      } catch {
                        return true
                      }
                    }) || []
                    
                    const hasUnread = unreadComments.length > 0
                    const totalComments = subtask.comments?.length || 0

                    // Calcular checklist
                    let checklistProgress = null
                    if (subtask.checklistItems) {
                      try {
                        const items = JSON.parse(subtask.checklistItems)
                        if (items.length > 0) {
                          const checked = items.filter((item: any) => item.checked).length
                          checklistProgress = { checked, total: items.length }
                        }
                      } catch {
                        // Ignorar erro de parsing
                      }
                    }

                    // Calcular dependências bloqueantes
                    const blockingDependencies = subtask.dependencies?.filter((dep: any) => 
                      dep.blocking && dep.blocking.status !== 'APPROVED'
                    ) || []

                    return (
                      <TableRow key={subtask.id}>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 
                                className="font-medium text-sm leading-tight flex-1 cursor-pointer hover:text-blue-600"
                                onClick={() => handleOpenDetails(subtask)}
                              >
                                {subtask.title}
                              </h4>
                            </div>
                            {subtask.description && (
                              <p className="text-xs text-muted-foreground">{subtask.description}</p>
                            )}
                            <div className="flex items-center flex-wrap gap-2">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                                  getPriorityClasses(subtask.priority)
                                )}
                              >
                                <span className="size-1.5 shrink-0 rounded-full bg-current/80" />
                                {getPriorityLabel(subtask.priority)}
                              </span>
                              <button
                                onClick={() => handleOpenDetails(subtask, 'comments')}
                                className="relative group cursor-pointer inline-flex items-center"
                                title={hasUnread 
                                  ? `${unreadComments.length} comentário${unreadComments.length > 1 ? 's' : ''} não lido${unreadComments.length > 1 ? 's' : ''}`
                                  : totalComments > 0 
                                    ? `${totalComments} comentário${totalComments > 1 ? 's' : ''}`
                                    : 'Ver comentários'
                                }
                              >
                                <div className="absolute inset-0 -m-1.5 rounded-full bg-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                <MessageSquare className="h-4 w-4 text-muted-foreground relative z-10 group-hover:text-foreground group-hover:scale-110 transition-all duration-200" />
                                {hasUnread && (
                                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-destructive-foreground bg-destructive z-20 animate-pulse shadow-lg">
                                    {unreadComments.length > 99 ? '99+' : unreadComments.length}
                                  </div>
                                )}
                              </button>
                              {subtask.isRecurring && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="info" className="text-xs cursor-help">
                                        🔄 Recorrente
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">
                                        <p className="font-medium">Tarefa Recorrente</p>
                                        <p>Tipo: {
                                          subtask.recurringType === 'DAILY' ? 'Diária' :
                                          subtask.recurringType === 'WEEKLY' ? 'Semanal' :
                                          subtask.recurringType === 'BIWEEKLY' ? 'Quinzenal' :
                                          subtask.recurringType === 'MONTHLY' ? 'Mensal' :
                                          subtask.recurringType === 'CUSTOM' ? 'Personalizada' :
                                          subtask.recurringType?.toLowerCase()
                                        }</p>
                                        {(subtask.recurringType === 'WEEKLY' || subtask.recurringType === 'BIWEEKLY') && subtask.recurringWeekDays && (
                                          <p>Dias: {JSON.parse(subtask.recurringWeekDays).map((day: string) => {
                                            const dayNames: Record<string, string> = {
                                              'SUNDAY': 'Dom', 'MONDAY': 'Seg', 'TUESDAY': 'Ter',
                                              'WEDNESDAY': 'Qua', 'THURSDAY': 'Qui', 'FRIDAY': 'Sex', 'SATURDAY': 'Sáb'
                                            }
                                            return dayNames[day] || day
                                          }).join(', ')}</p>
                                        )}
                                        {subtask.recurringType === 'MONTHLY' && subtask.recurringMonthDays && (
                                          <p>Dias do mês: {JSON.parse(subtask.recurringMonthDays).join(', ')}</p>
                                        )}
                                        {(subtask.recurringType === 'CUSTOM' || subtask.recurringType === 'DAILY') && subtask.recurringInterval && subtask.recurringInterval > 1 && (
                                          <p>A cada {subtask.recurringInterval} dias</p>
                                        )}
                                        {(subtask.skipWeekends || subtask.skipHolidays) && (
                                          <p className="text-orange-600">
                                            Pula: {[
                                              subtask.skipWeekends ? 'fins de semana' : null,
                                              subtask.skipHolidays ? 'feriados' : null
                                            ].filter(Boolean).join(' e ')}
                                          </p>
                                        )}
                                        {subtask.nextReopenAt && (
                                          <p>Próxima: {formatDate(subtask.nextReopenAt)}</p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {!subtask.requiresApproval && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="warning" className="text-xs cursor-help">
                                        ⚡ Auto
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div className="text-xs">
                                        <p className="font-medium">Aprovação Automática</p>
                                        <p>Esta tarefa será aprovada automaticamente quando concluída</p>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {isOverdue(subtask.deadline) && (
                                <Badge variant="destructive" className="text-xs">
                                  Atrasado
                                </Badge>
                              )}
                              {subtask.deadline ? (
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(subtask.deadline)}
                                </div>
                              ) : null}
                              {checklistProgress ? (
                                <div className="flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-0.5 rounded">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>{checklistProgress.checked}/{checklistProgress.total}</span>
                                </div>
                              ) : null}
                              {blockingDependencies.length > 0 ? (
                                <span className="inline-flex text-muted-foreground/60">
                                  <Lock className="h-3 w-3" />
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-muted-foreground">📋 {subtask.mainTask.title}</span>
                            {subtask.mainTask.client && (
                              <ClientBadge name={subtask.mainTask.client.name} />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[160px]">
                            <WorkflowProgressBar
                              status={subtask.status}
                              variant="default"
                              showLabels={true}
                              activeCustomActionLabel={subtask.activeActionButton?.name ?? null}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {subtask.status === SubtaskStatus.BLOCKED ? (
                            <Badge variant="destructive" className="gap-1">
                              <GitBranch className="h-3 w-3" />
                              Bloqueada
                            </Badge>
                          ) : subtask.status === SubtaskStatus.COMPLETED_PENDING ? (
                            <Badge variant="warning">
                              Aguardando
                            </Badge>
                          ) : subtask.status === SubtaskStatus.APPROVED ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Aprovada
                            </Badge>
                          ) : blockingDependencies.length > 0 ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded border border-border/50 text-muted-foreground/50">
                              <Lock className="h-4 w-4" />
                            </span>
                          ) : (
                                <Select
                                  value={localStatuses[subtask.id] || ((subtask as any).activeActionButtonId ? `btn_${(subtask as any).activeActionButtonId}` : subtask.status)}
                                  onValueChange={(value) => handleStatusChange(subtask.id, value)}
                                >
                                  <SelectTrigger className={cn(
                                    "w-[150px] shadow-sm border-0 transition-all font-medium",
                                    (localStatuses[subtask.id] || (subtask as any).activeActionButtonId)?.startsWith('btn_') 
                                      ? "bg-primary text-primary-foreground font-bold" 
                                      : getStatusClasses(subtask.status as any)
                                  )}>
                                    <SelectValue placeholder="Mudar status..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={SubtaskStatus.TODO}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                                        <span>A fazer</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value={SubtaskStatus.IN_PROGRESS}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-info" />
                                        <span>Em andamento</span>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value={SubtaskStatus.COMPLETED_PENDING}>
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-success" />
                                        <span>Concluído</span>
                                      </div>
                                    </SelectItem>

                                    {/* Botões de Ação Dinâmicos */}
                                    {buttonDefs?.filter(def => {
                                      const btn = def as any
                                      if (!btn.projectIds || btn.projectIds === '[]' || btn.projectIds === '') return true
                                      try {
                                        const ids = JSON.parse(btn.projectIds) as string[]
                                        return ids.includes(subtask.mainTaskId)
                                      } catch {
                                        return true
                                      }
                                    }).map(def => {
                                      const btn = def as any
                                      return (
                                        <SelectItem key={btn.id} value={`btn_${btn.id}`}>
                                          <div className="flex items-center gap-2">
                                            <div className={cn("w-2 h-2 rounded-full", 
                                              btn.color === 'amber' ? 'bg-amber-500' :
                                              btn.color === 'sky' ? 'bg-sky-500' :
                                              btn.color === 'rose' ? 'bg-rose-500' :
                                              btn.color === 'teal' ? 'bg-teal-500' :
                                              btn.color === 'indigo' ? 'bg-indigo-500' :
                                              btn.color === 'coral' ? 'bg-orange-500' : 'bg-primary'
                                            )} />
                                            <span className="font-bold">{btn.name}</span>
                                          </div>
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenDetails(subtask)}
                                  className="h-8 w-8 p-0 hover:bg-muted"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Ver detalhes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {getTabSubtasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma tarefa encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Visão do Projeto - Barra horizontal de progresso */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Andamento dos Projetos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectsByMainTask.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum projeto
                  </div>
                ) : (
                  projectsByMainTask.map(({ mainTaskId, mainTask, subtasks: projectSubtasks }) => (
                    <div
                      key={mainTaskId}
                      className="rounded-lg border p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{mainTask?.title || 'Projeto'}</h3>
                          {mainTask?.client && (
                            <ClientBadge name={mainTask.client.name} className="mt-1" />
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {projectSubtasks.length} tarefa{projectSubtasks.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <div className="mt-3">
                        {projectSubtasks.length > 0 ? (
                          <TaskSequenceProgressBar
                            subtasks={projectSubtasks.map((s: any) => ({
                              id: s.id,
                              title: s.title,
                              status: s.status,
                              mainTaskId: s.mainTaskId,
                              dependencies: s.dependencies,
                            }))}
                            className="max-w-full"
                            onTaskClick={(subtask) => {
                              const s = projectSubtasks.find((p: any) => p.id === subtask.id)
                              if (s) handleOpenDetails(s)
                            }}
                          />
                        ) : (
                          <div className="h-8 rounded-md bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
                            Nenhuma tarefa
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

       {/* Modal de Detalhes da Subtarefa */}
       {selectedSubtask && (
         <SubtaskDetailsModal
           isOpen={isDetailsModalOpen}
           onClose={handleCloseDetails}
           subtask={selectedSubtask}
           mainTaskId={selectedSubtask.mainTaskId}
           initialTab={initialModalTab}
         />
       )}

       {/* Modal de Confirmação de Conclusão */}
       <SubtaskCompletionModal
         isOpen={completionModal.isOpen}
         onOpenChange={(open) => setCompletionModal(prev => ({ ...prev, isOpen: open }))}
         subtaskId={completionModal.subtaskId}
         subtaskTitle={completionModal.subtaskTitle}
         userId={userId}
         onSuccess={() => {
           utils.subtask.getByUser.invalidate({ userRole: userRole as any })
           setCompletionModal({ isOpen: false, subtaskId: '', subtaskTitle: '' })
         }}
       />
     </div>
   )
 }
