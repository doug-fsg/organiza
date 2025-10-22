'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, User, Link, MessageSquare, CheckSquare, Send, Plus, X, CheckCircle2, XCircle, Paperclip } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { useSession } from 'next-auth/react'
import { AttachmentPreview } from './attachment-preview'

interface UploadedFile {
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
}

interface SubtaskDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  subtask: any
  mainTaskId: string
  initialTab?: 'details' | 'comments' | 'checklist'
}

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export function SubtaskDetailsModal({ 
  isOpen, 
  onClose, 
  subtask, 
  mainTaskId, 
  initialTab = 'details'
}: SubtaskDetailsModalProps) {
  const { data: session } = useSession()
  const utils = api.useUtils()
  
  // Estados para comentários
  const [newComment, setNewComment] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<UploadedFile[]>([])
  
  // Estados para checklist
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    if (!subtask?.checklistItems) return []
    try {
      return JSON.parse(subtask.checklistItems)
    } catch {
      return []
    }
  })

  // Estado para controlar a aba ativa
  const [activeTab, setActiveTab] = useState(initialTab)

  // Ref para o scroll dos comentários
  const commentsEndRef = useRef<HTMLDivElement>(null)
  const hasScrolledOnOpenRef = useRef<boolean>(false)

  // Scroll automático para o final dos comentários
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Atualizar aba quando initialTab mudar
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  // Queries
  const { data: comments, refetch: refetchComments } = api.comment.getBySubtask.useQuery(
    { subtaskId: subtask?.id || '' },
    { 
      enabled: !!subtask?.id && isOpen,
      refetchInterval: isOpen ? 10000 : false, // Reduzido para 10 segundos quando modal aberto
      refetchIntervalInBackground: false, // Só atualiza quando modal visível
    }
  )

  // Mutations
  const createComment = api.comment.create.useMutation({
    onSuccess: () => {
      refetchComments()
      setNewComment('')
      toast.success('Comentário adicionado')
    },
    onError: () => {
      toast.error('Erro ao adicionar comentário')
    },
  })

  const createAttachments = api.attachment.createMany.useMutation()
  const deleteAttachment = api.attachment.delete.useMutation()

  const markAsRead = api.comment.markAsRead.useMutation({
    onSuccess: () => {
      // Atualizar a lista de subtasks para refletir comentários lidos
      utils.subtask.getByUser.invalidate()
    },
  })

  const updateSubtask = api.subtask.update.useMutation({
    onSuccess: () => {
      utils.subtask.getByUser.invalidate()
      toast.success('Atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar')
    },
  })

  // Scroll para o final apenas uma vez quando o modal é aberto na aba de comentários
  useEffect(() => {
    if (activeTab === 'comments' && comments && comments.length > 0 && !hasScrolledOnOpenRef.current) {
      setTimeout(scrollToBottom, 100) // Delay para garantir renderização
      hasScrolledOnOpenRef.current = true // Marcar que já fez scroll
    }
  }, [activeTab, comments])

  // Resetar flag quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      hasScrolledOnOpenRef.current = false
    }
  }, [isOpen])

  if (!subtask) return null

  const formatDate = (date: Date | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (date: Date | null) => {
    if (!date) return ''
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800'
      case 'LOW': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'Urgente'
      case 'HIGH': return 'Alta'
      case 'MEDIUM': return 'Média'
      case 'LOW': return 'Baixa'
      default: return priority
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TODO': return 'A Fazer'
      case 'IN_PROGRESS': return 'Em Andamento'
      case 'BLOCKED': return 'Bloqueado'
      case 'COMPLETED_PENDING': return 'Aguardando aprovação'
      case 'APPROVED': return 'Aprovado'
      default: return status
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim() || !session?.user?.id) return

    try {
      // Criar o comentário
      const comment = await createComment.mutateAsync({
        content: newComment,
        subtaskId: subtask.id,
        authorId: session.user.id,
      })

      // Se houver anexos pendentes, criar registros de anexos
      if (pendingAttachments.length > 0 && comment) {
        await createAttachments.mutateAsync({
          commentId: comment.id,
          attachments: pendingAttachments.map(att => ({
            fileName: att.fileName,
            fileSize: att.fileSize,
            mimeType: att.mimeType,
            filePath: att.filePath,
            uploadedBy: session.user.id,
          })),
        })
        setPendingAttachments([])
      }

      setNewComment('')
      refetchComments()
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    if (fileArray.length > 10) {
      toast.error('Máximo de 10 arquivos por vez')
      return
    }

    setIsUploadingFiles(true)

    try {
      const formData = new FormData()
      fileArray.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      setPendingAttachments((prev) => [...prev, ...data.files])
      toast.success(`${data.files.length} arquivo(s) anexado(s)`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer upload')
    } finally {
      setIsUploadingFiles(false)
    }
  }

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!session?.user?.id) return
    
    try {
      await deleteAttachment.mutateAsync({
        id: attachmentId,
        userId: session.user.id,
      })
      refetchComments()
      toast.success('Anexo removido')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover anexo')
    }
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return

    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistItem,
      checked: false,
    }

    const updatedChecklist = [...checklist, newItem]
    setChecklist(updatedChecklist)
    setNewChecklistItem('')

    updateSubtask.mutate({
      id: subtask.id,
      checklistItems: updatedChecklist,
    })
  }

  const handleToggleChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )
    setChecklist(updatedChecklist)

    updateSubtask.mutate({
      id: subtask.id,
      checklistItems: updatedChecklist,
    })
  }

  const handleRemoveChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.filter(item => item.id !== itemId)
    setChecklist(updatedChecklist)

    updateSubtask.mutate({
      id: subtask.id,
      checklistItems: updatedChecklist,
    })
  }

  const checkedCount = checklist.filter(item => item.checked).length
  const totalCount = checklist.length
  const commentsCount = comments?.length || 0

  // Marcar comentários como lidos quando o modal abre
  useEffect(() => {
    if (isOpen && subtask?.id && session?.user?.id) {
      markAsRead.mutate({
        subtaskId: subtask.id,
        userId: session.user.id,
      })
    }
  }, [isOpen, subtask?.id, session?.user?.id])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{subtask.title}</span>
            <Badge className={getPriorityColor(subtask.priority)}>
              {getPriorityLabel(subtask.priority)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="comments" className="relative">
              Comentários {commentsCount > 0 && `(${commentsCount})`}
            </TabsTrigger>
            <TabsTrigger value="checklist" className="relative">
              Checklist {totalCount > 0 && `(${checkedCount}/${totalCount})`}
            </TabsTrigger>
          </TabsList>

          {/* Tab: Detalhes */}
          <TabsContent value="details" className="space-y-4">
          {subtask.description && (
              <div className="bg-gray-50 p-3 rounded text-sm">
                {subtask.description}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 p-3 rounded border">
                <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                  <User className="h-4 w-4" />
                  Responsável
                </div>
                <p className="font-medium text-sm">
                  {subtask.assignedTo?.name || 'Não atribuído'}
                </p>
            </div>
            
            <div className="bg-gray-50 p-3 rounded border">
                <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Prazo
                </div>
                <p className="font-medium text-sm">
                  {formatDate(subtask.deadline) || 'Não definido'}
                </p>
              </div>
            </div>

          {/* Dependências */}
          {subtask.dependencies && subtask.dependencies.length > 0 && (
              <div className="space-y-2">
              {(() => {
                const pendingDeps = subtask.dependencies.filter((dep: any) => 
                  dep.blocking && dep.blocking.status !== 'APPROVED'
                )
                
                return pendingDeps.length > 0 ? (
                  <div className="bg-orange-50 p-3 rounded border border-orange-200">
                      <div className="flex items-start gap-2">
                      <Link className="h-4 w-4 text-orange-500 mt-0.5" />
                      <div className="flex-1">
                          <p className="text-sm font-medium text-orange-800 mb-2">
                            Pendentes ({pendingDeps.length})
                        </p>
                          <div className="space-y-2">
                          {pendingDeps.map((dependency: any) => (
                              <div key={dependency.id} className="text-sm bg-white p-2 rounded border">
                                <div className="font-medium">{dependency.blocking.title}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Status: {getStatusLabel(dependency.blocking.status)}
                                </div>
                              </div>
                          ))}
                          </div>
                        </div>
                    </div>
                  </div>
                ) : null
              })()}
              </div>
            )}

            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">Status: </span>
              <span className="font-medium text-sm">{getStatusLabel(subtask.status)}</span>
            </div>
          </TabsContent>

          {/* Tab: Comentários */}
          <TabsContent value="comments" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Comentários</h3>
              {comments && comments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollToBottom}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Ir para o final
                </Button>
              )}
            </div>
            <ScrollArea className="h-[320px] pr-4">
              {comments && comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map((comment: any) => {
                    // Verificar se é um comentário de reprovação (sistema)
                    let isRejectionComment = false
                    let rejectionData = null
                    
                    try {
                      const parsed = JSON.parse(comment.content)
                      if (parsed.type === 'rejection') {
                        isRejectionComment = true
                        rejectionData = parsed
                      }
                    } catch {
                      // Não é JSON, comentário normal
                    }

                    if (isRejectionComment && rejectionData) {
                      // Comentário de reprovação - estilo Chatwoot
                      return (
                        <div key={comment.id} className="relative pl-4 border-l-4 border-l-red-400">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 shrink-0">
                                <XCircle className="h-4 w-4 text-red-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-semibold text-red-900">
                                    Tarefa Reprovada
                                  </span>
                                  <span className="text-xs text-red-600">
                                    {formatDateTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-red-700 mb-2">
                                  por {rejectionData.rejectorName}
                                </p>
                                <div className="bg-white rounded p-2 border border-red-200">
                                  <p className="text-sm text-gray-800">{rejectionData.reason}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // Comentário normal
                    return (
                      <div key={comment.id} className="bg-gray-50 p-3 rounded border">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-sm">{comment.author.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                        
                        {/* Anexos do comentário */}
                        {comment.attachments && comment.attachments.length > 0 && (
                          <AttachmentPreview
                            attachments={comment.attachments}
                            currentUserId={session?.user?.id || ''}
                            onDelete={handleDeleteAttachment}
                          />
                        )}
                      </div>
                    )
                  })}
                  {/* Elemento invisível no final para scroll automático */}
                  <div ref={commentsEndRef} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Sem comentários
                </div>
              )}
            </ScrollArea>

            {/* Anexos Pendentes */}
            {pendingAttachments.length > 0 && (
              <div className="space-y-2 pb-2 border-b">
                <p className="text-xs font-medium text-gray-600">
                  Anexos prontos para enviar:
                </p>
                <div className="flex flex-wrap gap-2">
                  {pendingAttachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs"
                    >
                      <span className="font-medium truncate max-w-[150px]">
                        {file.fileName}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePendingAttachment(index)}
                        className="h-4 w-4 p-0 ml-1"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t">
              <Textarea
                placeholder="Adicionar comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddComment()
                  }
                }}
              />
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={createComment.isPending || isUploadingFiles}
                  accept="*/*"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={createComment.isPending || isUploadingFiles}
                  className="shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || createComment.isPending}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Checklist */}
          <TabsContent value="checklist" className="space-y-4">
            <ScrollArea className="h-[320px] pr-4">
              {checklist.length > 0 ? (
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
                    >
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => handleToggleChecklistItem(item.id)}
                      />
                      <span className={`flex-1 text-sm ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                        {item.text}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleRemoveChecklistItem(item.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Sem itens
            </div>
          )}
            </ScrollArea>

            <div className="flex gap-2 pt-2 border-t">
              <Input
                placeholder="Novo item..."
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddChecklistItem()
                  }
                }}
              />
              <Button
                size="icon"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
