'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { Building2, X } from 'lucide-react'

interface UserDepartmentsManagerProps {
  userId: string
}

export function UserDepartmentsManager({ userId }: UserDepartmentsManagerProps) {
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')

  const { data: departments } = api.department.getAll.useQuery()
  const { data: userDepartments } = api.department.getUserDepartmentsById.useQuery({ userId })
  const utils = api.useUtils()

  // Buscar setores do usuário específico
  const userDepartmentIds = userDepartments?.map((d) => d.id) || []
  const availableDepartments = departments?.filter((d) => !userDepartmentIds.includes(d.id))

  const addUserMutation = api.department.addUser.useMutation({
    onSuccess: () => {
      toast.success('Usuário adicionado ao setor')
      utils.department.getUserDepartmentsById.invalidate({ userId })
      setSelectedDepartmentId('')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeUserMutation = api.department.removeUser.useMutation({
    onSuccess: () => {
      toast.success('Usuário removido do setor')
      utils.department.getUserDepartmentsById.invalidate({ userId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleAddDepartment = () => {
    if (!selectedDepartmentId) {
      toast.error('Selecione um setor')
      return
    }

    addUserMutation.mutate({
      departmentId: selectedDepartmentId,
      userId,
    })
  }

  const handleRemoveDepartment = (departmentId: string) => {
    removeUserMutation.mutate({
      departmentId,
      userId,
    })
  }

  return (
    <div className="space-y-4">
      {/* Adicionar setor */}
      <div className="flex gap-2">
        <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecionar setor..." />
          </SelectTrigger>
            <SelectContent>
              {availableDepartments && availableDepartments.length > 0 ? (
                availableDepartments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhum setor disponível
                </div>
              )}
            </SelectContent>
        </Select>
        <Button onClick={handleAddDepartment} disabled={!selectedDepartmentId || addUserMutation.isPending}>
          Adicionar
        </Button>
      </div>

      {/* Lista de setores */}
      <div className="space-y-2">
        {userDepartments && userDepartments.length > 0 ? (
          userDepartments.map((dept) => (
            <div
              key={dept.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <Badge variant="secondary" className="flex items-center gap-2">
                <Building2 className="h-3 w-3" />
                {dept.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveDepartment(dept.id)}
                disabled={removeUserMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Usuário não está em nenhum setor
          </p>
        )}
      </div>
    </div>
  )
}

