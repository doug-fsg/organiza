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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UserPlus, 
  Mail, 
  Trash2, 
  Shield, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Users
} from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const { data: invites, isLoading: loadingInvites } = api.userManagement.listInvites.useQuery()

  // Mutations
  const inviteUser = api.userManagement.invite.useMutation({
    onSuccess: () => {
      toast.success('Convite enviado com sucesso!')
      setIsInviteDialogOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInviteRole(UserRole.MEMBER)
      utils.userManagement.listInvites.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const cancelInvite = api.userManagement.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success('Convite cancelado')
      utils.userManagement.listInvites.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const resendInvite = api.userManagement.resendInvite.useMutation({
    onSuccess: () => {
      toast.success('Convite reenviado!')
      utils.userManagement.listInvites.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const updateRole = api.userManagement.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Role atualizada com sucesso!')
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

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.OWNER:
        return <Badge variant="default" className="bg-purple-600">Proprietário</Badge>
      case UserRole.ADMIN:
        return <Badge variant="default" className="bg-blue-600">Administrador</Badge>
      case UserRole.MANAGER:
        return <Badge variant="default" className="bg-green-600">Gerente</Badge>
      case UserRole.MEMBER:
        return <Badge variant="secondary">Membro</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
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
      default:
        return role
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
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
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {inviteRole === UserRole.ADMIN && '• Acesso total ao sistema'}
                  {inviteRole === UserRole.MANAGER && '• Pode gerenciar tarefas e aprovar subtarefas'}
                  {inviteRole === UserRole.MEMBER && '• Acesso básico para executar tarefas'}
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

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Usuários Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invites?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Convites Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {users?.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.OWNER).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Administradores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            Usuários ({users?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="invites">
            Convites Pendentes ({invites?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Lista de Usuários */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos</CardTitle>
              <CardDescription>
                Gerencie as permissões e acesso dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                </div>
              ) : users && users.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Membro desde</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {user.emailVerified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Ativo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                              <Clock className="mr-1 h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {user.id !== currentUserId && (
                              <>
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
                                  </SelectContent>
                                </Select>

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
                              </>
                            )}
                            {user.id === currentUserId && (
                              <span className="text-sm text-muted-foreground italic">
                                Você
                              </span>
                            )}
                          </div>
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
        </TabsContent>

        {/* Lista de Convites */}
        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>Convites Pendentes</CardTitle>
              <CardDescription>
                Convites enviados aguardando aceitação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvites ? (
                <div className="text-center py-8">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
                </div>
              ) : invites && invites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Expira em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.map((invite) => (
                      <TableRow key={invite.id}>
                        <TableCell className="font-medium">{invite.name}</TableCell>
                        <TableCell>{invite.email}</TableCell>
                        <TableCell>{getRoleBadge(invite.role)}</TableCell>
                        <TableCell>
                          {format(new Date(invite.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invite.expiresAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resendInvite.mutate({ inviteId: invite.id })}
                              disabled={resendInvite.isPending}
                              title="Reenviar convite"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Cancelar convite para ${invite.email}?`)) {
                                  cancelInvite.mutate({ inviteId: invite.id })
                                }
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum convite pendente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


