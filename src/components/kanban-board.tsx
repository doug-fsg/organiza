'use client'

import { useState, useEffect, useRef } from 'react'
import { SubtaskStatus, Priority } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Calendar, Clock, MessageSquare, AlertTriangle, CheckCircle, GripVertical, MoreHorizontal, GitBranch, CheckCircle2, Eye } from 'lucide-react'
import { api } from '@/lib/api'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useDroppable,
} from '@dnd-kit/core'
import {
  CSS,
} from '@dnd-kit/utilities'
import toast from 'react-hot-toast'
import { SubtaskDetailsModal } from '@/components/subtask-details-modal'
import { SubtaskCompletionModal } from '@/components/subtask-completion-modal'

interface KanbanBoardProps {
  userId: string
  userRole?: string
}

// Componente para a coluna droppable
function DroppableColumn({ 
  status, 
  title, 
  color, 
  children, 
  count 
}: {
  status: SubtaskStatus
  title: string
  color: string
  children: React.ReactNode
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div className="flex flex-col h-full">
      <Card className={`${color} border-2 flex-1 h-full ${isOver ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
        <div className="px-7 py-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {count}
            </Badge>
          </div>
        </div>
        <CardContent 
          className="flex-1 min-h-32 pt-0 px-3 pb-2" 
          ref={setNodeRef}
        >
          <div className="h-full w-full">
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para o card arrastável
function DraggableSubtaskCard({ subtask, onStatusChange, onOpenDetails, onComplete }: {
  subtask: any,
  onStatusChange: (subtaskId: string, newStatus: SubtaskStatus) => void,
  onOpenDetails: (subtask: any, tab?: 'details' | 'comments' | 'checklist') => void,
  onComplete?: (subtask: any) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-white shadow-sm hover:shadow-md transition-shadow cursor-grab ${
        isDragging ? 'rotate-3 scale-105' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-4">
        <SubtaskCardContent 
          subtask={subtask} 
          onStatusChange={onStatusChange}
          onOpenDetails={onOpenDetails}
          onComplete={onComplete}
        />
      </CardContent>
    </Card>
  )
}

// Componente para o conteúdo do card (reutilizável)
function SubtaskCardContent({ subtask, onStatusChange, onOpenDetails, onComplete }: {
  subtask: any,
  onStatusChange: (subtaskId: string, newStatus: SubtaskStatus) => void,
  onOpenDetails: (subtask: any, tab?: 'details' | 'comments' | 'checklist') => void,
  onComplete?: (subtask: any) => void
}) {
  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'bg-red-100 text-red-800'
      case Priority.HIGH:
        return 'bg-orange-100 text-orange-800'
      case Priority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800'
      case Priority.LOW:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'Urgente'
      case Priority.HIGH:
        return 'Alta'
      case Priority.MEDIUM:
        return 'Média'
      case Priority.LOW:
        return 'Baixa'
      default:
        return priority
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const isOverdue = (deadline: Date | null) => {
    if (!deadline) return false
    return new Date(deadline) < new Date()
  }

  return (
    <div className="space-y-3">
      {/* Título e Prioridade */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 
            className="font-medium text-sm leading-tight flex-1 cursor-pointer hover:text-blue-600"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetails(subtask)
            }}
          >
            {subtask.title}
          </h4>
          <div className="flex items-center space-x-1">
            {/* Botão de Conclusão - só aparece em IN_PROGRESS */}
            {subtask.status === SubtaskStatus.IN_PROGRESS && onComplete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onComplete(subtask)
                      }}
                      className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700 transition-all duration-200 group"
                    >
                      <CheckCircle2 className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs font-medium">✅ Concluir tarefa</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onOpenDetails(subtask)
              }}
              className="h-6 w-6 p-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getPriorityColor(subtask.priority)}>
              {getPriorityLabel(subtask.priority)}
            </Badge>
            {subtask.isRecurring && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 cursor-help">
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
                      
                      {/* Mostrar dias da semana para semanal/quinzenal */}
                      {(subtask.recurringType === 'WEEKLY' || subtask.recurringType === 'BIWEEKLY') && subtask.recurringWeekDays && (
                        <p>Dias: {JSON.parse(subtask.recurringWeekDays).map((day: string) => {
                          const dayNames: Record<string, string> = {
                            'SUNDAY': 'Dom', 'MONDAY': 'Seg', 'TUESDAY': 'Ter',
                            'WEDNESDAY': 'Qua', 'THURSDAY': 'Qui', 'FRIDAY': 'Sex', 'SATURDAY': 'Sáb'
                          }
                          return dayNames[day] || day
                        }).join(', ')}</p>
                      )}
                      
                      {/* Mostrar dias do mês para mensal */}
                      {subtask.recurringType === 'MONTHLY' && subtask.recurringMonthDays && (
                        <p>Dias do mês: {JSON.parse(subtask.recurringMonthDays).join(', ')}</p>
                      )}
                      
                      {/* Mostrar intervalo para personalizada/diária */}
                      {(subtask.recurringType === 'CUSTOM' || subtask.recurringType === 'DAILY') && subtask.recurringInterval && subtask.recurringInterval > 1 && (
                        <p>A cada {subtask.recurringInterval} dias</p>
                      )}
                      
                      {/* Opções especiais */}
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
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 cursor-help">
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
          </div>
          {isOverdue(subtask.deadline) && (
            <Badge variant="destructive" className="text-xs">
              Atrasado
            </Badge>
          )}
        </div>
      </div>

      {/* Tarefa Principal */}
      <div className="text-xs text-muted-foreground">
        📋 {subtask.mainTask.title}
      </div>

      {/* Deadline e Indicadores */}
      <div className="flex items-center justify-between">
        {subtask.deadline && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 mr-1" />
            {formatDate(subtask.deadline)}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Comentários - Ícone SEMPRE visível, número só quando há não lidos */}
          {(() => {
            // Verificar se há comentários não lidos
            const unreadComments = subtask.comments?.filter((comment: any) => {
              try {
                const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
                return !readBy.includes(subtask.assignedToId)
              } catch {
                return true // Se erro ao parsear, considerar como não lido
              }
            }) || []
            
            const hasUnread = unreadComments.length > 0
            const totalComments = subtask.comments?.length || 0
            
            return (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (onOpenDetails.length > 1) {
                    onOpenDetails(subtask, 'comments')
                  } else {
                    onOpenDetails(subtask)
                  }
                }}
                className="relative group cursor-pointer"
                title={hasUnread 
                  ? `${unreadComments.length} comentário${unreadComments.length > 1 ? 's' : ''} não lido${unreadComments.length > 1 ? 's' : ''}`
                  : totalComments > 0 
                    ? `${totalComments} comentário${totalComments > 1 ? 's' : ''}`
                    : 'Ver comentários'
                }
              >
                {/* Círculo de fundo ao hover */}
                <div className="absolute inset-0 -m-1.5 rounded-full bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                {/* Ícone */}
                <MessageSquare className="h-4 w-4 text-gray-500 relative z-10 group-hover:text-gray-700 group-hover:scale-110 transition-all duration-200" />
                
                {/* Badge vermelho - SÓ aparece se tiver não lidos */}
                {hasUnread && (
                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-red-500 z-20 animate-pulse shadow-lg">
                    {unreadComments.length > 99 ? '99+' : unreadComments.length}
                  </div>
                )}
              </button>
            )
          })()}
          
          {/* Checklist */}
          {subtask.checklistItems && (() => {
            try {
              const items = JSON.parse(subtask.checklistItems)
              if (items.length > 0) {
                const checked = items.filter((item: any) => item.checked).length
                return (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    <CheckCircle className="h-3 w-3" />
                    <span>{checked}/{items.length}</span>
                  </div>
                )
              }
            } catch {
              return null
            }
            return null
          })()}
        </div>
      </div>

      {/* Indicador de Dependências */}
      {subtask.dependencies && subtask.dependencies.length > 0 && (() => {
        const blockingDependencies = subtask.dependencies.filter((dep: any) => 
          dep.blocking && 
          dep.blocking.status !== 'APPROVED'
        )
        
        return blockingDependencies.length > 0 ? (
          <div className="flex items-center justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1 text-xs text-orange-600 cursor-help">
                    <GitBranch className="h-3 w-3 text-orange-500" />
                    <span className="text-orange-600 font-medium">
                      {blockingDependencies.length}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {blockingDependencies.length} dependência{blockingDependencies.length > 1 ? 's' : ''} pendente{blockingDependencies.length > 1 ? 's' : ''}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : null
      })()}
    </div>
  )
}

export function KanbanBoard({ userId, userRole }: KanbanBoardProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'pending' | 'waiting' | 'approved'>('tasks')
  const [activeSubtask, setActiveSubtask] = useState<any>(null)
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
  
  const { data: subtasks, isLoading } = api.subtask.getByUser.useQuery({
    userRole: userRole as any,
  }, {
    refetchInterval: 15000, // Reduzido para 15 segundos
    refetchIntervalInBackground: false, // Só atualiza quando componente visível
  })

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
    onSuccess: (updatedSubtask) => {
      // Invalidar e refetch das queries relacionadas
      utils.subtask.getByUser.invalidate({ userId })
      toast.success('Tarefa atualizada com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar tarefa: ${error.message}`)
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const getSubtasksByStatus = (status: SubtaskStatus) => {
    return subtasks?.filter(subtask => subtask.status === status) || []
  }

  const getTabCounts = () => {
    if (!subtasks) return { tasks: 0, pending: 0, waiting: 0, approved: 0 }
    
    return {
      tasks: subtasks.filter(s => s.status === SubtaskStatus.TODO || s.status === SubtaskStatus.IN_PROGRESS).length,
      pending: subtasks.filter(s => s.status === SubtaskStatus.BLOCKED).length,
      waiting: subtasks.filter(s => s.status === SubtaskStatus.COMPLETED_PENDING).length,
      approved: subtasks.filter(s => s.status === SubtaskStatus.APPROVED).length
    }
  }

  const getTabSubtasks = () => {
    if (!subtasks) return []
    
    switch (activeTab) {
      case 'tasks':
        return subtasks.filter(s => s.status === SubtaskStatus.TODO || s.status === SubtaskStatus.IN_PROGRESS)
      case 'pending':
        return subtasks.filter(s => s.status === SubtaskStatus.BLOCKED)
      case 'waiting':
        return subtasks.filter(s => s.status === SubtaskStatus.COMPLETED_PENDING)
      case 'approved':
        return subtasks.filter(s => s.status === SubtaskStatus.APPROVED)
      default:
        return []
    }
  }

  const tabCounts = getTabCounts()

  const handleStatusChange = (subtaskId: string, newStatus: SubtaskStatus) => {
    updateSubtask.mutate({
      id: subtaskId,
      status: newStatus,
    })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const subtask = subtasks?.find(s => s.id === active.id)
    setActiveSubtask(subtask)
  }

  // Não precisamos mais do hook canStartSubtask, verificamos diretamente pelo objeto subtask
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveSubtask(null)

    if (!over) return

    const subtaskId = active.id as string
    const newStatus = over.id as SubtaskStatus

    // Verificar se realmente mudou de status
    const currentSubtask = subtasks?.find(s => s.id === subtaskId)
    if (currentSubtask?.status === newStatus) return

    // Verificar se é um movimento válido
    const validStatuses = Object.values(SubtaskStatus)
    if (!validStatuses.includes(newStatus)) return

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

    // Não permitir mover para outros status de conclusão via drag
    if (newStatus === SubtaskStatus.APPROVED || newStatus === SubtaskStatus.BLOCKED) {
      toast.error('Esta ação deve ser feita pelo gestor ou automaticamente pelo sistema.')
      return
    }

    // Se passou por todas as verificações, pode mudar o status
    handleStatusChange(subtaskId, newStatus)
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
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-gray-200 rounded w-12 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-16 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center py-0.5 px-6">
              <div className="flex items-center space-x-2 w-full">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-gray-200 rounded w-12 animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Skeleton para quadro Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="border-2">
              <div className="px-7 py-1">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
                  <div className="h-5 bg-gray-200 rounded-full w-8 animate-pulse" />
                </div>
              </div>
              <CardContent className="pt-0 px-3 pb-2">
                <div className="space-y-3 min-h-[200px]">
                  {[1, 2].map((j) => (
                    <div key={j} className="bg-gray-100 rounded-lg h-32 animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Calcular total de mensagens não lidas em tarefas aguardando aprovação
  const totalUnreadMessagesInWaiting = subtasks?.reduce((total, s) => {
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

  return (
    <div className="space-y-6">
      {/* Tabs com contadores */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            Minhas Tarefas
            {tabCounts.tasks > 0 && (
              <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-800">
                {tabCounts.tasks}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pendentes
            {tabCounts.pending > 0 && (
              <Badge variant="destructive" className="ml-1">
                {tabCounts.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="waiting" className="flex items-center gap-2 relative">
            Aguardando
            <div className="flex items-center gap-1">
              {tabCounts.waiting > 0 && (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                  {tabCounts.waiting}
                </Badge>
              )}
              {totalUnreadMessagesInWaiting > 0 && (
                <Badge variant="default" className="bg-purple-600 text-white animate-pulse">
                  💬 {totalUnreadMessagesInWaiting}
                </Badge>
              )}
            </div>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            Aprovadas
            {tabCounts.approved > 0 && (
              <Badge variant="outline" className="ml-1 bg-green-100 text-green-800">
                {tabCounts.approved}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Aba Minhas Tarefas - Kanban */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Resumo das Tarefas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="flex items-center py-0.5 px-6">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getSubtasksByStatus(SubtaskStatus.TODO).length}</p>
                    <p className="text-xs text-muted-foreground">A Fazer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="flex items-center py-0.5 px-6">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{getSubtasksByStatus(SubtaskStatus.IN_PROGRESS).length}</p>
                    <p className="text-xs text-muted-foreground">Em Andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quadro Kanban com Drag & Drop */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { status: SubtaskStatus.TODO, title: 'A Fazer', color: 'border-gray-200' },
                { status: SubtaskStatus.IN_PROGRESS, title: 'Em Andamento', color: 'border-blue-200' }
              ].map((column) => {
                const columnSubtasks = getSubtasksByStatus(column.status)
                
                return (
                  <DroppableColumn
                    key={column.status}
                    status={column.status}
                    title={column.title}
                    color={column.color}
                    count={columnSubtasks.length}
                  >
                    <SortableContext 
                      items={columnSubtasks.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3 min-h-[200px]">
                        {columnSubtasks.map((subtask) => (
                          <DraggableSubtaskCard
                            key={subtask.id}
                            subtask={subtask}
                            onStatusChange={handleStatusChange}
                            onOpenDetails={handleOpenDetails}
                            onComplete={handleCompleteTask}
                          />
                        ))}
                      
                        {columnSubtasks.length === 0 && (
                          <div 
                            className="text-center py-8 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg"
                            style={{ minHeight: '100px' }}
                          >
                            <p className="text-sm">Arraste uma tarefa aqui</p>
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </DroppableColumn>
                )
              })}
            </div>

            {/* Overlay do item sendo arrastado */}
            <DragOverlay>
              {activeSubtask ? (
                <Card className="bg-white shadow-lg rotate-3 scale-105">
                  <CardContent className="p-4">
                  <SubtaskCardContent 
                    subtask={activeSubtask} 
                    onStatusChange={handleStatusChange}
                    onOpenDetails={handleOpenDetails}
                    onComplete={handleCompleteTask}
                  />
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Aba Pendentes - Tabela */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Dependências</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTabSubtasks().map((subtask) => (
                    <TableRow key={subtask.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{subtask.title}</p>
                          {subtask.description && (
                            <p className="text-sm text-muted-foreground">{subtask.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{subtask.mainTask.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          subtask.priority === Priority.URGENT ? 'bg-red-100 text-red-800' :
                          subtask.priority === Priority.HIGH ? 'bg-orange-100 text-orange-800' :
                          subtask.priority === Priority.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {subtask.priority === Priority.URGENT ? 'Urgente' :
                           subtask.priority === Priority.HIGH ? 'Alta' :
                           subtask.priority === Priority.MEDIUM ? 'Média' : 'Baixa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subtask.dependencies?.length > 0 ? (
                          <div className="space-y-1">
                            <div className="text-sm text-orange-600 font-medium">
                              {subtask.dependencies.length} dependência(s)
                            </div>
                            <div className="space-y-1">
                              {subtask.dependencies
                                .filter((dep: any) => dep.blocking && dep.blocking.status !== 'APPROVED')
                                .slice(0, 2)
                                .map((dep: any) => (
                                  <div key={dep.id} className="text-xs text-muted-foreground">
                                    • {dep.blocking.title}
                                  </div>
                                ))}
                              {subtask.dependencies.filter((dep: any) => dep.blocking && dep.blocking.status !== 'APPROVED').length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{subtask.dependencies.filter((dep: any) => dep.blocking && dep.blocking.status !== 'APPROVED').length - 2} mais...
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nenhuma</span>
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
                  ))}
                  {getTabSubtasks().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma tarefa pendente
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Aguardando - Tabela */}
        <TabsContent value="waiting">
          <Card>
            <CardHeader>
              <CardTitle>Aguardando Aprovação</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Concluída em</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTabSubtasks().map((subtask) => {
                    // Calcular comentários não lidos
                    const unreadComments = subtask.comments?.filter((comment: any) => {
                      if (comment.authorId === userId) return false // Não contar próprios comentários
                      try {
                        const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
                        return !readBy.includes(userId)
                      } catch {
                        return true
                      }
                    }).length || 0
                    
                    const hasUnreadComments = unreadComments > 0
                    const totalComments = subtask.comments?.length || 0

                    return (
                      <TableRow key={subtask.id} className={hasUnreadComments ? 'bg-purple-50/20' : ''}>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <div className="flex-1">
                              <p className="font-medium">{subtask.title}</p>
                              {subtask.description && (
                                <p className="text-sm text-muted-foreground">{subtask.description}</p>
                              )}
                              {totalComments > 0 && (
                                <button
                                  onClick={() => {
                                    setSelectedSubtask(subtask)
                                    setInitialModalTab('comments')
                                    setIsDetailsModalOpen(true)
                                  }}
                                  className={`mt-1 flex items-center gap-1 text-xs transition-all hover:underline ${
                                    hasUnreadComments 
                                      ? 'text-purple-600 font-semibold hover:text-purple-700' 
                                      : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <MessageSquare className={`h-3 w-3 ${hasUnreadComments ? 'fill-purple-600' : ''}`} />
                                  <span>{totalComments} comentário{totalComments !== 1 ? 's' : ''}</span>
                                  {hasUnreadComments && (
                                    <Badge variant="default" className="ml-1 bg-purple-600 text-white text-[10px] px-1 py-0 h-4 animate-pulse">
                                      {unreadComments} novo{unreadComments !== 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{subtask.mainTask.title}</TableCell>
                        <TableCell>
                          {subtask.completedAt ? 
                            new Date(subtask.completedAt).toLocaleString('pt-BR') : 
                            'Não informado'
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            Aguardando
                          </Badge>
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
                  {getTabSubtasks().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma tarefa aguardando aprovação
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Aprovadas - Tabela */}
        <TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle>Tarefas Aprovadas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Projeto</TableHead>
                    <TableHead>Aprovada em</TableHead>
                    <TableHead>Tempo Total</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getTabSubtasks().map((subtask) => (
                    <TableRow key={subtask.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{subtask.title}</p>
                          {subtask.description && (
                            <p className="text-sm text-muted-foreground">{subtask.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{subtask.mainTask.title}</TableCell>
                      <TableCell>
                        {subtask.approvedAt ? 
                          new Date(subtask.approvedAt).toLocaleString('pt-BR') : 
                          'Não informado'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {subtask.actualHours && (
                            <span className="text-sm">{subtask.actualHours}h</span>
                          )}
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            ✅ Aprovada
                          </Badge>
                        </div>
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
                  ))}
                  {getTabSubtasks().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma tarefa aprovada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
           utils.subtask.getByUser.invalidate({ userId })
           setCompletionModal({ isOpen: false, subtaskId: '', subtaskTitle: '' })
         }}
       />
     </div>
   )
 }
