'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { MoreHorizontal, Edit, Trash2, Mail, Phone, MapPin, Users, Copy } from 'lucide-react'
import { ClientForm } from './client-form'

export function ClientList() {
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  })
  const [viewingClient, setViewingClient] = useState<{
    id: string
    name: string
    phone?: string | null
    email?: string | null
    address?: string | null
    customValues?: string | null
  } | null>(null)

  const { data, isLoading } = api.clients.list.useQuery()
  const utils = api.useUtils()

  const deleteMutation = api.clients.delete.useMutation({
    onSuccess: () => {
      toast.success('Contato deletado')
      utils.clients.list.invalidate()
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

  const clients = data?.clients || []

  if (clients.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nenhum contato ainda</h3>
          <p className="text-muted-foreground text-center max-w-sm">
            Comece adicionando seu primeiro contato pelo botão acima para organizar contatos, histórico e informações personalizadas
          </p>
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
                <TableHead>Contato</TableHead>
                <TableHead>Endereço</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client: (typeof clients)[number]) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setViewingClient(client)}
                >
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {client.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {client.phone}
                        </div>
                      )}
                      {client.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {client.email}
                        </div>
                      )}
                      {!client.phone && !client.email && (
                        <span className="text-sm text-muted-foreground italic">Sem contato</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {client.address ? (
                      <div className="flex items-start gap-2 text-sm max-w-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{client.address}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground italic">Sem endereço</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(client.id)
                            toast.success('ID do contato copiado!')
                          }}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar ID
                        </DropdownMenuItem>
                        <ClientForm
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          }
                          client={client}
                        />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog({ isOpen: true, id: client.id })}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ClientForm
        client={viewingClient ?? undefined}
        open={!!viewingClient}
        onOpenChange={(open) => !open && setViewingClient(null)}
      />

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar este contato? Esta ação não pode ser desfeita.
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
