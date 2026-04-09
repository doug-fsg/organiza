'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { SubtaskStatus } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  User,
  Paperclip,
  X,
  ListChecks,
  Plus,
  ShieldAlert,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface UploadedFile {
  fileName: string
  fileSize: number
  filePath: string
  mimeType: string
}

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

function parseChecklistJson(raw: string | null | undefined): ChecklistItem[] {
  if (!raw?.trim()) return []
  try {
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (row): row is ChecklistItem =>
          !!row &&
          typeof row === 'object' &&
          typeof (row as ChecklistItem).id === 'string' &&
          typeof (row as ChecklistItem).text === 'string' &&
          typeof (row as ChecklistItem).checked === 'boolean'
      )
      .map((row) => ({
        id: row.id,
        text: row.text,
        checked: row.checked,
      }))
  } catch {
    return []
  }
}

interface SubtaskCompletionModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  subtaskId: string
  subtaskTitle: string
  userId: string
  /** JSON da subtarefa, repassado pelo Kanban para evitar round-trip */
  initialChecklistItems: string | null
  /**
   * Se definido, o modal entra em modo "pré-execução de botão":
   * não completa a tarefa — só salva notas/anexos e depois executa as automações do botão.
   */
  smartButtonIdAfterComplete?: string | null
  /** Nome do botão inteligente (para exibir no header do modal). */
  smartButtonName?: string | null
  /** Usado apenas quando smartButtonIdAfterComplete é null (modo de conclusão normal). */
  requiresApproval?: boolean
  onSuccess: () => void
}

export function SubtaskCompletionModal({
  isOpen,
  onOpenChange,
  subtaskId,
  subtaskTitle,
  userId,
  initialChecklistItems,
  smartButtonIdAfterComplete = null,
  smartButtonName = null,
  requiresApproval = true,
  onSuccess,
}: SubtaskCompletionModalProps) {
  /** True quando o modal é aberto pelo botão inteligente com confirmação */
  const isSmartButtonMode = Boolean(smartButtonIdAfterComplete)
  const utils = api.useUtils()
  const wasOpenRef = useRef(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [showDependencies, setShowDependencies] = useState(false)
  const [completionComment, setCompletionComment] = useState('')
  const [pendingAttachments, setPendingAttachments] = useState<UploadedFile[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [newChecklistItem, setNewChecklistItem] = useState('')
  /** Listas longas: focar pendentes ou feitos sem perder dados */
  const [checklistListFilter, setChecklistListFilter] = useState<'all' | 'pending' | 'done'>('all')
  /** Checklist é secundário: colapsado por padrão */
  const [checklistSectionOpen, setChecklistSectionOpen] = useState(false)

  const { data: dependencyCheck, isLoading } = api.subtask.checkDependencies.useQuery(
    { id: subtaskId },
    {
      // No modo smart button não precisamos verificar dependências nem aprovação
      enabled: isOpen && !isSmartButtonMode,
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  )

  /**
   * Aprovação do gestor: usa o valor da BD (checkDependencies) como fonte primária;
   * cai no prop do Kanban enquanto a query carrega ou para o modo normal sem cache.
   */
  const needsManagerApproval = dependencyCheck?.requiresApproval ?? requiresApproval

  const completeSubtask = api.subtask.completeSubtask.useMutation()
  const createComment = api.comment.create.useMutation()
  const createAttachments = api.attachment.createMany.useMutation()
  const updateSubtask = api.subtask.update.useMutation({
    onSuccess: () => {
      void utils.subtask.getByUser.invalidate()
    },
    onError: () => {
      toast.error('Não foi possível salvar o checklist')
    },
  })

  const executeSmartButton = api.taskField.executeSmartButton.useMutation({
    onSuccess: () => {
      void utils.subtask.invalidate()
      void utils.comment.invalidate()
      void utils.mainTask.invalidate()
    },
  })

  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        setCompletionComment('')
        setPendingAttachments([])
      }
      wasOpenRef.current = true
    } else {
      wasOpenRef.current = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setChecklist(parseChecklistJson(initialChecklistItems))
    setNewChecklistItem('')
    setShowDependencies(false)
    setChecklistListFilter('all')
    setChecklistSectionOpen(false)
  }, [isOpen, initialChecklistItems, subtaskId])

  const persistChecklist = (items: ChecklistItem[]) => {
    setChecklist(items)
    updateSubtask.mutate({
      id: subtaskId,
      checklistItems: items,
    })
  }

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return
    const item: ChecklistItem = {
      id: `${Date.now()}`,
      text: newChecklistItem.trim(),
      checked: false,
    }
    persistChecklist([...checklist, item])
    setNewChecklistItem('')
  }

  const handleToggleChecklistItem = (itemId: string) => {
    persistChecklist(
      checklist.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i))
    )
  }

  const handleRemoveChecklistItem = (itemId: string) => {
    persistChecklist(checklist.filter((i) => i.id !== itemId))
  }

  const handleMarkAllChecklist = () => {
    if (checklist.length === 0 || checklist.every((i) => i.checked)) return
    persistChecklist(checklist.map((i) => ({ ...i, checked: true })))
  }

  /** Desmarca todos os itens (limpa as conclusões). */
  const handleClearAllChecklist = () => {
    if (checklist.length === 0 || checklist.every((i) => !i.checked)) return
    persistChecklist(checklist.map((i) => ({ ...i, checked: false })))
  }

  const checklistTotal = checklist.length
  const checklistDone = checklist.filter((i) => i.checked).length
  const checklistPending = checklistTotal - checklistDone
  const checklistPercent = checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0

  const displayedChecklist = useMemo(() => {
    if (checklistListFilter === 'pending') return checklist.filter((i) => !i.checked)
    if (checklistListFilter === 'done') return checklist.filter((i) => i.checked)
    return checklist
  }, [checklist, checklistListFilter])

  /** Modo botão inteligente: salva notas/anexos (opcional) e executa as automações. */
  const handleSmartButtonConfirm = async () => {
    if (!smartButtonIdAfterComplete) return
    setIsConfirming(true)
    try {
      if (completionComment.trim() || pendingAttachments.length > 0) {
        const comment = await createComment.mutateAsync({
          subtaskId,
          content: completionComment.trim() || 'Notas antes da execução do botão',
          authorId: userId,
        })
        if (pendingAttachments.length > 0) {
          await createAttachments.mutateAsync({
            commentId: comment.id,
            attachments: pendingAttachments.map((file) => ({
              fileName: file.fileName,
              fileSize: file.fileSize,
              mimeType: file.mimeType,
              filePath: file.filePath,
              uploadedBy: userId,
            })),
          })
        }
      }
      await executeSmartButton.mutateAsync({ buttonId: smartButtonIdAfterComplete, subtaskId })
      toast.success('Automações executadas com sucesso.')
      onSuccess()
      onOpenChange(false)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao executar automações: ${msg}`)
    } finally {
      setIsConfirming(false)
    }
  }

  /** Modo conclusão normal: completa a tarefa e salva notas. */
  const handleCompleteSubtask = async () => {
    setIsConfirming(true)

    try {
      const result = await completeSubtask.mutateAsync({
        id: subtaskId,
        userId,
      })

      if (result.success) {
        if (completionComment.trim() || pendingAttachments.length > 0) {
          const comment = await createComment.mutateAsync({
            subtaskId,
            content: completionComment.trim() || 'Tarefa concluída',
            authorId: userId,
          })

          if (pendingAttachments.length > 0) {
            await createAttachments.mutateAsync({
              commentId: comment.id,
              attachments: pendingAttachments.map((file) => ({
                fileName: file.fileName,
                fileSize: file.fileSize,
                mimeType: file.mimeType,
                filePath: file.filePath,
                uploadedBy: userId,
              })),
            })
          }
        }

        toast.success(result.message?.trim() || 'Operação concluída.')
        onSuccess()
        onOpenChange(false)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      toast.error(`Erro ao concluir tarefa: ${msg}`)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleConfirm = isSmartButtonMode ? handleSmartButtonConfirm : handleCompleteSubtask

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    if (pendingAttachments.length + fileArray.length > 10) {
      toast.error('Máximo de 10 arquivos por comentário')
      return
    }

    const maxSize = 200 * 1024 * 1024
    for (const file of fileArray) {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} excede o limite de 200MB`)
        return
      }
    }

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
        throw new Error('Erro no upload')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro no upload')
      }

      setPendingAttachments((prev) => [...prev, ...result.files])
      toast.success(`${fileArray.length} arquivo(s) carregado(s) com sucesso`)
    } catch {
      toast.error('Erro ao fazer upload dos arquivos')
    }

    event.target.value = ''
  }

  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const getStatusBadge = (status: SubtaskStatus) => {
    switch (status) {
      case SubtaskStatus.TODO:
        return <Badge variant="secondary">A Fazer</Badge>
      case SubtaskStatus.IN_PROGRESS:
        return <Badge variant="secondary">Em andamento</Badge>
      case SubtaskStatus.BLOCKED:
        return <Badge variant="destructive">Bloqueado</Badge>
      case SubtaskStatus.COMPLETED_PENDING:
        return <Badge variant="secondary">Aguardando aprovação</Badge>
      case SubtaskStatus.APPROVED:
        return <Badge variant="secondary">Aprovado</Badge>
      case SubtaskStatus.REJECTED:
        return <Badge variant="destructive">Reprovado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden border-border p-0 shadow-lg sm:max-w-[560px]">
        <DialogHeader className="shrink-0 space-y-3 border-b border-border bg-muted/30 px-6 pb-4 pt-6">
          <DialogTitle className="flex items-start gap-3 text-left">
            <div
              className={cn(
                'mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
                isSmartButtonMode
                  ? 'bg-sky-500 text-white'
                  : 'bg-primary text-primary-foreground'
              )}
              aria-hidden
            >
              {isSmartButtonMode ? (
                <Zap className="h-5 w-5" />
              ) : (
                <CheckCircle2 className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-snug text-foreground">{subtaskTitle}</p>
              {isSmartButtonMode && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Notas e anexos antes de executar{smartButtonName ? ` "${smartButtonName}"` : ' o botão'}
                </p>
              )}
            </div>
          </DialogTitle>

          {/* Faixa de contexto — apenas no modo conclusão normal */}
          {!isSmartButtonMode && (
            <div className="rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="app-spinner-sm" aria-hidden />
                  <span className="text-amber-900/90 dark:text-amber-100/90">Verificando dependências…</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help items-center gap-1.5 font-medium">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                        Confirmação definitiva
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-xs">
                      Após concluir, não é possível reverter pelo mesmo fluxo.
                    </TooltipContent>
                  </Tooltip>
                  {!dependencyCheck ? null : dependencyCheck.canComplete ? (
                    <span className="text-amber-900/85 dark:text-amber-100/85">
                      {needsManagerApproval ? (
                        <>
                          · depois, <span className="font-medium">aprovação do gestor</span>
                        </>
                      ) : (
                        <>
                          · <span className="font-medium">sem aprovação do gestor</span> — conclusão imediata
                        </>
                      )}
                    </span>
                  ) : (
                    <>
                      <span className="text-amber-900/85 dark:text-amber-100/85">
                        · <span className="font-medium">pendências</span> ({dependencyCheck.pendingDependencies.length})
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 cursor-pointer px-2 text-[11px] text-amber-950 hover:bg-amber-100/80 dark:text-amber-50 dark:hover:bg-amber-900/50"
                        onClick={() => setShowDependencies(!showDependencies)}
                      >
                        {showDependencies ? 'Ocultar' : 'Ver'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 [scrollbar-gutter:stable]">
          {!isLoading && dependencyCheck && !dependencyCheck.canComplete && showDependencies ? (
            <div className="rounded-md border border-border/80 bg-muted/15 p-2">
              <ul className="max-h-[min(30vh,200px)] space-y-1 overflow-y-auto pr-1">
                {dependencyCheck.pendingDependencies.map((dep) => (
                  <li
                    key={dep.id}
                    className="flex items-center justify-between gap-2 rounded border border-border/60 bg-background/50 px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{dep.title}</p>
                      {dep.assignedTo ? (
                        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">{dep.assignedTo}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0">{getStatusBadge(dep.status)}</div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Fluxo principal: notas e anexos (checklist fica depois, secundário) */}
          <div className="space-y-3">
            <div>
              <label htmlFor="completion-notes" className="mb-1 block text-sm font-medium">
                Notas
              </label>
              <Textarea
                id="completion-notes"
                value={completionComment}
                onChange={(e) => setCompletionComment(e.target.value)}
                placeholder="Resumo rápido do que foi feito…"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden />
                Anexos
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  className="cursor-pointer"
                  onClick={() => document.getElementById('completion-attachments')?.click()}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Anexar
                </Button>
              </div>

              {pendingAttachments.length > 0 ? (
                <ul className="space-y-1">
                  {pendingAttachments.map((file, index) => (
                    <li
                      key={`${file.filePath}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-2 py-1.5"
                    >
                      <span className="truncate text-xs text-foreground">{file.fileName}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 cursor-pointer px-2 text-muted-foreground hover:text-destructive"
                        onClick={() => removePendingAttachment(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          {/* Checklist: opcional, recolhido por padrão — não compete com o fluxo de conclusão */}
          <Collapsible open={checklistSectionOpen} onOpenChange={setChecklistSectionOpen}>
            <div className="rounded-lg border border-border/60 bg-muted/10">
              <CollapsibleTrigger
                className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/25"
                type="button"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
                  <ListChecks className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  <span className="truncate">
                    Checklist
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground/90">(opcional)</span>
                  </span>
                  {checklistTotal > 0 ? (
                    <Badge variant="secondary" className="shrink-0 font-mono text-[10px] tabular-nums">
                      {checklistDone}/{checklistTotal}
                    </Badge>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                    checklistSectionOpen && 'rotate-180'
                  )}
                  aria-hidden
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="data-[state=closed]:animate-none">
                <div className="border-t border-border/60 px-3 pb-3 pt-1">
                  {checklistTotal > 0 ? (
                    <>
                      <Progress value={checklistPercent} className="mb-1.5 h-1.5" />
                      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                        <button
                          type="button"
                          className="cursor-pointer underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                          onClick={handleMarkAllChecklist}
                          disabled={updateSubtask.isPending || checklistDone === checklistTotal}
                          title="Marcar todos os itens"
                        >
                          Marcar todos
                        </button>
                        <span className="select-none text-border" aria-hidden>
                          ·
                        </span>
                        <button
                          type="button"
                          className="cursor-pointer underline-offset-2 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                          onClick={handleClearAllChecklist}
                          disabled={updateSubtask.isPending || checklistDone === 0}
                          title="Desmarcar todos os itens"
                        >
                          Limpar todos
                        </button>
                      </div>
                      {checklistTotal >= 8 ? (
                        <div
                          className="mb-2 flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Filtrar itens do checklist"
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant={checklistListFilter === 'all' ? 'default' : 'outline'}
                            className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                            onClick={() => setChecklistListFilter('all')}
                          >
                            Todos
                            <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal">
                              {checklistTotal}
                            </Badge>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={checklistListFilter === 'pending' ? 'default' : 'outline'}
                            className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                            onClick={() => setChecklistListFilter('pending')}
                          >
                            Pendentes
                            <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal">
                              {checklistPending}
                            </Badge>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={checklistListFilter === 'done' ? 'default' : 'outline'}
                            className="h-7 cursor-pointer gap-1 px-2 text-[11px]"
                            onClick={() => setChecklistListFilter('done')}
                          >
                            Feitos
                            <Badge variant="secondary" className="px-1 py-0 text-[10px] font-normal">
                              {checklistDone}
                            </Badge>
                          </Button>
                        </div>
                      ) : null}
                      <ScrollArea className="h-[min(28vh,240px)] w-full pr-3">
                        <ul className="space-y-1.5 pb-1">
                          {displayedChecklist.length === 0 ? (
                            <li className="rounded-md border border-dashed border-border px-2 py-6 text-center text-xs text-muted-foreground">
                              Nenhum item neste filtro.{' '}
                              <button
                                type="button"
                                className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline"
                                onClick={() => setChecklistListFilter('all')}
                              >
                                Ver todos
                              </button>
                            </li>
                          ) : (
                            displayedChecklist.map((item) => (
                              <li
                                key={item.id}
                                className="flex items-center gap-2 rounded-md border border-border/60 bg-background/50 px-2 py-1.5"
                              >
                                <Checkbox
                                  checked={item.checked}
                                  onCheckedChange={() => handleToggleChecklistItem(item.id)}
                                  disabled={updateSubtask.isPending}
                                  className="cursor-pointer"
                                  aria-label={
                                    item.checked ? `Desmarcar: ${item.text}` : `Marcar: ${item.text}`
                                  }
                                />
                                <span
                                  className={`min-w-0 flex-1 text-xs ${
                                    item.checked ? 'text-muted-foreground line-through' : ''
                                  }`}
                                >
                                  {item.text}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 shrink-0 cursor-pointer text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemoveChecklistItem(item.id)}
                                  disabled={updateSubtask.isPending}
                                  aria-label={`Remover item: ${item.text}`}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </li>
                            ))
                          )}
                        </ul>
                      </ScrollArea>
                    </>
                  ) : null}

                  <div className={cn('flex gap-2', checklistTotal > 0 && 'mt-2 border-t border-border/40 pt-2')}>
                    <Input
                      placeholder="Novo item…"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddChecklistItem()
                        }
                      }}
                      disabled={updateSubtask.isPending}
                      className="h-9 cursor-text text-sm"
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="h-9 w-9 shrink-0 cursor-pointer"
                      onClick={handleAddChecklistItem}
                      disabled={!newChecklistItem.trim() || updateSubtask.isPending}
                      aria-label="Adicionar item ao checklist"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/20 px-6 py-4 sm:justify-end">
          <Button
            variant="outline"
            type="button"
            className="cursor-pointer"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming || (!isSmartButtonMode && isLoading)}
            className={cn(
              'cursor-pointer gap-2',
              isSmartButtonMode
                ? 'bg-sky-500 hover:bg-sky-600 text-white'
                : 'bg-primary hover:bg-primary/90'
            )}
          >
            {isConfirming ? (
              <>
                <div className="app-spinner-inverse" aria-hidden />
                {isSmartButtonMode ? 'Executando…' : 'Concluindo…'}
              </>
            ) : (
              <>
                {isSmartButtonMode ? (
                  <Zap className="h-4 w-4" aria-hidden />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                )}
                {isSmartButtonMode ? 'Confirmar e executar' : 'Concluir'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
