'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'
import { ServiceRejectionDialog } from '@/components/service-rejection-dialog'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, XCircle, Search } from 'lucide-react'
import { LoadingSpinner } from '@/components/loading-spinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function GestorPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [showRejectionDialog, setShowRejectionDialog] = useState(false)

  const { data: pendingServices = [], refetch: refetchPending, isLoading } = api.servicePayment.listPending.useQuery(
    undefined,
    { enabled: !!session?.user?.activeAccountId }
  )

  const approveService = api.servicePayment.approve.useMutation({
    onSuccess: () => {
      refetchPending()
      toast.success('Aprovado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const rejectService = api.servicePayment.reject.useMutation({
    onSuccess: () => {
      refetchPending()
      setShowRejectionDialog(false)
      setSelectedService(null)
      toast.success('Recusado')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleApprove = async (id: string) => {
    await approveService.mutateAsync({ id })
  }

  const handleReject = (service: any) => {
    setSelectedService(service)
    setShowRejectionDialog(true)
  }

  const handleConfirmRejection = async (reason: string) => {
    if (!selectedService) return
    await rejectService.mutateAsync({ id: selectedService.id, reason })
  }

  const filteredServices = useMemo(() => {
    if (!searchTerm.trim()) return pendingServices
    const q = searchTerm.toLowerCase()
    return pendingServices.filter(
      (s) =>
        s.description.toLowerCase().includes(q) ||
        s.supplier?.name.toLowerCase().includes(q)
    )
  }, [pendingServices, searchTerm])

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  if (!session?.user) {
    return <LoadingSpinner className="min-h-[50vh]" text="Carregando..." />
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Aprovação</h1>
        <p className="text-muted-foreground">Serviços pendentes de aprovação</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSpinner className="py-12" text="Carregando..." />
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Nenhum serviço pendente</p>
              <p className="text-xs text-muted-foreground">
                {searchTerm ? 'Tente outro termo de pesquisa' : 'Tudo em dia'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="max-w-[200px] truncate" title={service.description}>
                      {service.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {service.supplier?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(service.value)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(service.serviceDate), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-success hover:bg-success/10 hover:text-success"
                          onClick={() => handleApprove(service.id)}
                          disabled={approveService.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleReject(service)}
                          disabled={rejectService.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ServiceRejectionDialog
        isOpen={showRejectionDialog}
        onClose={() => {
          setShowRejectionDialog(false)
          setSelectedService(null)
        }}
        onConfirm={handleConfirmRejection}
        serviceName={selectedService?.description ?? ''}
        isLoading={rejectService.isPending}
      />
    </div>
  )
}
