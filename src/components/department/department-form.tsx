'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Plus } from 'lucide-react'

interface DepartmentFormProps {
  trigger?: React.ReactNode
  department?: {
    id: string
    name: string
    description?: string | null
  }
  onSuccess?: () => void
}

export function DepartmentForm({ trigger, department, onSuccess }: DepartmentFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState(department?.name || '')
  const [description, setDescription] = useState(department?.description || '')

  const utils = api.useUtils()

  const createMutation = api.department.create.useMutation({
    onSuccess: () => {
      toast.success('Setor criado com sucesso')
      utils.department.getAll.invalidate()
      setIsOpen(false)
      setName('')
      setDescription('')
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = api.department.update.useMutation({
    onSuccess: () => {
      toast.success('Setor atualizado com sucesso')
      utils.department.getAll.invalidate()
      setIsOpen(false)
      onSuccess?.()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (department) {
      updateMutation.mutate({
        id: department.id,
        name,
        description,
      })
    } else {
      createMutation.mutate({
        name,
        description,
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Setor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Editar Setor' : 'Novo Setor'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Comercial, TI, Marketing..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do setor"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {department ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

