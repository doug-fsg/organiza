'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { MoreHorizontal, Edit, Trash2, Users, FolderKanban } from 'lucide-react'
import { DepartmentForm } from './department-form'
import { useState } from 'react'

interface DepartmentListProps {
  onSelectDepartment?: (departmentId: string) => void
}

export function DepartmentList({ onSelectDepartment }: DepartmentListProps) {
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  })

  const { data: departments, isLoading } = api.department.getAll.useQuery()
  const utils = api.useUtils()

  const deleteMutation = api.department.delete.useMutation({
    onSuccess: () => {
      toast.success('Setor deletado')
      utils.department.getAll.invalidate()
      setDeleteDialog({ isOpen: false })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  if (isLoading) {
    return (
      <div className="page-loading-inline h-96">
        <div className="app-spinner-md" />
      </div>
    )
  }

  if (!departments || departments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Nenhum setor criado</p>
          <DepartmentForm />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Usuários</TableHead>
                <TableHead>Projetos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((department) => (
                <TableRow key={department.id}>
                  <TableCell className="font-medium">{department.name}</TableCell>
                  <TableCell>
                    {department.description ? (
                      <span className="text-sm text-muted-foreground">{department.description}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sem descrição</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <Users className="h-3 w-3" />
                      {department._count.departmentUsers}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="flex items-center gap-1 w-fit">
                      <FolderKanban className="h-3 w-3" />
                      {department._count.departmentTasks}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onSelectDepartment && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectDepartment(department.id)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Usuários
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DepartmentForm
                            trigger={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            }
                            department={department}
                          />
                          <DropdownMenuItem
                            onClick={() => setDeleteDialog({ isOpen: true, id: department.id })}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este setor? Esta ação não pode ser desfeita.
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
    </>
  )
}

