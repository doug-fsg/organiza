'use client'

import { useState } from 'react'
import { UserRole, SubtaskStatus, Priority } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  History
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  role: UserRole
}

interface ManagerApprovalPanelProps {
  currentUser: User
}

export function ManagerApprovalPanel({ currentUser }: ManagerApprovalPanelProps) {
  const [selectedSubtask, setSelectedSubtask] = useState<any>(null)
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    subtaskId: '',
    reason: ''
  })
  const [historyModal, setHistoryModal] = useState({
    isOpen: false,
    subtaskId: ''
  })

  const utils = api.useUtils()

  // Queries
  const { data: mainTasks, isLoading } = api.mainTask.getAll.useQuery()
  const { data: history } = api.subtask.getHistory.useQuery(
    { id: historyModal.subtaskId },
    { enabled: historyModal.isOpen && !!historyModal.subtaskId }
  )

  // Mutations
  const approveSubtask = api.subtask.approveSubtask.useMutation({
    onSuccess: (result) => {
      utils.mainTask.getAll.invalidate()
      toast.success(`✅ ${result.message}`)
      if (result.unblockedSubtasks && result.unblockedSubtasks.length > 0) {
        toast.success(`🔓 ${result.unblockedSubtasks.length} subtarefa(s) foi(ram) desbloqueada(s)!`)
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
      toast.success(`❌ ${result.message}`)
    },
    onError: (error) => {
      toast.error(`Erro ao reprovar: ${error.message}`)
    },
  })

  const reassignSubtask = api.subtask.reassign.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      toast.success('Subtarefa reassignada com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao reassignar: ${error.message}`)
    },
  })

  // Filtrar subtarefas por status
  const getPendingSubtasks = () => {
    if (!mainTasks) return []
    return mainTasks.reduce((acc: any[], task) => {
      const pending = task.subtasks.filter((s: any) => s.status === SubtaskStatus.COMPLETED_PENDING)
      return acc.concat(pending.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
  }

  const getBlockedSubtasks = () => {
    if (!mainTasks) return []
    return mainTasks.reduce((acc: any[], task) => {
      const blocked = task.subtasks.filter((s: any) => s.status === SubtaskStatus.BLOCKED)
      return acc.concat(blocked.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
  }

  const getAllSubtasks = () => {
    if (!mainTasks) return []
    return mainTasks.reduce((acc: any[], task) => {
      return acc.concat(task.subtasks.map((s: any) => ({ ...s, mainTaskTitle: task.title })))
    }, [])
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

  const getStatusColor = (status: SubtaskStatus) => {
    switch (status) {
      case SubtaskStatus.TODO:
        return 'bg-gray-100 text-gray-800'
      case SubtaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case SubtaskStatus.BLOCKED:
        return 'bg-red-100 text-red-800'
      case SubtaskStatus.COMPLETED_PENDING:
        return 'bg-yellow-100 text-yellow-800'
      case SubtaskStatus.APPROVED:
        return 'bg-green-100 text-green-800'
      case SubtaskStatus.REJECTED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

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

  const SubtaskCard = ({ subtask, showActions = true }: { subtask: any; showActions?: boolean }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-lg">{subtask.title}</h4>
              <p className="text-sm text-gray-600 mt-1">📋 {subtask.mainTaskTitle}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(subtask.status)}>
                {getStatusLabel(subtask.status)}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(subtask.priority)}>
                {subtask.priority}
              </Badge>
            </div>
          </div>

          {/* Description */}
          {subtask.description && (
            <p className="text-sm text-gray-700">{subtask.description}</p>
          )}

          {/* Meta informações */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <User className="h-4 w-4" />
              <span>Responsável: {subtask.assignedTo?.name || 'Não atribuído'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Prazo: {formatDate(subtask.deadline)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Concluído em: {formatDate(subtask.completedAt)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <BarChart3 className="h-4 w-4" />
              <span>Estimado: {subtask.estimatedHours || 0}h</span>
            </div>
          </div>

          {/* Rejection reason if rejected */}
          {subtask.status === SubtaskStatus.REJECTED && subtask.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">
                <strong>Motivo da reprovação:</strong> {subtask.rejectionReason}
              </p>
            </div>
          )}

          {/* Actions */}
          {showActions && subtask.status === SubtaskStatus.COMPLETED_PENDING && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryModal({ isOpen: true, subtaskId: subtask.id })}
                >
                  <History className="h-4 w-4 mr-2" />
                  Histórico
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReject(subtask.id)}
                  disabled={rejectSubtask.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reprovar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(subtask.id)}
                  disabled={approveSubtask.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Carregando subtarefas...</p>
        </div>
      </div>
    )
  }

  const pendingSubtasks = getPendingSubtasks()
  const blockedSubtasks = getBlockedSubtasks()
  const allSubtasks = getAllSubtasks()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Painel de Aprovação do Gestor</h2>
        <p className="text-gray-600">Gerencie subtarefas que aguardam sua aprovação</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingSubtasks.length}</p>
                <p className="text-xs text-muted-foreground">Aguardando Aprovação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{blockedSubtasks.length}</p>
                <p className="text-xs text-muted-foreground">Bloqueadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {allSubtasks.filter(s => s.status === SubtaskStatus.APPROVED).length}
                </p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Aguardando Aprovação ({pendingSubtasks.length})
          </TabsTrigger>
          <TabsTrigger value="blocked">
            Bloqueadas ({blockedSubtasks.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas as Subtarefas ({allSubtasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pendingSubtasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma subtarefa aguardando aprovação
                </h3>
                <p className="text-gray-600">
                  Todas as subtarefas estão aprovadas ou em andamento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingSubtasks.map((subtask: any) => (
                <SubtaskCard key={subtask.id} subtask={subtask} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="blocked">
          {blockedSubtasks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma subtarefa bloqueada
                </h3>
                <p className="text-gray-600">
                  Não há subtarefas bloqueadas por dependências no momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {blockedSubtasks.map((subtask: any) => (
                <SubtaskCard key={subtask.id} subtask={subtask} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          <div className="space-y-4">
            {allSubtasks.map((subtask: any) => (
              <SubtaskCard 
                key={subtask.id} 
                subtask={subtask} 
                showActions={subtask.status === SubtaskStatus.COMPLETED_PENDING}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Reprovação */}
      <Dialog open={rejectionModal.isOpen} onOpenChange={(open) => 
        setRejectionModal(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Reprovar Subtarefa</DialogTitle>
            <DialogDescription>
              Informe o motivo da reprovação. O responsável será notificado.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
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
            <DialogTitle>Histórico da Subtarefa</DialogTitle>
            <DialogDescription>
              Acompanhe todas as ações realizadas nesta subtarefa.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {history && history.length > 0 ? (
              history.map((log: any) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {log.user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {log.user.name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {log.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
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
    </div>
  )
}

