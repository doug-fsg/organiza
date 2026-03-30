'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Webhook, Plus, Trash2, ChevronDown, Link2, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { WEBHOOK_EVENTS } from '@/lib/webhook-events'

const CATEGORY_LABELS: Record<keyof typeof WEBHOOK_EVENTS, string> = {
  task: 'Tarefas',
  project: 'Projetos',
  client: 'Clientes',
  service_payment: 'Pagamentos',
  comment: 'Comentários',
}

export function WebhooksSection() {
  const [createOpen, setCreateOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [secret, setSecret] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  })

  const utils = api.useUtils()
  const { data } = api.webhook.list.useQuery()
  const webhooks = data?.webhooks ?? []

  const createMutation = api.webhook.create.useMutation({
    onSuccess: () => {
      toast.success('Webhook criado!')
      utils.webhook.list.invalidate()
      handleCloseCreate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success('Webhook excluído')
      utils.webhook.list.invalidate()
      setDeleteDialog({ isOpen: false })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    if (selectedEvents.length === 0) {
      toast.error('Selecione pelo menos um evento')
      return
    }
    createMutation.mutate({
      url: url.trim(),
      name: name.trim() || undefined,
      events: selectedEvents,
      secret: secret.trim() || undefined,
    })
  }

  const handleCloseCreate = () => {
    setCreateOpen(false)
    setUrl('')
    setName('')
    setSelectedEvents([])
    setSecret('')
  }

  const handleOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) handleCloseCreate()
  }

  const toggleEvent = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId]
    )
  }

  const toggleCategory = (category: keyof typeof WEBHOOK_EVENTS) => {
    const events = WEBHOOK_EVENTS[category].map((e) => e.id)
    const allSelected = events.every((e) => selectedEvents.includes(e))
    setSelectedEvents((prev) =>
      allSelected
        ? prev.filter((e) => !events.includes(e))
        : [...new Set([...prev, ...events])]
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            Configurações de Webhook
          </h4>
          <p className="text-xs text-muted-foreground">
            Receba notificações em tempo real. Configure uma URL e selecione os eventos.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Webhook</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="webhook-url">URL de Destino *</Label>
                  <Input
                    id="webhook-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://sua-api.com/webhook"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name">Nome Amigável</Label>
                    <Input
                      id="webhook-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: n8n Workflow"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-secret">Secret HMAC (opcional)</Label>
                    <Input
                      id="webhook-secret"
                      type="password"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="Para validação"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm">Assinar Eventos *</Label>
                <div className="border rounded-lg bg-muted/20 overflow-hidden divide-y">
                  {(Object.keys(WEBHOOK_EVENTS) as Array<keyof typeof WEBHOOK_EVENTS>).map(
                    (category) => (
                      <Collapsible key={category} defaultOpen>
                        <CollapsibleTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between h-10 px-3 hover:bg-muted/50 rounded-none"
                          >
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {CATEGORY_LABELS[category]}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-3 space-y-2 bg-background/50">
                            <div className="grid grid-cols-1 gap-2">
                              {WEBHOOK_EVENTS[category].map((event) => (
                                <div
                                  key={event.id}
                                  className="flex items-center space-x-2 p-1 hover:bg-muted/30 rounded transition-colors"
                                >
                                  <Checkbox
                                    id={event.id}
                                    checked={selectedEvents.includes(event.id)}
                                    onCheckedChange={() => toggleEvent(event.id)}
                                  />
                                  <label
                                    htmlFor={event.id}
                                    className="text-sm font-medium leading-none cursor-pointer select-none"
                                  >
                                    {event.label}
                                  </label>
                                </div>
                              ))}
                            </div>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-[10px] text-primary"
                              onClick={() => toggleCategory(category)}
                            >
                              {WEBHOOK_EVENTS[category].every((e) =>
                                selectedEvents.includes(e.id)
                              )
                                ? 'Desmarcar todos desta categoria'
                                : 'Selecionar todos desta categoria'}
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={handleCloseCreate}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending || selectedEvents.length === 0}
                >
                  {createMutation.isPending ? 'Criando...' : 'Ativar Webhook'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border bg-background/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Webhook</TableHead>
              <TableHead>Assinaturas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs italic">
                  Nenhum webhook configurado.
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((w) => (
                <TableRow key={w.id} className="group transition-colors">
                  <TableCell className="max-w-[200px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm flex items-center gap-2">
                        <Link2 className="h-3 w-3 opacity-40" />
                        {w.name || 'Integração'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate" title={w.url}>
                        {w.url}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal text-[10px]">
                      {w.events.length} eventos
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(w.createdAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteDialog({ isOpen: true, id: w.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(o) => setDeleteDialog({ isOpen: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook</AlertDialogTitle>
            <AlertDialogDescription>
              O envio de notificações para <span className="font-semibold text-foreground">{webhooks.find(w => w.id === deleteDialog.id)?.url}</span> será interrompido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && deleteMutation.mutate({ id: deleteDialog.id })}
              className="bg-destructive hover:bg-destructive/90 text-white border-none"
            >
              Sim, excluir webhook
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
