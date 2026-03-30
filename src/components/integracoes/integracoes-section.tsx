'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Key, Plus, Trash2, Copy, ExternalLink, Shield } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function IntegracoesSection() {
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  })

  const utils = api.useUtils()
  const { data } = api.apiKey.list.useQuery()
  const apiKeys = data?.keys ?? []
  const accountId = data?.accountId ?? ''
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const createMutation = api.apiKey.create.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.api_key)
      toast.success('API Key criada! Copie e guarde.')
      utils.apiKey.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.apiKey.delete.useMutation({
    onSuccess: () => {
      toast.success('API Key revogada')
      utils.apiKey.list.invalidate()
      setDeleteDialog({ isOpen: false })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    createMutation.mutate({ name: newName.trim() })
  }

  const handleCloseCreate = () => {
    setCreateOpen(false)
    setNewName('')
    setCreatedKey(null)
  }

  const handleOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) handleCloseCreate()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {accountId && (
          <div className="flex flex-col gap-2 p-4 rounded-lg bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Shield className="h-4 w-4" />
              Identificador da Conta
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background/50 px-2 py-1 rounded flex-1 font-mono">
                {accountId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-primary hover:bg-primary/10"
                onClick={() => {
                  navigator.clipboard.writeText(accountId)
                  toast.success('ID copiado')
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Chaves de API Ativas</h4>
            <p className="text-xs text-muted-foreground">Autentique requisições externas usando estas chaves.</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Chave
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova API Key</DialogTitle>
              </DialogHeader>
              {createdKey ? (
                <div className="space-y-4 pt-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ Copie agora. Esta chave não será exibida novamente por motivos de segurança.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input value={createdKey} readOnly className="font-mono text-xs flex-1 bg-muted" />
                    <Button
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(createdKey)
                        toast.success('Token copiado!')
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={handleCloseCreate}>
                    Concluído
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">Nome da Chave</Label>
                    <Input
                      id="key-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Integração N8N"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={handleCloseCreate}>
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Criando...' : 'Gerar Chave'}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border bg-background/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Último Uso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground text-xs italic">
                  Nenhuma chave de API gerada.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((k) => (
                <TableRow key={k.id} className="group transition-colors">
                  <TableCell className="font-medium flex items-center gap-2">
                    <Key className="h-3 w-3 opacity-40" />
                    {k.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-[10px] bg-muted/30">
                      {k.lastUsedAt ? formatDistanceToNow(new Date(k.lastUsedAt), { addSuffix: true, locale: ptBR }) : 'Nunca'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setDeleteDialog({ isOpen: true, id: k.id })}
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

      <div className="pt-2">
        <a
          href={`${baseUrl}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs text-primary hover:text-primary/80 font-medium transition-colors p-2 rounded-md hover:bg-primary/5 border border-primary/10"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Documentação Interativa (Swagger)
        </a>
      </div>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(o) => setDeleteDialog({ isOpen: o })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar API Key</AlertDialogTitle>
            <AlertDialogDescription>
              A chave <span className="font-semibold text-foreground">{apiKeys.find(k => k.id === deleteDialog.id)?.name}</span> será invalidada permanentemente. Todas as integrações usando esta chave pararão de funcionar imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.id && deleteMutation.mutate({ id: deleteDialog.id })}
              className="bg-destructive hover:bg-destructive/90 text-white border-none"
            >
              Sim, revogar chave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
