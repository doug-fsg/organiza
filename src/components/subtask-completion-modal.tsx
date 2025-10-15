'use client'

import { useState } from 'react'
import { SubtaskStatus } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Lock, 
  User,
  Info
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface SubtaskCompletionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  subtaskId: string
  subtaskTitle: string
  userId: string
  onSuccess: () => void
}

export function SubtaskCompletionModal({
  isOpen,
  onOpenChange,
  subtaskId,
  subtaskTitle,
  userId,
  onSuccess
}: SubtaskCompletionModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [showDependencies, setShowDependencies] = useState(false)

  // Query para verificar dependências
  const { data: dependencyCheck, isLoading } = api.subtask.checkDependencies.useQuery(
    { id: subtaskId },
    { 
      enabled: isOpen,
      refetchOnWindowFocus: false
    }
  )

  // Mutation para concluir a subtarefa
  const completeSubtask = api.subtask.completeSubtask.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        if (result.newStatus === SubtaskStatus.COMPLETED_PENDING) {
          toast.success('Tarefa concluída com sucesso!')
        } else if (result.newStatus === SubtaskStatus.BLOCKED) {
          toast.success('⏸️ Subtarefa marcada como bloqueada por dependências pendentes.')
        }
        onSuccess()
        onOpenChange(false)
      }
    },
    onError: (error) => {
      toast.error(`Erro ao concluir subtarefa: ${error.message}`)
    },
    onSettled: () => {
      setIsConfirming(false)
    }
  })

  const handleConfirm = () => {
    setIsConfirming(true)
    completeSubtask.mutate({
      id: subtaskId,
      userId
    })
  }

  const getStatusBadge = (status: SubtaskStatus, assignedTo?: string) => {
    switch (status) {
      case SubtaskStatus.TODO:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">A Fazer</Badge>
      case SubtaskStatus.IN_PROGRESS:
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Em Andamento</Badge>
      case SubtaskStatus.BLOCKED:
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Bloqueado</Badge>
      case SubtaskStatus.COMPLETED_PENDING:
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Aguardando Aprovação</Badge>
      case SubtaskStatus.APPROVED:
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aprovado</Badge>
      case SubtaskStatus.REJECTED:
        return <Badge variant="destructive">Reprovado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-semibold">
                Concluir Tarefa
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            <strong>"{subtaskTitle}"</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alerta de irreversibilidade */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação é irreversível.
            </AlertDescription>
          </Alert>

          {/* Verificação de dependências */}
          {isLoading ? (
            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Verificando dependências...</span>
            </div>
          ) : dependencyCheck ? (
            <div className="space-y-3">
              {dependencyCheck.canComplete ? (
                <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      Todas as dependências foram resolvidas
                    </p>
                    <p className="text-xs text-green-600">
                      A subtarefa será marcada como "Aguardando Aprovação" do gestor
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <Lock className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800">
                        Há dependências pendentes
                      </p>
                      <p className="text-xs text-amber-600">
                        A subtarefa será marcada como "Bloqueado" até que todas as dependências sejam aprovadas
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDependencies(!showDependencies)}
                    >
                      {showDependencies ? 'Ocultar' : 'Ver'} Dependências
                    </Button>
                  </div>

                  {showDependencies && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                          Dependências Pendentes ({dependencyCheck.pendingDependencies.length})
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {dependencyCheck.pendingDependencies.map((dep) => (
                          <div key={dep.id} className="flex items-center justify-between p-3 bg-white rounded border">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{dep.title}</p>
                              {dep.assignedTo && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <User className="h-3 w-3 text-gray-400" />
                                  <span className="text-xs text-gray-500">{dep.assignedTo}</span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              {getStatusBadge(dep.status, dep.assignedTo)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : null}
        </div>

        <DialogFooter className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isConfirming || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isConfirming ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Concluindo...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Concluir</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

