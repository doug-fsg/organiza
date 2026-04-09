'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Sparkles, Globe, Plus, Pencil, HelpCircle } from 'lucide-react'
import { SubtaskStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

const PREDEFINED_COLORS = [
  { name: 'Âmbar', value: 'amber', bg: 'bg-amber-500', text: 'text-white' },
  { name: 'Céu', value: 'sky', bg: 'bg-sky-500', text: 'text-white' },
  { name: 'Rosa', value: 'rose', bg: 'bg-rose-500', text: 'text-white' },
  { name: 'Teal', value: 'teal', bg: 'bg-teal-500', text: 'text-white' },
  { name: 'Índigo', value: 'indigo', bg: 'bg-indigo-500', text: 'text-white' },
  { name: 'Coral', value: 'coral', bg: 'bg-orange-500', text: 'text-white' },
]

interface ActionButtonFormProps {
  button?: any
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function ActionButtonForm({ button, trigger, onSuccess }: ActionButtonFormProps) {
  const [open, setOpen] = useState(false)
  const utils = api.useUtils()
  const { data: projects } = api.mainTask.getAll.useQuery(undefined, { enabled: open })
  
  const createMutation = api.taskField.createDefinition.useMutation()
  const updateMutation = api.taskField.updateDefinition.useMutation()
  const clearActionsMutation = api.taskField.clearActions.useMutation()
  const addActionMutation = api.taskField.addAction.useMutation()

  // Form State
  const [name, setName] = useState('')
  const [color, setColor] = useState('amber')
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  
  // Actions Toggle
  const [actionStatus, setActionStatus] = useState(false)
  const [targetStatus, setTargetStatus] = useState<SubtaskStatus>(SubtaskStatus.IN_PROGRESS)
  const [actionComment, setActionComment] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [actionWebhook, setActionWebhook] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [actionCompleteMain, setActionCompleteMain] = useState(false)
  /** Abre o diálogo de conclusão antes de executar o botão (como em "Concluído") */
  const [confirmBeforeExecute, setConfirmBeforeExecute] = useState(false)

  useEffect(() => {
    if (button && open) {
      setName(button.name)
      setColor(button.color || 'amber')
      setSelectedProjects(button.projectIds ? JSON.parse(button.projectIds) : [])
      setConfirmBeforeExecute(Boolean(button.confirmBeforeExecute))
      
      // Reset actions
      setActionStatus(false)
      setActionComment(false)
      setActionWebhook(false)
      setWebhookUrl('')
      setActionCompleteMain(false)
      
      button.actions.forEach((act: any) => {
        if (act.actionType === 'CHANGE_STATUS') {
          setActionStatus(true)
          const payload = JSON.parse(act.actionPayload)
          setTargetStatus(payload.status)
        }
        if (act.actionType === 'ADD_COMMENT') {
          setActionComment(true)
          const payload = JSON.parse(act.actionPayload)
          setCommentText(payload.comment)
        }
        if (act.actionType === 'FIRE_WEBHOOK') {
          setActionWebhook(true)
          try {
            const p = JSON.parse(act.actionPayload) as { webhookUrl?: string }
            if (typeof p.webhookUrl === 'string') setWebhookUrl(p.webhookUrl)
          } catch {
            /* ignore */
          }
        }
        if (act.actionType === 'COMPLETE_MAINTASK') setActionCompleteMain(true)
      })
    } else if (open) {
      resetForm()
    }
  }, [button, open])

  const resetForm = () => {
    setName('')
    setColor('amber')
    setSelectedProjects([])
    setActionStatus(false)
    setActionComment(false)
    setCommentText('')
    setActionWebhook(false)
    setWebhookUrl('')
    setActionCompleteMain(false)
    setConfirmBeforeExecute(false)
  }

  const handleSave = async () => {
    if (!name) return toast.error('Dê um nome ao botão')
    if (actionWebhook) {
      const w = webhookUrl.trim()
      if (!w) return toast.error('Informe a URL do webhook')
      try {
        new URL(w)
      } catch {
        return toast.error('URL do webhook inválida')
      }
    }

    try {
      let buttonId = button?.id

      if (button?.id) {
        await updateMutation.mutateAsync({
          id: button.id,
          name,
          color,
          projectIds: JSON.stringify(selectedProjects),
          confirmBeforeExecute,
        })
        await clearActionsMutation.mutateAsync({ fieldDefId: button.id })
      } else {
        const newBtn = await createMutation.mutateAsync({
          name,
          color,
          projectIds: JSON.stringify(selectedProjects),
          confirmBeforeExecute,
        })
        buttonId = newBtn.id
      }

      if (!buttonId) throw new Error('Falha ao processar botão')

      const actionPromises = []
      if (actionStatus) {
        actionPromises.push(addActionMutation.mutateAsync({
          fieldDefId: buttonId,
          actionType: 'CHANGE_STATUS',
          actionPayload: JSON.stringify({ status: targetStatus })
        }))
      }
      if (actionCompleteMain) {
        actionPromises.push(addActionMutation.mutateAsync({
          fieldDefId: buttonId,
          actionType: 'COMPLETE_MAINTASK',
          actionPayload: '{}'
        }))
      }
      if (actionComment && commentText) {
        actionPromises.push(addActionMutation.mutateAsync({
          fieldDefId: buttonId,
          actionType: 'ADD_COMMENT',
          actionPayload: JSON.stringify({ comment: commentText })
        }))
      }
      if (actionWebhook) {
        actionPromises.push(
          addActionMutation.mutateAsync({
            fieldDefId: buttonId,
            actionType: 'FIRE_WEBHOOK',
            actionPayload: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
          })
        )
      }

      await Promise.all(actionPromises)
      
      utils.taskField.getDefinitions.invalidate()
      toast.success(button ? 'Botão atualizado!' : 'Botão criado com sucesso!')
      setOpen(false)
      onSuccess?.()
    } catch (e) {
      toast.error('Erro ao salvar as configurações')
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" /> Novo Botão
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {button ? <Pencil className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-primary" />}
            {button ? 'Editar Botão Inteligente' : 'Novo Botão Inteligente'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Nome do Botão</Label>
                <Input 
                  placeholder="Ex: Pronto para Revisão" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-muted/30 border-primary/5 h-10"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Cor e Identidade</Label>
                <div className="grid grid-cols-6 gap-2 p-1 section-muted-subtle rounded-xl">
                  {PREDEFINED_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setColor(c.value)}
                      className={cn(
                        "aspect-square rounded-lg transition-all duration-200 border-2 flex items-center justify-center",
                        color === c.value 
                          ? "border-primary ring-2 ring-primary/20 scale-105 shadow-sm" 
                          : "border-transparent hover:scale-105 opacity-80 hover:opacity-100",
                        c.bg
                      )}
                      title={c.name}
                    >
                      {color === c.value && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase text-muted-foreground/60 font-bold tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" /> Visibilidade
              </Label>
              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-2 custom-scrollbar p-3 section-muted rounded-xl">
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-primary/5 transition-colors cursor-pointer group">
                  <Checkbox 
                    id="all-projects" 
                    checked={selectedProjects.length === 0}
                    onCheckedChange={(v) => v ? setSelectedProjects([]) : null}
                  />
                  <Label htmlFor="all-projects" className="text-sm font-semibold group-hover:text-primary transition-colors cursor-pointer">Todos os projetos</Label>
                </div>
                {projects?.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors ml-4">
                    <Checkbox 
                      id={`p-${p.id}`} 
                      checked={selectedProjects.includes(p.id)}
                      onCheckedChange={(v) => {
                        if (v) setSelectedProjects([...selectedProjects, p.id])
                        else setSelectedProjects(selectedProjects.filter(id => id !== p.id))
                      }}
                    />
                    <Label htmlFor={`p-${p.id}`} className="text-xs font-medium truncate opacity-70 cursor-pointer">{p.title}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-primary/5">
            <Label className="text-xs uppercase text-primary/60 font-bold tracking-widest flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Automações Simultâneas
            </Label>

            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                confirmBeforeExecute ? 'border-primary/25 bg-primary/5' : 'section-muted-subtle border-transparent'
              )}
            >
              <Checkbox
                id="confirmBeforeExecute"
                checked={confirmBeforeExecute}
                onCheckedChange={(v) => setConfirmBeforeExecute(!!v)}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex min-w-0 flex-1 cursor-help items-center gap-1.5">
                    <Label htmlFor="confirmBeforeExecute" className="text-sm font-medium cursor-pointer leading-snug">
                      Confirmação antes de aplicar
                    </Label>
                    <HelpCircle
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  Abre o mesmo diálogo de conclusão (notas, anexos, checklist) antes de rodar as automações do
                  botão.
                </TooltipContent>
              </Tooltip>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={cn("flex flex-col gap-3 p-3 rounded-lg border transition-colors", actionStatus ? "bg-primary/5 border-primary/20" : "section-muted-subtle border-transparent")}>
                <div className="flex items-center gap-3">
                  <Checkbox id="actionStatus" checked={actionStatus} onCheckedChange={(v) => setActionStatus(!!v)} />
                  <Label htmlFor="actionStatus" className="text-sm font-medium cursor-pointer">Mudar status</Label>
                </div>
                {actionStatus && (
                  <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as SubtaskStatus)}>
                    <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">A Fazer</SelectItem>
                      <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                      <SelectItem value="COMPLETED_PENDING">Concluído (Aguardando)</SelectItem>
                      <SelectItem value="APPROVED">Aprovado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors h-fit", actionCompleteMain ? "bg-rose-500/5 border-rose-500/20" : "section-muted-subtle border-transparent")}>
                <Checkbox id="actionCompleteMain" checked={actionCompleteMain} onCheckedChange={(v) => setActionCompleteMain(!!v)} />
                <Label htmlFor="actionCompleteMain" className="text-sm font-medium cursor-pointer">Finalizar projeto/pai</Label>
              </div>

              <div className={cn("flex flex-col gap-3 p-3 rounded-lg border transition-colors md:col-span-2", actionComment ? "bg-info/5 border-info/20" : "section-muted-subtle border-transparent")}>
                <div className="flex items-center gap-3">
                  <Checkbox id="actionComment" checked={actionComment} onCheckedChange={(v) => setActionComment(!!v)} />
                  <Label htmlFor="actionComment" className="text-sm font-medium cursor-pointer">Comentário automático</Label>
                </div>
                {actionComment && (
                  <Input 
                    className="bg-muted/30 border-primary/5 h-9" 
                    placeholder="Ex: Cliente aprovou o material."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                )}
              </div>

              <div
                className={cn(
                  'flex flex-col gap-3 rounded-lg border p-3 transition-colors md:col-span-2',
                  actionWebhook ? 'border-amber-500/25 bg-amber-500/[0.06]' : 'section-muted-subtle border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="actionWebhook"
                    checked={actionWebhook}
                    onCheckedChange={(v) => {
                      const on = !!v
                      setActionWebhook(on)
                      if (!on) setWebhookUrl('')
                    }}
                  />
                  <Label htmlFor="actionWebhook" className="cursor-pointer text-sm font-medium">
                    Webhook externo
                  </Label>
                </div>
                {actionWebhook ? (
                  <div className="space-y-2 pl-1 sm:pl-9">
                    <Label htmlFor="webhook-url" className="text-xs text-muted-foreground">
                      URL de destino
                    </Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="https://…"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="h-9 border-primary/10 bg-background/80 font-mono text-sm"
                    />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      POST JSON com o evento <span className="font-mono text-foreground/80">smartbutton.clicked</span>
                      (mesmo formato dos webhooks nas integrações).
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || !name}>
            {isPending ? <LoadingSpinner size="sm" className="page-loading-inline" /> : (button ? 'Salvar Configuração' : 'Ativar Botão')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
