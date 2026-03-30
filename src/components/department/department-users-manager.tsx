'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { UserPlus, X } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface DepartmentUsersManagerProps {
  departmentId: string
}

export function DepartmentUsersManager({ departmentId }: DepartmentUsersManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data: department } = api.department.getById.useQuery({ id: departmentId })
  const { data: users } = api.user.getAll.useQuery()
  const utils = api.useUtils()

  const addUserMutation = api.department.addUser.useMutation({
    onSuccess: () => {
      toast.success('Usuário adicionado ao setor')
      utils.department.getById.invalidate({ id: departmentId })
      setSelectedUserId('')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeUserMutation = api.department.removeUser.useMutation({
    onSuccess: () => {
      toast.success('Usuário removido do setor')
      utils.department.getById.invalidate({ id: departmentId })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const availableUsers = users?.filter(
    (user) => !department?.departmentUsers.some((du) => du.user.id === user.id)
  )

  const handleAddUser = () => {
    if (!selectedUserId) {
      toast.error('Selecione um usuário')
      return
    }

    addUserMutation.mutate({
      departmentId,
      userId: selectedUserId,
    })
  }

  const handleRemoveUser = (userId: string) => {
    removeUserMutation.mutate({
      departmentId,
      userId,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Usuários do Setor</span>
          <Badge variant="outline">{department?.departmentUsers.length || 0}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Adicionar usuário */}
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecionar usuário..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers && availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Nenhum usuário disponível
                </div>
              )}
            </SelectContent>
          </Select>
          <Button onClick={handleAddUser} disabled={!selectedUserId || addUserMutation.isPending}>
            <UserPlus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {/* Lista de usuários */}
        <div className="space-y-2">
          {department?.departmentUsers.map((du) => (
            <div
              key={du.user.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {du.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{du.user.name}</p>
                  <p className="text-sm text-muted-foreground">{du.user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveUser(du.user.id)}
                disabled={removeUserMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {(!department?.departmentUsers || department.departmentUsers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum usuário atribuído a este setor
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

