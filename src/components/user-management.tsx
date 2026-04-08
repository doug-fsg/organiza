'use client'

import { useState } from 'react'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  UserPlus, 
  Trash2, 
  CheckCircle2,
  Clock,
  Users
} from 'lucide-react'
import { UserDepartmentsSelect } from './user-management/user-departments-select'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { getRoleBadgeClasses } from '@/lib/theme-utils'

interface UserManagementProps {
  currentUserId: string
}

export function UserManagement({ currentUserId }: UserManagementProps) {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.MEMBER)
  
  const utils = api.useUtils()

  // Queries
  const { data: users, isLoading: loadingUsers } = api.userManagement.list.useQuery()

  // Mutations
  const inviteUser = api.userManagement.invite.useMutation({
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!')
      setIsInviteDialogOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInviteRole(UserRole.MEMBER)
      utils.userManagement.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateRole = api.userManagement.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Permissão atualizada com sucesso!')
      utils.userManagement.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeUser = api.userManagement.remove.useMutation({
    onSuccess: () => {
      toast.success('Usuário removido')
      utils.userManagement.list.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleInvite = async () => {
    if (!inviteName || !inviteEmail) {
      toast.error('Preencha todos os campos')
      return
    }

    inviteUser.mutate({
      name: inviteName,
      email: inviteEmail,
      role: inviteRole,
    })
  }

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return 'Proprietário'
      case UserRole.ADMIN:
        return 'Administrador'
      case UserRole.MANAGER:
        return 'Gerente'
      case UserRole.MEMBER:
        return 'Membro'
      case UserRole.SUPPLIER:
        return 'Fornecedor'
      case UserRole.FINANCIAL:
        return 'Financeiro'
      default:
        return role
    }
  }

  const getRoleBadge = (role: UserRole) => {
    return (
      <Badge variant="outline" className={getRoleBadgeClasses(role, 'solid')}>
        {getRoleLabel(role)}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight leading-tight text-foreground">
            Gerenciamento de Usuários
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os membros da sua equipe
          </p>
        </div>
        
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar Novo Usuário</DialogTitle>
              <DialogDescription>
                Um email será enviado com instruções para criar a senha
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="João Silva"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="joao@exemplo.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Função</Label>
                <Select 
                  value={inviteRole} 
                  onValueChange={(value) => setInviteRole(value as UserRole)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.MEMBER}>Membro</SelectItem>
                    <SelectItem value={UserRole.MANAGER}>Gerente</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                    <SelectItem value={UserRole.SUPPLIER}>Fornecedor</SelectItem>
                    <SelectItem value={UserRole.FINANCIAL}>Financeiro</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteRole === UserRole.ADMIN && '• Acesso total ao sistema'}
                  {inviteRole === UserRole.MANAGER && '• Pode gerenciar projetos e aprovar tarefas'}
                  {inviteRole === UserRole.MEMBER && '• Acesso básico para executar tarefas'}
                  {inviteRole === UserRole.SUPPLIER && '• Cadastra serviços e acompanha pagamentos'}
                  {inviteRole === UserRole.FINANCIAL && '• Gerencia pagamentos aprovados'}
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteUser.isPending}
              >
                {inviteUser.isPending ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Usuários */}
      <Card>
        <CardContent>
          {loadingUsers ? (
            <div className="text-center py-8">
              <div className="app-spinner-md" />
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setores</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.id !== currentUserId ? (
                        <Select
                          value={user.role}
                          onValueChange={(role) => {
                            updateRole.mutate({
                              userId: user.id,
                              role: role as UserRole,
                            })
                          }}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UserRole.MEMBER}>Membro</SelectItem>
                            <SelectItem value={UserRole.MANAGER}>Gerente</SelectItem>
                            <SelectItem value={UserRole.ADMIN}>Administrador</SelectItem>
                            <SelectItem value={UserRole.SUPPLIER}>Fornecedor</SelectItem>
                            <SelectItem value={UserRole.FINANCIAL}>Financeiro</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getRoleBadge(user.role)
                      )}
                    </TableCell>
                    <TableCell>
                      {user.id !== currentUserId ? (
                        <UserDepartmentsSelect
                          userId={user.id}
                          currentDepartmentIds={user.departments?.map(d => d.id) || []}
                          onUpdate={() => utils.userManagement.list.invalidate()}
                        />
                      ) : (
                        user.departments && user.departments.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.departments.map((dept) => (
                              <Badge key={dept.id} variant="secondary" className="text-xs">
                                {dept.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nenhum setor</span>
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-status-pending text-status-pending-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover ${user.name}?`)) {
                              removeUser.mutate({ userId: user.id })
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


