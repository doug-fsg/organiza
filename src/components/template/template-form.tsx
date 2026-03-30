'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Plus, ChevronUp, ChevronDown, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface WorkflowStage {
  title: string
  description?: string
  requiresApproval: boolean
  assignedToId?: string
  departmentId?: string
}

const SELECT_NONE = '__none__'

const DEFAULT_STAGES: WorkflowStage[] = [
  { title: 'Cadastro do interessado', requiresApproval: true },
  { title: 'Envio de documentos', requiresApproval: true },
  { title: 'Análise de crédito', requiresApproval: true },
  { title: 'Aprovação', requiresApproval: true },
  { title: 'Assinatura do contrato', requiresApproval: true },
  { title: 'Entrega das chaves', requiresApproval: true },
]

interface SubtaskModelFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SubtaskModelForm({ open, onOpenChange, onSuccess }: SubtaskModelFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stages, setStages] = useState<WorkflowStage[]>([])

  // Reset form ao fechar o dialog (cancelar)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('')
      setDescription('')
      setStages([])
    }
    onOpenChange(nextOpen)
  }

  const utils = api.useUtils()
  const { data: users } = api.user.getAll.useQuery(undefined, { enabled: open })
  const { data: departments } = api.department.getAll.useQuery(undefined, { enabled: open })
  const createMutation = api.subtaskTemplate.create.useMutation({
    onSuccess: () => {
      toast.success('Modelo criado! O workflow é sequencial: não é possível pular etapas.')
      utils.subtaskTemplate.getAll.invalidate()
      handleOpenChange(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleUseDefaults = () => {
    setStages(DEFAULT_STAGES)
  }

  const addStage = () => {
    setStages([...stages, { title: '', requiresApproval: true }])
  }

  const updateStage = (index: number, field: keyof WorkflowStage, value: string | boolean | undefined) => {
    const next = [...stages]
    next[index] = { ...next[index], [field]: value }
    setStages(next)
  }

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index))
  }

  const moveStage = (from: number, to: number) => {
    if (to < 0 || to >= stages.length) return
    const next = [...stages]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    setStages(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const validStages = stages.filter((s) => s.title.trim()).map((s) => ({
      title: s.title.trim(),
      description: s.description?.trim(),
      requiresApproval: s.requiresApproval,
      assignedToId: s.assignedToId || undefined,
      departmentId: s.departmentId || undefined,
    }))

    if (validStages.length < 2) {
      toast.error('Adicione pelo menos 2 etapas ao modelo')
      return
    }

    if (!name.trim()) {
      toast.error('Nome do modelo é obrigatório')
      return
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      stages: validStages,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Modelo de Tarefas</DialogTitle>
          <DialogDescription>
            Defina as etapas do processo. A ordem é obrigatória: não é possível pular da etapa 1 para a 5 — cada etapa só avança quando a anterior for aprovada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do modelo</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Venda de imóvel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o tipo de processo..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Etapas (ordem obrigatória)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseDefaults}
                className="text-xs"
              >
                Usar exemplo
              </Button>
            </div>

            <div className="border rounded-lg divide-y">
              {stages.map((stage, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-0.5 mt-2" role="group" aria-label="Reordenar etapa">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveStage(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Subir etapa"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveStage(index, index + 1)}
                      disabled={index === stages.length - 1}
                      aria-label="Descer etapa"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground w-5 pl-1">
                      {index + 1}.
                    </span>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <Input
                      value={stage.title}
                      onChange={(e) => updateStage(index, 'title', e.target.value)}
                      placeholder={`Etapa ${index + 1}`}
                    />
                    <Input
                      value={stage.description || ''}
                      onChange={(e) => updateStage(index, 'description', e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={stage.requiresApproval}
                        onCheckedChange={(c) => updateStage(index, 'requiresApproval', !!c)}
                      />
                      Requer aprovação do gestor
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Select
                        value={stage.assignedToId ?? SELECT_NONE}
                        onValueChange={(v) => updateStage(index, 'assignedToId', v === SELECT_NONE ? undefined : v)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-7 min-w-[120px] max-w-[160px] border-0 bg-muted/40 text-xs font-normal hover:bg-muted/60 shadow-none"
                        >
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE}>—</SelectItem>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={stage.departmentId ?? SELECT_NONE}
                        onValueChange={(v) => updateStage(index, 'departmentId', v === SELECT_NONE ? undefined : v)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-7 min-w-[100px] max-w-[140px] border-0 bg-muted/40 text-xs font-normal hover:bg-muted/60 shadow-none"
                        >
                          <SelectValue placeholder="Setor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE}>—</SelectItem>
                          {departments?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeStage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addStage} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar etapa
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar modelo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Formulário de Edição
// ============================================

interface WorkflowStageEdit {
  title: string
  description?: string
  requiresApproval: boolean
  assignedToId?: string
  departmentId?: string
}

interface SubtaskModelEditFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: {
    id: string
    name: string
    description?: string | null
    stages: Array<{
      title: string
      description?: string
      requiresApproval?: boolean
      assignedToId?: string
      departmentId?: string
    }>
  } | null
  onSave: (data: { name: string; description?: string; stages: WorkflowStageEdit[] }) => void
  isSaving: boolean
}

export function SubtaskModelEditForm({
  open,
  onOpenChange,
  model,
  onSave,
  isSaving,
}: SubtaskModelEditFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stages, setStages] = useState<WorkflowStageEdit[]>([])

  const { data: users } = api.user.getAll.useQuery(undefined, { enabled: open })
  const { data: departments } = api.department.getAll.useQuery(undefined, { enabled: open })

  // Preencher formulário quando modelo carregar
  useEffect(() => {
    if (model && open) {
      setName(model.name)
      setDescription(model.description ?? '')
      setStages(
        (model.stages ?? []).map((s) => ({
          title: s.title,
          description: s.description,
          requiresApproval: s.requiresApproval ?? true,
          assignedToId: s.assignedToId,
          departmentId: s.departmentId,
        }))
      )
    }
  }, [model, open])

  const addStage = () => {
    setStages([...stages, { title: '', requiresApproval: true }])
  }

  const updateStage = (index: number, field: keyof WorkflowStageEdit, value: string | boolean | undefined) => {
    const next = [...stages]
    next[index] = { ...next[index], [field]: value }
    setStages(next)
  }

  const removeStage = (index: number) => {
    setStages(stages.filter((_, i) => i !== index))
  }

  const moveStage = (from: number, to: number) => {
    if (to < 0 || to >= stages.length) return
    const next = [...stages]
    const [removed] = next.splice(from, 1)
    next.splice(to, 0, removed)
    setStages(next)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validStages = stages.filter((s) => s.title.trim()).map((s) => ({
      title: s.title.trim(),
      description: s.description?.trim(),
      requiresApproval: s.requiresApproval,
      assignedToId: s.assignedToId || undefined,
      departmentId: s.departmentId || undefined,
    }))
    if (validStages.length < 2) {
      toast.error('Adicione pelo menos 2 etapas')
      return
    }
    if (!name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      stages: validStages,
    })
  }

  if (!model && open) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <VisuallyHidden>
            <DialogTitle>Carregando modelo</DialogTitle>
          </VisuallyHidden>
          <div className="page-loading-inline flex-col gap-2 py-8">
            <div className="app-spinner-md" />
            <p className="state-message">Carregando...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Modelo</DialogTitle>
          <DialogDescription>
            Altere o nome, descrição ou as etapas. A ordem permanece sequencial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do modelo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Venda de imóvel"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o processo..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Etapas (ordem obrigatória)</Label>
            <div className="border rounded-lg divide-y">
              {stages.map((stage, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 bg-muted/30 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-0.5 mt-2" role="group" aria-label="Reordenar etapa">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveStage(index, index - 1)}
                      disabled={index === 0}
                      aria-label="Subir etapa"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => moveStage(index, index + 1)}
                      disabled={index === stages.length - 1}
                      aria-label="Descer etapa"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-muted-foreground w-5 pl-1">{index + 1}.</span>
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <Input
                      value={stage.title}
                      onChange={(e) => updateStage(index, 'title', e.target.value)}
                      placeholder={`Etapa ${index + 1}`}
                    />
                    <Input
                      value={stage.description || ''}
                      onChange={(e) => updateStage(index, 'description', e.target.value)}
                      placeholder="Descrição (opcional)"
                      className="text-sm"
                    />
                    <label className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={stage.requiresApproval}
                        onCheckedChange={(c) => updateStage(index, 'requiresApproval', !!c)}
                      />
                      Requer aprovação do gestor
                    </label>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Select
                        value={stage.assignedToId ?? SELECT_NONE}
                        onValueChange={(v) => updateStage(index, 'assignedToId', v === SELECT_NONE ? undefined : v)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-7 min-w-[120px] max-w-[160px] border-0 bg-muted/40 text-xs font-normal hover:bg-muted/60 shadow-none"
                        >
                          <SelectValue placeholder="Responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE}>—</SelectItem>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={stage.departmentId ?? SELECT_NONE}
                        onValueChange={(v) => updateStage(index, 'departmentId', v === SELECT_NONE ? undefined : v)}
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-7 min-w-[100px] max-w-[140px] border-0 bg-muted/40 text-xs font-normal hover:bg-muted/60 shadow-none"
                        >
                          <SelectValue placeholder="Setor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE}>—</SelectItem>
                          {departments?.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeStage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addStage} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar etapa
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
