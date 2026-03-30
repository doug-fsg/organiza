'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus, FolderKanban, Upload, X, FileText, Image as ImageIcon, Copy } from 'lucide-react'
import { CustomAttributeType, MainTaskStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

interface ClientFormProps {
  trigger?: React.ReactNode
  client?: {
    id: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
    customValues?: string | null
  }
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ClientForm({ trigger, client, onSuccess, open: controlledOpen, onOpenChange }: ClientFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const setIsOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen
  const [name, setName] = useState(client?.name || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [email, setEmail] = useState(client?.email || '')
  const [address, setAddress] = useState(client?.address || '')
  const [customValues, setCustomValues] = useState<Record<string, any>>({})

  const utils = api.useUtils()

  const { data: customAttributes = [] } = api.clientCustomAttribute.getAll.useQuery(undefined, {
    enabled: isOpen,
  })

  const { data: linkedTasks = [] } = api.mainTask.getAll.useQuery(
    { clientId: client?.id },
    { enabled: isOpen && !!client?.id }
  )

  useEffect(() => {
    if (client) {
      setName(client.name || '')
      setPhone(client.phone || '')
      setEmail(client.email || '')
      setAddress(client.address || '')
      if (client.customValues) {
        try {
          const parsed = JSON.parse(client.customValues)
          setCustomValues(parsed)
        } catch (e) {
          setCustomValues({})
        }
      } else {
        setCustomValues({})
      }
    }
  }, [client])

  const createMutation = api.clients.create.useMutation({
    onSuccess: () => {
      toast.success('Contato criado com sucesso')
      utils.clients.list.invalidate()
      setIsOpen(false)
      resetForm()
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.clients.update.useMutation({
    onSuccess: () => {
      toast.success('Contato atualizado com sucesso')
      utils.clients.list.invalidate()
      setIsOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setAddress('')
    setCustomValues({})
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      customValues: Object.keys(customValues).length > 0 ? customValues : undefined,
    }

    if (client) {
      updateMutation.mutate({
        id: client.id,
        ...data,
      })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleFileUpload = async (
    attrId: string,
    files: FileList
  ) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    try {
      const formData = new FormData()
      fileArray.forEach((f) => formData.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro no upload')
      }
      const data = await res.json()
      const current = customValues[attrId]
      const existing = Array.isArray(current) ? current : []
      const merged = [...existing, ...data.files]
      setCustomValues({ ...customValues, [attrId]: merged })
      toast.success(`${data.files.length} arquivo(s) anexado(s)`)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao fazer upload')
    }
  }

  const removeFileFromAttr = (attrId: string, index: number) => {
    const current = customValues[attrId]
    const arr = Array.isArray(current) ? [...current] : []
    arr.splice(index, 1)
    setCustomValues({ ...customValues, [attrId]: arr.length > 0 ? arr : undefined })
  }

  const renderCustomField = (attr: any) => {
    const value = customValues[attr.id] ?? ''

    switch (attr.type) {
      case CustomAttributeType.FILE: {
        const files = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {files.map((f: { fileName: string; filePath: string; fileSize?: number; mimeType?: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted text-sm"
                >
                  {f.mimeType?.startsWith('image/') ? (
                    <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <a
                    href={f.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={f.fileName}
                    className="hover:underline"
                  >
                    {files.length > 1 ? `Anexo ${i + 1}` : 'Anexo'}
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => removeFileFromAttr(attr.id, i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                id={`file-${attr.id}`}
                className="hidden"
                multiple
                accept="*/*"
                onChange={(e) => {
                  const fs = e.target.files
                  if (fs?.length) {
                    handleFileUpload(attr.id, fs)
                    e.target.value = ''
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById(`file-${attr.id}`)?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Anexar arquivos
              </Button>
            </div>
          </div>
        )
      }
      case CustomAttributeType.TEXT:
        return (
          <Input
            value={value}
            onChange={(e) => setCustomValues({ ...customValues, [attr.id]: e.target.value })}
            placeholder={`Digite ${attr.name.toLowerCase()}`}
          />
        )
      case CustomAttributeType.NUMBER:
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setCustomValues({ ...customValues, [attr.id]: e.target.value })}
            placeholder={`Digite ${attr.name.toLowerCase()}`}
          />
        )
      case CustomAttributeType.DATE:
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setCustomValues({ ...customValues, [attr.id]: e.target.value })}
          />
        )
      case CustomAttributeType.BOOLEAN:
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => setCustomValues({ ...customValues, [attr.id]: checked })}
            />
            <span className="text-sm text-muted-foreground">Sim</span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {(!isControlled || trigger) && (
        <DialogTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="w-[90vw] !max-w-[90vw] sm:!max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          {client?.id && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">ID:</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate max-w-[200px]">
                {client.id}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  navigator.clipboard.writeText(client.id)
                  toast.success('ID copiado!')
                }}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados básicos em 2 colunas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome do contato"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Endereço completo"
                rows={3}
              />
            </div>
          </div>

          {customAttributes.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold">Campos Personalizados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customAttributes.map((attr) => (
                  <div
                    key={attr.id}
                    className={`space-y-2 ${attr.type === CustomAttributeType.FILE ? 'md:col-span-2' : ''}`}
                  >
                    <Label htmlFor={`custom-${attr.id}`}>{attr.name}</Label>
                    {renderCustomField(attr)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {client && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <FolderKanban className="h-4 w-4" />
                Projetos vinculados ({linkedTasks.length})
              </h3>
              {linkedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum projeto vinculado</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-md border p-2">
                  {linkedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-2 py-2 px-3 rounded bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <span className="font-medium text-sm truncate">{task.title}</span>
                      <Badge
                        variant="outline"
                        className="text-xs shrink-0"
                      >
                        {task.status === MainTaskStatus.NOT_STARTED && 'Não iniciado'}
                        {task.status === MainTaskStatus.IN_PROGRESS && 'Em andamento'}
                        {task.status === MainTaskStatus.COMPLETED && 'Concluído'}
                        {task.status === MainTaskStatus.CANCELLED && 'Cancelado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {client ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
