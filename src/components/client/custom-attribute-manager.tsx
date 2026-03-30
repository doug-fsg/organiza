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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Settings, Plus, Trash2, Type, Hash, Calendar as CalendarIcon, CheckSquare, Paperclip, Copy } from 'lucide-react'
import { CustomAttributeType } from '@prisma/client'

export function CustomAttributeManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newAttrName, setNewAttrName] = useState('')
  const [newAttrType, setNewAttrType] = useState<CustomAttributeType>(CustomAttributeType.TEXT)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  })
  const [deleteBulkDialog, setDeleteBulkDialog] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const utils = api.useUtils()
  const { data: attributes = [], isLoading } = api.clientCustomAttribute.getAll.useQuery(undefined, {
    enabled: isOpen,
  })

  const createMutation = api.clientCustomAttribute.create.useMutation({
    onSuccess: () => {
      toast.success('Atributo criado com sucesso')
      utils.clientCustomAttribute.getAll.invalidate()
      setIsAdding(false)
      setNewAttrName('')
      setNewAttrType(CustomAttributeType.TEXT)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = api.clientCustomAttribute.delete.useMutation({
    onSuccess: () => {
      toast.success('Atributo deletado')
      utils.clientCustomAttribute.getAll.invalidate()
      setDeleteDialog({ isOpen: false })
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (deleteDialog.id) next.delete(deleteDialog.id)
        return next
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteBulkMutation = api.clientCustomAttribute.deleteBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} atributo(s) excluído(s)`)
      utils.clientCustomAttribute.getAll.invalidate()
      setDeleteBulkDialog(false)
      setSelectedIds(new Set())
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      name: newAttrName,
      type: newAttrType,
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === attributes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(attributes.map((a) => a.id)))
    }
  }

  const handleDeleteBulk = () => {
    deleteBulkMutation.mutate({ ids: Array.from(selectedIds) })
  }

  const getTypeIcon = (type: CustomAttributeType) => {
    switch (type) {
      case CustomAttributeType.TEXT:
        return <Type className="h-3 w-3" />
      case CustomAttributeType.NUMBER:
        return <Hash className="h-3 w-3" />
      case CustomAttributeType.DATE:
        return <CalendarIcon className="h-3 w-3" />
      case CustomAttributeType.BOOLEAN:
        return <CheckSquare className="h-3 w-3" />
      case CustomAttributeType.FILE:
        return <Paperclip className="h-3 w-3" />
    }
  }

  const getTypeLabel = (type: CustomAttributeType) => {
    switch (type) {
      case CustomAttributeType.TEXT:
        return 'Texto'
      case CustomAttributeType.NUMBER:
        return 'Número'
      case CustomAttributeType.DATE:
        return 'Data'
      case CustomAttributeType.BOOLEAN:
        return 'Sim/Não'
      case CustomAttributeType.FILE:
        return 'Anexo'
    }
  }

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) setSelectedIds(new Set())
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Configurar Atributos
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-3xl max-h-[90vh] grid grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Atributos Personalizados</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto min-h-0 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="app-spinner-md" />
              </div>
            ) : (
              <>
                {attributes.length === 0 && !isAdding ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Nenhum atributo personalizado criado
                    </p>
                  </div>
                ) : (
                  <>
                    {attributes.length > 0 && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={
                                  attributes.length > 0 &&
                                  selectedIds.size === attributes.length
                                }
                                onCheckedChange={toggleSelectAll}
                                aria-label="Selecionar todos"
                              />
                            </TableHead>
                            <TableHead>Nome</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attributes.map((attr) => (
                            <TableRow key={attr.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedIds.has(attr.id)}
                                  onCheckedChange={() => toggleSelect(attr.id)}
                                  aria-label={`Selecionar ${attr.name}`}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{attr.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  {getTypeIcon(attr.type)}
                                  {getTypeLabel(attr.type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Copiar ID do atributo"
                                  onClick={() => {
                                    void navigator.clipboard.writeText(attr.id)
                                    toast.success('ID copiado')
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteDialog({ isOpen: true, id: attr.id })}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </>
                )}

                {isAdding && (
                  <form onSubmit={handleCreate} className="space-y-4 p-4 border rounded-lg">
                    <h3 className="font-semibold">Novo Atributo</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="attr-name">Nome</Label>
                        <Input
                          id="attr-name"
                          value={newAttrName}
                          onChange={(e) => setNewAttrName(e.target.value)}
                          placeholder="Ex: CNPJ, Empresa, etc."
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="attr-type">Tipo</Label>
                        <Select
                          value={newAttrType}
                          onValueChange={(value) => setNewAttrType(value as CustomAttributeType)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={CustomAttributeType.TEXT}>Texto</SelectItem>
                            <SelectItem value={CustomAttributeType.NUMBER}>Número</SelectItem>
                            <SelectItem value={CustomAttributeType.DATE}>Data</SelectItem>
                            <SelectItem value={CustomAttributeType.BOOLEAN}>Sim/Não</SelectItem>
                            <SelectItem value={CustomAttributeType.FILE}>Anexo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAdding(false)
                          setNewAttrName('')
                          setNewAttrType(CustomAttributeType.TEXT)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        Criar
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>

          {!isLoading && !isAdding && (
            <div className="pt-2 border-t shrink-0 flex gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteBulkDialog(true)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir selecionados ({selectedIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Limpar seleção
                  </Button>
                  <Button onClick={() => setIsAdding(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsAdding(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Atributo
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este atributo? Os valores deste atributo serão
              removidos de todos os contatos. Esta ação não pode ser desfeita.
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

      <AlertDialog
        open={deleteBulkDialog}
        onOpenChange={setDeleteBulkDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atributos em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} atributo(s)? Os valores serão
              removidos de todos os clientes. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteBulk()
              }}
              disabled={deleteBulkMutation.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteBulkMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
