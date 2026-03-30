'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { SubtaskModelEditForm } from './template-form'
import toast from 'react-hot-toast'
import { MoreHorizontal, Trash2, Play, Layers, Eye, Pencil } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SubtaskModelListProps {
  onUseModel?: (modelId: string, projectTitle?: string) => void
  /** Quando true, abre dialog para título antes de criar projeto */
  promptProjectTitle?: boolean
  /** Indica que está criando projeto a partir do modelo (loading) */
  isCreating?: boolean
}

export function SubtaskModelList({ onUseModel, promptProjectTitle = true, isCreating = false }: SubtaskModelListProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  })
  const [viewDialog, setViewDialog] = useState<{ isOpen: boolean; modelId?: string }>({
    isOpen: false,
  })
  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; modelId?: string }>({
    isOpen: false,
  })
  const [useModelDialog, setUseModelDialog] = useState<{
    isOpen: boolean
    modelId?: string
    modelName?: string
    projectTitle: string
  }>({ isOpen: false, projectTitle: '' })

  const { data: models, isLoading } = api.subtaskTemplate.getAll.useQuery()
  const { data: users } = api.user.getAll.useQuery(undefined, { enabled: viewDialog.isOpen || editDialog.isOpen })
  const { data: departments } = api.department.getAll.useQuery(undefined, {
    enabled: viewDialog.isOpen || editDialog.isOpen,
  })
  const { data: modelToView } = api.subtaskTemplate.getById.useQuery(
    { id: viewDialog.modelId ?? '' },
    { enabled: viewDialog.isOpen && !!viewDialog.modelId }
  )
  const { data: modelToEdit } = api.subtaskTemplate.getById.useQuery(
    { id: editDialog.modelId ?? '' },
    { enabled: editDialog.isOpen && !!editDialog.modelId }
  )
  const utils = api.useUtils()

  const deleteMutation = api.subtaskTemplate.delete.useMutation({
    onSuccess: () => {
      toast.success('Modelo deletado')
      utils.subtaskTemplate.getAll.invalidate()
      setDeleteDialog({ isOpen: false })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.subtaskTemplate.update.useMutation({
    onSuccess: () => {
      toast.success('Modelo atualizado')
      utils.subtaskTemplate.getAll.invalidate()
      setEditDialog({ isOpen: false })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleUseClick = (modelId: string, modelName: string) => {
    if (promptProjectTitle && onUseModel) {
      setUseModelDialog({
        isOpen: true,
        modelId,
        modelName,
        projectTitle: modelName,
      })
    } else if (onUseModel) {
      onUseModel(modelId)
    }
  }

  const handleConfirmUse = () => {
    if (useModelDialog.modelId && useModelDialog.projectTitle.trim() && onUseModel) {
      onUseModel(useModelDialog.modelId, useModelDialog.projectTitle.trim())
      setUseModelDialog({ isOpen: false, projectTitle: '' })
    } else {
      toast.error('Informe o título do projeto')
    }
  }

  if (isLoading) {
    return (
      <div className="page-loading-inline h-96">
        <div className="app-spinner-md" />
      </div>
    )
  }

  if (!models || models.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-96">
          <Layers className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">Nenhum modelo de tarefas</p>
          <p className="text-sm text-muted-foreground text-center">
            Crie modelos para reutilizar etapas em projetos novos ou existentes
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
        {models.map((model) => {
          const stageCount = (() => {
            try {
              return (JSON.parse(model.stagesData) as unknown[]).length
            } catch {
              return 0
            }
          })()
          return (
            <article
              key={model.id}
              className="flex flex-col rounded-lg border bg-card text-card-foreground overflow-hidden transition-shadow hover:shadow-md min-w-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
                <h3 className="text-sm font-semibold truncate min-w-0">
                  {model.name}
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 p-1.5 -m-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label="Opções"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewDialog({ isOpen: true, modelId: model.id })}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setEditDialog({ isOpen: true, modelId: model.id })}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    {onUseModel && (
                      <DropdownMenuItem onClick={() => handleUseClick(model.id, model.name)}>
                        <Play className="h-4 w-4 mr-2" />
                        Novo projeto
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => setDeleteDialog({ isOpen: true, id: model.id })}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Body */}
              <div className="flex-1 px-4 py-3 min-w-0">
                {model.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {model.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {stageCount} etapas · {format(new Date(model.createdAt), 'dd/MM/yy', { locale: ptBR })}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 pt-0 flex flex-col gap-2">
                {onUseModel && (
                  <Button
                    size="sm"
                    className="w-full justify-center gap-2 whitespace-nowrap"
                    onClick={() => handleUseClick(model.id, model.name)}
                  >
                    <Play className="h-4 w-4 shrink-0" />
                    Novo projeto
                  </Button>
                )}
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setViewDialog({ isOpen: true, modelId: model.id })}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Ver
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDialog({ isOpen: true, modelId: model.id })}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteDialog({ isOpen: true, id: model.id })}
                    className="text-xs text-destructive hover:text-destructive/90 transition-colors"
                  >
                    Deletar
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este modelo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && deleteMutation.mutate({ id: deleteDialog.id })}
              className="bg-destructive text-destructive-foreground"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={useModelDialog.isOpen}
        onOpenChange={(open) => !open && setUseModelDialog({ isOpen: false, projectTitle: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo projeto</DialogTitle>
            <DialogDescription>
              Informe o título do projeto. As etapas do modelo "{useModelDialog.modelName}" serão aplicadas em sequência.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Título do projeto</Label>
            <Input
              value={useModelDialog.projectTitle}
              onChange={(e) => setUseModelDialog((p) => ({ ...p, projectTitle: e.target.value }))}
              placeholder="Ex: Venda Imóvel - Cliente João"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseModelDialog({ isOpen: false, projectTitle: '' })} disabled={isCreating}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmUse} disabled={isCreating}>
              {isCreating ? 'Criando...' : 'Criar projeto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver modelo */}
      <Dialog
        open={viewDialog.isOpen}
        onOpenChange={(open) => !open && setViewDialog({ isOpen: false })}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{modelToView?.name ?? 'Modelo'}</DialogTitle>
            {modelToView?.description && (
              <DialogDescription>{modelToView.description}</DialogDescription>
            )}
          </DialogHeader>
          {modelToView?.stages && (
            <div className="space-y-2">
              <Label>Etapas ({modelToView.stages.length})</Label>
              <ScrollArea className="h-[240px] rounded-md border p-3">
                <ol className="list-decimal list-inside space-y-2">
                  {(modelToView.stages as Array<{
                    title: string
                    description?: string
                    requiresApproval?: boolean
                    assignedToId?: string
                    departmentId?: string
                  }>).map((stage, i) => {
                    const assignedUser = stage.assignedToId && users?.find((u) => u.id === stage.assignedToId)
                    const dept = stage.departmentId && departments?.find((d) => d.id === stage.departmentId)
                    return (
                      <li key={i} className="text-sm">
                        <span className="font-medium">{stage.title}</span>
                        {stage.description && (
                          <p className="text-muted-foreground text-xs ml-6 mt-0.5">{stage.description}</p>
                        )}
                        {(stage.requiresApproval || assignedUser || dept) && (
                          <p className="text-muted-foreground text-xs ml-6 mt-0.5">
                            {stage.requiresApproval && <span className="text-amber-600">Requer aprovação</span>}
                            {assignedUser && (
                              <span>{stage.requiresApproval ? ' • ' : ''}Responsável: {assignedUser.name}</span>
                            )}
                            {dept && (
                              <span>{(stage.requiresApproval || assignedUser) ? ' • ' : ''}Setor: {dept.name}</span>
                            )}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ol>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar modelo */}
      <SubtaskModelEditForm
        open={editDialog.isOpen}
        onOpenChange={(open) => !open && setEditDialog({ isOpen: false })}
        model={modelToEdit}
        onSave={(data) => {
          if (editDialog.modelId) {
            updateMutation.mutate({
              id: editDialog.modelId,
              name: data.name,
              description: data.description,
              stages: data.stages,
            })
          }
        }}
        isSaving={updateMutation.isPending}
      />
    </>
  )
}
