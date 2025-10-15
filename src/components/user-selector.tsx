'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserRole } from '@prisma/client'
import { api } from '@/lib/api'

interface UserSelectorProps {
  onUserSelect: (user: { id: string; name: string; role: UserRole }) => void
}

export function UserSelector({ onUserSelect }: UserSelectorProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.MEMBER)

  const { data: users, refetch } = api.user.getAll.useQuery()
  const createUser = api.user.create.useMutation({
    onSuccess: (user) => {
      refetch()
      setIsCreating(false)
      setNewUserName('')
      setNewUserEmail('')
      setNewUserRole(UserRole.MEMBER)
      onUserSelect(user)
    },
  })

  const handleCreateUser = () => {
    if (newUserName && newUserEmail) {
      createUser.mutate({
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
      })
    }
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'Administrador'
      case UserRole.MANAGER:
        return 'Gerente'
      case UserRole.MEMBER:
        return 'Membro'
      default:
        return role
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Bem-vindo ao Organiza</CardTitle>
          <CardDescription>
            Selecione um usuário existente ou crie um novo para começar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCreating ? (
            <>
              <div className="space-y-2">
                <Label>Usuários Existentes</Label>
                {users?.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => onUserSelect(user)}
                  >
                    <div className="text-left">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {getRoleLabel(user.role)} • {user.email}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                + Criar Novo Usuário
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Digite o nome do usuário"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="Digite o email do usuário"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Papel</Label>
                <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                    <SelectItem value={UserRole.MANAGER}>Gerente</SelectItem>
                    <SelectItem value={UserRole.MEMBER}>Membro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleCreateUser}
                  disabled={!newUserName || !newUserEmail || createUser.isPending}
                  className="flex-1"
                >
                  {createUser.isPending ? 'Criando...' : 'Criar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
