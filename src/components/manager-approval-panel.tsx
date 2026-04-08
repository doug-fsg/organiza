'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { UserRole, SubtaskStatus, Priority } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  BarChart3,
  MessageSquare,
  History,
  Eye,
  Filter
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { SubtaskDetailsModal } from './subtask-details-modal'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import { getPriorityClasses, getStatusClasses } from '@/lib/theme-utils'

interface User {
  id: string
  name: string
  role: UserRole
}

interface TasksCentralPanelProps {
  currentUser: User
}

export function TasksCentralPanel({ currentUser }: TasksCentralPanelProps) {
  const [selectedSubtask, setSelectedSubtask] = useState<any>(null)
  const [detailsModal, setDetailsModal] = useState({
    isOpen: false,
    subtask: null as any,
    mainTaskId: ''
  })
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    subtaskId: '',
    reason: ''
  })
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    subtaskId: ''
  })
  const [dateFilter, setDateFilter] = useState<'this_month' | 'last_month' | 'last_3_months' | 'all' | 'custom'>('this_month')
  const [customDateStart, setCustomDateStart] = useState<string>('')
  const [customDateEnd, setCustomDateEnd] = useState<string>('')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'blocked' | 'approved'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const utils = api.useUtils()
  const { playNotificationSound } = useNotificationSound()
  
  // Ref para armazenar contagem anterior de comentários não lidos por subtarefa
  const previousUnreadCountRef = useRef<Record<string, number>>({})

  // Queries
  const { data: mainTasks, isLoading } = api.mainTask.getAll.useQuery(undefined, {
    refetchInterval: 20000, // Reduzido para 20 segundos
    refetchIntervalInBackground: false, // Só atualiza quando componente visível
  })
  const { data: users } = api.user.getAll.useQuery()
  const { data: history } = api.subtask.getHistory.useQuery(
    { id: historyModal.subtaskId },
    { enabled: historyModal.isOpen && !!historyModal.subtaskId }
  )

  // Efeito para tocar som quando há novos comentários não lidos
  useEffect(() => {
    if (!mainTasks) return

    mainTasks.forEach((task) => {
      task.subtasks.forEach((subtask: any) => {
        const unreadCount = subtask.comments?.filter((comment: any) => {
          if (comment.authorId === currentUser.id) return false
          try {
            const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
            return !readBy.includes(currentUser.id)
          } catch {
            return true
          }
        }).length || 0

        const previousCount = previousUnreadCountRef.current[subtask.id]

        // Verificar se o modal desta subtarefa específica está aberto
        const isModalOpenForThisSubtask = detailsModal.isOpen && detailsModal.subtask?.id === subtask.id
        
        // Tocar som se aumentou E modal não está aberto para esta subtarefa
        if (previousCount !== undefined && unreadCount > previousCount && !isModalOpenForThisSubtask) {
          playNotificationSound()
          toast(`Novo comentário em "${subtask.title}"`, {
            icon: '💬',
            duration: 4000,
          })
        }

        // Atualizar contagem anterior desta subtarefa
        previousUnreadCountRef.current[subtask.id] = unreadCount
      })
    })
  }, [mainTasks, currentUser.id, playNotificationSound, detailsModal.isOpen, detailsModal.subtask])

  // Mutations
  const approveSubtask = api.subtask.approveSubtask.useMutation({
    onSuccess: (result) => {
      utils.mainTask.getAll.invalidate()
      toast.success(`✅ ${result.message}`)
      if (result.unblockedSubtasks && result.unblockedSubtasks.length > 0) {
        toast.success(`🔓 ${result.unblockedSubtasks.length} tarefa(s) foi(ram) desbloqueada(s)!`)
      }
    },
    onError: (error) => {
      toast.error(`Erro ao aprovar: ${error.message}`)
    },
  })

  const rejectSubtask = api.subtask.rejectSubtask.useMutation({
    onSuccess: (result) => {
      utils.mainTask.getAll.invalidate()
      setRejectionModal({ isOpen: false, subtaskId: '', reason: '' })
      toast.success(result.message)
    },
    onError: (error) => {
      toast.error(`Erro ao reprovar: ${error.message}`)
    },
  })

  const reassignSubtask = api.subtask.reassign.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      toast.success('Tarefa reassignada com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao reassignar: ${error.message}`)
    },
  })

  // Função auxiliar para obter data relevante da subtarefa
  const getRelevantDate = (subtask: any): Date | null => {
    if (subtask.status === SubtaskStatus.APPROVED && subtask.approvedAt) {
      return new Date(subtask.approvedAt)
    } else if (subtask.status === SubtaskStatus.COMPLETED_PENDING && subtask.completedAt) {
      return new Date(subtask.completedAt)
    } else if (subtask.status === SubtaskStatus.BLOCKED) {
      return subtask.updatedAt ? new Date(subtask.updatedAt) : new Date(subtask.createdAt)
    } else {
      return subtask.completedAt 
        ? new Date(subtask.completedAt) 
        : subtask.createdAt 
        ? new Date(subtask.createdAt)
        : null
    }
  }

  // Função de filtro de data
  const shouldIncludeSubtask = (subtask: any): boolean => {
    if (dateFilter === 'all') return true

    const dateToCheck = getRelevantDate(subtask)
    if (!dateToCheck) return true // Se não tem data, mostrar sempre

    const now = new Date()
    
    switch(dateFilter) {
      case 'this_month': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        return dateToCheck >= firstDay
      }
      case 'last_month': {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        return dateToCheck >= firstDayLastMonth && dateToCheck <= lastDayLastMonth
      }
      case 'last_3_months': {
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
        return dateToCheck >= threeMonthsAgo
      }
      case 'custom': {
        if (!customDateStart || !customDateEnd) return true
        const start = new Date(customDateStart)
        const end = new Date(customDateEnd)
        end.setHours(23, 59, 59, 999) // Incluir o dia inteiro
        return dateToCheck >= start && dateToCheck <= end
      }
      default:
        return true
    }
  }

  // Filtrar subtarefas por status com filtro de data
  const getPendingSubtasks = useMemo(() => {
    if (!mainTasks) return []
    const allPending = mainTasks.reduce((acc: any[], task) => {
      const pending = task.subtasks.filter((s: any) => s.status === SubtaskStatus.COMPLETED_PENDING)
      return acc.concat(pending.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
    return allPending.filter(shouldIncludeSubtask)
  }, [mainTasks, dateFilter, customDateStart, customDateEnd])

  const getBlockedSubtasks = useMemo(() => {
    if (!mainTasks) return []
    const allBlocked = mainTasks.reduce((acc: any[], task) => {
      const blocked = task.subtasks.filter((s: any) => s.status === SubtaskStatus.BLOCKED)
      return acc.concat(blocked.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
    return allBlocked.filter(shouldIncludeSubtask)
  }, [mainTasks, dateFilter, customDateStart, customDateEnd])

  const getApprovedSubtasks = useMemo(() => {
    if (!mainTasks) return []
    const allApproved = mainTasks.reduce((acc: any[], task) => {
      const approved = task.subtasks.filter((s: any) => s.status === SubtaskStatus.APPROVED)
      return acc.concat(approved.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
    return allApproved.filter(shouldIncludeSubtask)
  }, [mainTasks, dateFilter, customDateStart, customDateEnd])

  const getAllSubtasks = useMemo(() => {
    if (!mainTasks) return []
    const all = mainTasks.reduce((acc: any[], task) => {
      return acc.concat(task.subtasks.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
    return all.filter(shouldIncludeSubtask)
  }, [mainTasks, dateFilter, customDateStart, customDateEnd])

  // Função para obter subtarefas filtradas baseado no filtro ativo e usuário
  const getFilteredSubtasks = useMemo(() => {
    let filtered: any[] = []
    switch(activeFilter) {
      case 'pending':
        filtered = getPendingSubtasks
        break
      case 'blocked':
        filtered = getBlockedSubtasks
        break
      case 'approved':
        filtered = getApprovedSubtasks
        break
      case 'all':
      default:
        filtered = getAllSubtasks
    }
    
    // Aplicar filtro de usuário
    if (userFilter !== 'all' && filtered) {
      filtered = filtered.filter((subtask: any) => {
        return subtask.assignedToId === userFilter
      })
    }
    
    return filtered
  }, [activeFilter, userFilter, getPendingSubtasks, getBlockedSubtasks, getApprovedSubtasks, getAllSubtasks])

  // Ordenar subtarefas filtradas - DEVE estar antes de qualquer early return (Rules of Hooks)
  const sortedSubtasks = useMemo(() => {
    const filtered = getFilteredSubtasks
    return [...filtered].sort((a: any, b: any) => {
      const aHasUnread = a.comments?.some((comment: any) => {
        if (comment.authorId === currentUser.id) return false
        try {
          const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
          return !readBy.includes(currentUser.id)
        } catch {
          return true
        }
      }) || false
      
      const bHasUnread = b.comments?.some((comment: any) => {
        if (comment.authorId === currentUser.id) return false
        try {
          const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
          return !readBy.includes(currentUser.id)
        } catch {
          return true
        }
      }) || false
      
      if (aHasUnread && !bHasUnread) return -1
      if (!aHasUnread && bHasUnread) return 1
      
      if (activeFilter === 'approved') {
        const dateA = a.approvedAt ? new Date(a.approvedAt).getTime() : 0
        const dateB = b.approvedAt ? new Date(b.approvedAt).getTime() : 0
        return dateB - dateA
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [getFilteredSubtasks, currentUser.id, activeFilter])

  // Resetar página quando filtro muda - DEVE estar antes de qualquer early return (Rules of Hooks)
  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, userFilter])

  const getSubtasksWithUnreadComments = (subtasksList?: any[]) => {
    if (!mainTasks) return 0
    const subsToCheck = subtasksList || getAllSubtasks
    return subsToCheck.filter((subtask: any) => {
      const hasComments = subtask.comments && subtask.comments.length > 0
      if (!hasComments) return false
      
      const hasUnread = subtask.comments.some((comment: any) => {
        if (comment.authorId === currentUser.id) return false
        try {
          const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
          return !readBy.includes(currentUser.id)
        } catch {
          return true
        }
      })
      
      return hasUnread
    }).length
  }

  // Função específica para "Todas as Subtarefas" - exclui as que já estão nas outras abas
  const getOtherSubtasksWithUnreadComments = () => {
    if (!mainTasks) return 0
    const allSubtasks = getAllSubtasks
    const pendingSubtasks = getPendingSubtasks
    const blockedSubtasks = getBlockedSubtasks
    
    // Filtrar subtarefas que NÃO estão em "Aguardando" nem "Bloqueadas"
    const otherSubtasks = allSubtasks.filter((subtask: any) => {
      const isPending = pendingSubtasks.some((p: any) => p.id === subtask.id)
      const isBlocked = blockedSubtasks.some((b: any) => b.id === subtask.id)
      return !isPending && !isBlocked
    })
    
    return getSubtasksWithUnreadComments(otherSubtasks)
  }

  const handleApprove = (subtaskId: string) => {
    approveSubtask.mutate({
      id: subtaskId,
      approverId: currentUser.id
    })
  }

  const handleReject = (subtaskId: string) => {
    setRejectionModal({
      isOpen: true,
      subtaskId,
      reason: ''
    })
  }

  const handleConfirmReject = () => {
    if (!rejectionModal.reason.trim()) {
      toast.error('Por favor, informe o motivo da reprovação.')
      return
    }

    rejectSubtask.mutate({
      id: rejectionModal.subtaskId,
      rejectorId: currentUser.id,
      reason: rejectionModal.reason
    })
  }

  const getPriorityColor = (priority: Priority) => getPriorityClasses(priority)

  const getStatusColor = (status: SubtaskStatus) => getStatusClasses(status)

  const getStatusLabel = (status: SubtaskStatus) => {
    switch (status) {
      case SubtaskStatus.TODO:
        return 'A Fazer'
      case SubtaskStatus.IN_PROGRESS:
        return 'Em Andamento'
      case SubtaskStatus.BLOCKED:
        return 'Bloqueado'
      case SubtaskStatus.COMPLETED_PENDING:
        return 'Aguardando Aprovação'
      case SubtaskStatus.APPROVED:
        return 'Aprovado'
      case SubtaskStatus.REJECTED:
        return 'Reprovado'
      default:
        return status
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const handleViewDetails = (subtask: any, initialTab: 'details' | 'comments' | 'checklist' = 'details') => {
    // Encontrar o mainTaskId
    const mainTask = mainTasks?.find(task => 
      task.subtasks.some((s: any) => s.id === subtask.id)
    )
    
    setDetailsModal({
      isOpen: true,
      subtask: { ...subtask, initialTab },
      mainTaskId: mainTask?.id || ''
    })
  }

  const SubtaskCard = ({ subtask, showActions = true }: { subtask: any; showActions?: boolean }) => {
    const hasComments = subtask.comments && subtask.comments.length > 0
    const hasChecklist = subtask.checklistItems && JSON.parse(subtask.checklistItems || '[]').length > 0
    
    // Calcular comentários não lidos pelo gestor atual
    const unreadComments = hasComments 
      ? subtask.comments.filter((comment: any) => {
          if (comment.authorId === currentUser.id) return false // Não contar comentários do próprio gestor
          try {
            const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
            return !readBy.includes(currentUser.id)
          } catch {
            return true
          }
        }).length
      : 0

    const hasUnreadComments = unreadComments > 0
    
    // Estilos específicos baseados no status
    const getCardStyle = () => {
      switch(subtask.status) {
        case SubtaskStatus.BLOCKED:
          return 'mb-4 hover:shadow-md transition-shadow border-l-4 border-red-500 bg-red-50/50'
        case SubtaskStatus.COMPLETED_PENDING:
          return 'mb-4 hover:shadow-md transition-shadow border-l-4 border-warning bg-warning/10'
        case SubtaskStatus.APPROVED:
          return 'mb-4 hover:shadow-md transition-shadow border-l-4 border-green-500 bg-green-50/20'
        default:
          return `mb-4 hover:shadow-md transition-shadow ${hasUnreadComments ? 'bg-sky/10 dark:bg-sky/15' : ''}`
      }
    }
    
    return (
      <Card 
        className={`${getCardStyle()} mb-2 cursor-pointer hover:shadow-lg transition-all`}
        onClick={() => handleViewDetails(subtask)}
      >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight">{subtask.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 truncate leading-snug">📋 {subtask.mainTaskTitle}</p>
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {subtask.status === SubtaskStatus.BLOCKED && (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              {subtask.status === SubtaskStatus.APPROVED && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              <Badge className={`${getStatusColor(subtask.status)} text-xs ${subtask.status === SubtaskStatus.BLOCKED ? 'font-semibold' : ''}`}>
                {getStatusLabel(subtask.status)}
              </Badge>
              <Badge variant="outline" className={`${getPriorityColor(subtask.priority)} text-xs`}>
                {subtask.priority}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {subtask.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 max-w-prose leading-relaxed">{subtask.description}</p>
          )}

          {/* Meta informações compactas */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{subtask.assignedTo?.name || 'Não atribuído'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Prazo: {formatDate(subtask.deadline)}</span>
            </div>
            {subtask.completedAt && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Concluído: {formatDate(subtask.completedAt)}</span>
              </div>
            )}
            {subtask.status === SubtaskStatus.APPROVED && subtask.approvedAt && (
              <div className="flex items-center space-x-1 text-green-700 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Aprovado: {formatDate(subtask.approvedAt)}</span>
              </div>
            )}
            {subtask.status !== SubtaskStatus.APPROVED && subtask.estimatedHours && (
              <div className="flex items-center space-x-1">
                <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{subtask.estimatedHours}h</span>
              </div>
            )}
          </div>

            {/* Indicadores de Checklist e Comentários */}
            {(hasComments || hasChecklist) && (
              <div className="flex items-center gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                {hasChecklist && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewDetails(subtask, 'checklist')
                    }}
                    className="flex items-center gap-1 text-primary hover:text-primary/90 hover:underline transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{JSON.parse(subtask.checklistItems || '[]').filter((item: any) => item.checked).length}/{JSON.parse(subtask.checklistItems || '[]').length}</span>
                  </button>
                )}
                {hasComments && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewDetails(subtask, 'comments')
                    }}
                    className={`flex items-center gap-1 transition-all hover:underline ${
                      hasUnreadComments 
                        ? 'text-sky font-semibold hover:opacity-90' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className={`h-3.5 w-3.5 ${hasUnreadComments ? 'fill-sky' : ''}`} />
                    <span>{subtask.comments.length}</span>
                    {hasUnreadComments && (
                      <Badge variant="default" className="ml-0.5 border-transparent bg-sky text-sky-foreground text-xs px-1 py-0 h-4 animate-pulse">
                        {unreadComments}
                      </Badge>
                    )}
                  </button>
                )}
            </div>
          )}


          {/* Actions */}
          {showActions && subtask.status === SubtaskStatus.COMPLETED_PENDING && (
              <div className="flex items-center justify-end pt-2 border-t gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewDetails(subtask)
                  }}
                  className="h-7 px-2 text-xs"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Detalhes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReject(subtask.id)
                  }}
                  disabled={rejectSubtask.isPending}
                  className="h-7 px-2 text-xs"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Reprovar
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleApprove(subtask.id)
                  }}
                  disabled={approveSubtask.isPending}
                  className="bg-green-600 hover:bg-green-700 h-7 px-3 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Aprovar
                </Button>
              </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="page-loading-inline flex-col gap-2">
          <div className="app-spinner-md" />
          <p className="state-message">Carregando tarefas...</p>
        </div>
      </div>
    )
  }

  const pendingSubtasks = getPendingSubtasks
  const blockedSubtasks = getBlockedSubtasks
  const approvedSubtasks = getApprovedSubtasks
  const allSubtasks = getAllSubtasks

  // Calcular paginação
  const totalPages = Math.ceil(sortedSubtasks.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedSubtasks = sortedSubtasks.slice(startIndex, endIndex)

  // Função para obter mensagem quando não há tarefas
  const getEmptyMessage = () => {
    switch(activeFilter) {
      case 'pending':
        return {
          title: 'Nenhuma tarefa aguardando aprovação',
          description: 'Todas as tarefas foram aprovadas ou estão em andamento.'
        }
      case 'blocked':
        return {
          title: 'Nenhuma tarefa bloqueada',
          description: 'Não há tarefas bloqueadas por dependências no momento.'
        }
      case 'approved':
        return {
          title: 'Nenhuma tarefa aprovada no período selecionado',
          description: 'Ajuste o filtro de data para ver tarefas aprovadas em outros períodos.'
        }
      case 'all':
      default:
        return {
          title: 'Nenhuma tarefa encontrada',
          description: 'Ajuste os filtros para ver mais tarefas.'
        }
    }
  }

  return (
    <div className="space-y-3">
      {/* Header Compacto */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div>
          <h2 className="section-title">Central de Tarefas</h2>
        </div>
        {/* Filtros - Inline com header */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          {/* Filtro de Usuário */}
          <Select value={userFilter} onValueChange={(value: any) => {
            setUserFilter(value)
            setCurrentPage(1)
          }}>
            <SelectTrigger id="user-filter" className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Todos usuários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos usuários</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Filtro de Data */}
          <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
            <SelectTrigger id="date-filter" className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Este Mês</SelectItem>
              <SelectItem value="last_month">Mês Passado</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
              <SelectItem value="all">Todo Período</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customDateStart}
                onChange={(e) => setCustomDateStart(e.target.value)}
                className="w-[130px] h-8 text-xs"
                placeholder="Data Inicial"
              />
              <span className="text-xs text-muted-foreground">até</span>
              <Input
                type="date"
                value={customDateEnd}
                onChange={(e) => setCustomDateEnd(e.target.value)}
                className="w-[130px] h-8 text-xs"
                placeholder="Data Final"
              />
            </div>
          )}
        </div>
      </div>

      {/* Métricas Compactas - Cards Clicáveis */}
      <div className="grid grid-cols-4 gap-2">
        <Card 
          className={`border shadow-sm cursor-pointer transition-all ${
            activeFilter === 'pending' 
              ? 'border-2 border-blue-500 bg-blue-50' 
              : 'border-border hover:border-muted-foreground/25'
          }`}
          onClick={() => {
            setActiveFilter('pending')
            setCurrentPage(1)
          }}
        >
          <CardContent className="flex items-center py-2 px-3">
            <div className="flex items-center space-x-1.5 w-full">
              <div className="w-5 h-5 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="h-3 w-3 text-warning-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold leading-tight tabular-nums">{pendingSubtasks.length}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">Aguardando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`border shadow-sm cursor-pointer transition-all ${
            activeFilter === 'blocked' 
              ? 'border-2 border-blue-500 bg-blue-50' 
              : 'border-border hover:border-muted-foreground/25'
          }`}
          onClick={() => {
            setActiveFilter('blocked')
            setCurrentPage(1)
          }}
        >
          <CardContent className="flex items-center py-2 px-3">
            <div className="flex items-center space-x-1.5 w-full">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-3 w-3 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold leading-tight tabular-nums">{blockedSubtasks.length}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">Bloqueadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`border shadow-sm cursor-pointer transition-all ${
            activeFilter === 'approved' 
              ? 'border-2 border-blue-500 bg-blue-50' 
              : 'border-border hover:border-muted-foreground/25'
          }`}
          onClick={() => {
            setActiveFilter('approved')
            setCurrentPage(1)
          }}
        >
          <CardContent className="flex items-center py-2 px-3">
            <div className="flex items-center space-x-1.5 w-full">
              <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold leading-tight tabular-nums">{approvedSubtasks.length}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`border shadow-sm cursor-pointer transition-all ${
            activeFilter === 'all' 
              ? 'border-2 border-blue-500 bg-blue-50' 
              : 'border-border hover:border-muted-foreground/25'
          }`}
          onClick={() => {
            setActiveFilter('all')
            setCurrentPage(1)
          }}
        >
          <CardContent className="flex items-center py-2 px-3">
            <div className="flex items-center space-x-1.5 w-full">
              <div className="w-5 h-5 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                <Filter className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold leading-tight tabular-nums">{allSubtasks.length}</p>
                <p className="text-xs text-muted-foreground leading-tight truncate">Todas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Tarefas Paginada */}
      {sortedSubtasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2 tracking-tight leading-snug">
              {getEmptyMessage().title}
            </h3>
            <p className="text-muted-foreground max-w-prose mx-auto leading-relaxed text-sm">
              {getEmptyMessage().description}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {paginatedSubtasks.map((subtask: any) => (
              <SubtaskCard 
                key={subtask.id} 
                subtask={subtask} 
                showActions={subtask.status === SubtaskStatus.COMPLETED_PENDING}
              />
            ))}
          </div>
          
          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8"
                >
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8"
                >
                  Próxima
                </Button>
              </div>
              <div className="text-sm text-muted-foreground tabular-nums">
                Mostrando {startIndex + 1}-{Math.min(endIndex, sortedSubtasks.length)} de {sortedSubtasks.length} tarefas
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de Reprovação */}
      <Dialog open={rejectionModal.isOpen} onOpenChange={(open) => 
        setRejectionModal(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reprovar Tarefa</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação. O responsável será notificado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">Motivo da reprovação *</label>
              <Textarea
                value={rejectionModal.reason}
                onChange={(e) => setRejectionModal(prev => ({ 
                  ...prev, 
                  reason: e.target.value 
                }))}
                placeholder="Ex: Não atende aos critérios de qualidade, precisa de ajustes..."
                rows={4}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setRejectionModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmReject}
              disabled={rejectSubtask.isPending || !rejectionModal.reason.trim()}
              variant="destructive"
            >
              {rejectSubtask.isPending ? 'Reprovando...' : 'Reprovar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico */}
      <Dialog open={historyModal.isOpen} onOpenChange={(open) => 
        setHistoryModal(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico da Tarefa</DialogTitle>
            <DialogDescription>
              Acompanhe todas as ações realizadas nesta tarefa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            {history && history.length > 0 ? (
              history.map((log: any) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {log.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {log.user.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {log.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p>Nenhum histórico disponível</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setHistoryModal(prev => ({ ...prev, isOpen: false }))}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes Completo da Subtarefa */}
      {detailsModal.subtask && (
        <SubtaskDetailsModal
          isOpen={detailsModal.isOpen}
          onClose={() => {
            setDetailsModal({ isOpen: false, subtask: null, mainTaskId: '' })
            utils.mainTask.getAll.invalidate()
          }}
          subtask={detailsModal.subtask}
          mainTaskId={detailsModal.mainTaskId}
          initialTab={detailsModal.subtask.initialTab || 'details'}
        />
      )}
    </div>
  )
}

