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
import { Textarea } from '@/components/ui/textarea'
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Lock, 
  User,
  Info,
  Paperclip,
  X
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { AttachmentPreview } from './attachment-preview'

interface UploadedFile {
  fileName: string
  fileSize: number
  filePath: string
  mimeType: string
}

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
  const [completionComment, setCompletionComment] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<UploadedFile[]>([])

  // Query para verificar dependências
  const { data: dependencyCheck, isLoading } = api.subtask.checkDependencies.useQuery(
    { id: subtaskId },
    { 
      enabled: isOpen,
      refetchOnWindowFocus: false
    }
  )

  // Mutations
  const completeSubtask = api.subtask.completeSubtask.useMutation()
  const createComment = api.comment.create.useMutation()
  const createAttachments = api.attachment.createMany.useMutation()

  const handleCompleteSubtask = async () => {
    setIsConfirming(true)
    
    try {
      // 1. Concluir a subtarefa
      const result = await completeSubtask.mutateAsync({
        id: subtaskId,
        userId
      })

      if (result.success) {
        // 2. Criar comentário de conclusão (se houver texto ou anexos)
        if (completionComment.trim() || pendingAttachments.length > 0) {
          const comment = await createComment.mutateAsync({
            subtaskId,
            content: completionComment.trim() || 'Tarefa concluída',
            authorId: userId
          })

          // 3. Criar anexos (se houver)
          if (pendingAttachments.length > 0) {
            await createAttachments.mutateAsync({
              commentId: comment.id,
              attachments: pendingAttachments.map(file => ({
                fileName: file.fileName,
                fileSize: file.fileSize,
                mimeType: file.mimeType,
                filePath: file.filePath,
                uploadedBy: userId
              }))
            })
          }
        }

        // 4. Mostrar mensagem de sucesso
        if (result.newStatus === SubtaskStatus.COMPLETED_PENDING) {
          toast.success('Tarefa concluída com sucesso!')
        } else if (result.newStatus === SubtaskStatus.BLOCKED) {
          toast.success('Tarefa marcada como bloqueada por dependências pendentes.')
        }
        
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: any) {
      toast.error(`Erro ao concluir tarefa: ${error.message}`)
    } finally {
      setIsConfirming(false)
    }
  }

  // Função para upload de arquivos
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    // Validar quantidade de arquivos
    if (pendingAttachments.length + fileArray.length > 10) {
      toast.error('Máximo de 10 arquivos por comentário')
      return
    }

    // Validar tamanho dos arquivos
    const maxSize = 200 * 1024 * 1024 // 200MB
    for (const file of fileArray) {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} excede o limite de 200MB`)
        return
      }
    }

    try {
      const formData = new FormData()
      fileArray.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro no upload')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Erro no upload')
      }
      
      setPendingAttachments(prev => [...prev, ...result.files])
      toast.success(`${fileArray.length} arquivo(s) carregado(s) com sucesso`)
    } catch (error) {
      toast.error('Erro ao fazer upload dos arquivos')
    }

    // Limpar input
    event.target.value = ''
  }

  // Função para remover anexo pendente
  const removePendingAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index))
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
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Aguardando Aprovação</Badge>
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

          {/* Comentário de conclusão */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Comentário de conclusão (opcional)</label>
              <Textarea
                value={completionComment}
                onChange={(e) => setCompletionComment(e.target.value)}
                placeholder="Descreva o que foi realizado, observações importantes, ou deixe em branco..."
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Upload de anexos */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Anexos (opcional)</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  id="completion-attachments"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('completion-attachments')?.click()}
                  className="flex items-center gap-2"
                >
                  <Paperclip className="h-4 w-4" />
                  Anexar arquivos
                </Button>
                <span className="text-xs text-muted-foreground">
                  Máx. 10 arquivos, 200MB cada
                </span>
              </div>

              {/* Preview dos anexos pendentes */}
              {pendingAttachments.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Anexos ({pendingAttachments.length}):
                  </div>
                  <div className="space-y-1">
                    {pendingAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-700">{file.fileName}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.fileSize / 1024 / 1024).toFixed(1)}MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePendingAttachment(index)}
                          className="h-6 w-6 p-0 text-gray-500 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Verificação de dependências */}
          {isLoading ? (
            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <div className="app-spinner-sm" />
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
                      A tarefa será marcada como "Aguardando Aprovação" do gestor
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
                        A tarefa será marcada como "Bloqueado" até que todas as dependências sejam aprovadas
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
            onClick={handleCompleteSubtask} 
            disabled={isConfirming || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isConfirming ? (
              <div className="flex items-center space-x-2">
                <div className="app-spinner-inverse" />
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

