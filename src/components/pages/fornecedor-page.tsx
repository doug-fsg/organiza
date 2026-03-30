'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import { ServicePaymentForm } from '@/components/service-payment-form'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, FileText, Download, Calendar, DollarSign, Clock, CheckCircle, XCircle, MoreHorizontal, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/loading-spinner'
import { ServicePaymentStatus } from '@prisma/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

type StatusOption = {
  value: string
  label: string
  status?: ServicePaymentStatus
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'all', label: 'Todos', status: undefined },
  { value: ServicePaymentStatus.PENDING, label: 'Pendentes', status: ServicePaymentStatus.PENDING },
  { value: ServicePaymentStatus.APPROVED, label: 'Aprovados', status: ServicePaymentStatus.APPROVED },
  { value: ServicePaymentStatus.PAID, label: 'Pagos', status: ServicePaymentStatus.PAID },
  { value: ServicePaymentStatus.REJECTED, label: 'Recusados', status: ServicePaymentStatus.REJECTED },
]

type ServicePayment = {
  id: string
  description: string
  value: number
  serviceDate: Date
  status: ServicePaymentStatus
  attachments?: { id: string; fileName: string }[]
  paymentReceipt?: { fileName: string; filePath: string } | null
  rejectionReason?: string | null
}

export default function FornecedorPage() {
  const { data: session } = useSession()
  const [showForm, setShowForm] = useState(false)
  const [showAddAnother, setShowAddAnother] = useState(false)
  const [filterValue, setFilterValue] = useState<string>('all')
  const utils = api.useUtils()
  
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear())

  const selectedStatus = filterValue === 'all' ? undefined : (filterValue as ServicePaymentStatus)

  const { data: services = [], refetch: refetchServices } = api.servicePayment.listMyServices.useQuery(
    { 
      status: selectedStatus,
      month: selectedMonth,
      year: selectedYear,
    },
    { enabled: !!session?.user?.activeAccountId }
  )

  const { data: stats } = api.servicePayment.getStats.useQuery(
    undefined,
    { enabled: !!session?.user?.activeAccountId }
  )

  const createService = api.servicePayment.create.useMutation({
    onSuccess: () => {
      refetchServices()
      setShowAddAnother(true)
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao cadastrar serviço')
    },
  })

  const handleCreateService = async (data: any) => {
    try {
      await createService.mutateAsync({
        description: data.description,
        value: parseFloat(data.value),
        serviceDate: data.serviceDate,
        attachments: data.attachments,
      })
    } catch {
      // Erro tratado no onError
    }
  }

  const handleAddAnother = () => {
    setShowAddAnother(false)
  }

  const handleClose = () => {
    setShowForm(false)
    setShowAddAnother(false)
  }

  const deleteService = api.servicePayment.delete.useMutation({
    onSuccess: () => {
      refetchServices()
      toast.success('Serviço deletado com sucesso')
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao deletar serviço')
    },
  })

  const handleDelete = useCallback((serviceId: string) => {
    deleteService.mutate({ id: serviceId })
  }, [deleteService])

  const handleDownloadReceipt = useCallback(async (serviceId: string) => {
    try {
      const receipt = await utils.servicePayment.getReceipt.fetch({ id: serviceId })
      const link = document.createElement('a')
      link.href = receipt.filePath
      link.download = receipt.fileName
      link.click()
      toast.success('Download iniciado')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao baixar comprovante')
    }
  }, [utils])

  const totalCount = stats
    ? stats.pending + stats.approved + stats.paid + stats.rejected
    : 0

  const getFilterLabel = (opt: StatusOption): string => {
    if (opt.value === 'all') return `Todos (${totalCount})`
    if (!stats) return opt.label
    if (opt.status === ServicePaymentStatus.PENDING) return `Pendentes (${stats.pending})`
    if (opt.status === ServicePaymentStatus.APPROVED) return `Aprovados (${stats.approved})`
    if (opt.status === ServicePaymentStatus.PAID) return `Pagos (${stats.paid})`
    if (opt.status === ServicePaymentStatus.REJECTED) return `Recusados (${stats.rejected})`
    return opt.label
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
  }

  const getStatusBadge = (status: ServicePaymentStatus) => {
    const statusConfig = {
      [ServicePaymentStatus.PENDING]: {
        icon: Clock,
        label: 'Pendente',
        className: 'bg-status-pending text-status-pending-foreground border-status-pending',
      },
      [ServicePaymentStatus.APPROVED]: {
        icon: CheckCircle,
        label: 'Aprovado',
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      [ServicePaymentStatus.PAID]: {
        icon: DollarSign,
        label: 'Pago',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      [ServicePaymentStatus.REJECTED]: {
        icon: XCircle,
        label: 'Recusado',
        className: 'bg-red-100 text-red-800 border-red-200',
      },
    }
    return statusConfig[status]
  }

  const monthOptions = useMemo(() => {
    return [
      { value: 1, label: 'Janeiro' },
      { value: 2, label: 'Fevereiro' },
      { value: 3, label: 'Março' },
      { value: 4, label: 'Abril' },
      { value: 5, label: 'Maio' },
      { value: 6, label: 'Junho' },
      { value: 7, label: 'Julho' },
      { value: 8, label: 'Agosto' },
      { value: 9, label: 'Setembro' },
      { value: 10, label: 'Outubro' },
      { value: 11, label: 'Novembro' },
      { value: 12, label: 'Dezembro' },
    ]
  }, [])

  const yearOptions = useMemo(() => {
    const currentYear = now.getFullYear()
    const years = []
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
      years.push(i)
    }
    return years.reverse()
  }, [now])

  const columns: ColumnDef<ServicePayment>[] = useMemo(() => [
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => {
        const service = row.original
        return (
          <div className="max-w-md">
            <p className="line-clamp-2">{service.description}</p>
            {service.attachments && service.attachments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {service.attachments.length} anexo(s)
              </p>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "serviceDate",
      header: "Data do Serviço",
      cell: ({ row }) => {
        const service = row.original
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            {formatDate(service.serviceDate)}
          </div>
        )
      },
    },
    {
      accessorKey: "value",
      header: "Valor",
      cell: ({ row }) => {
        const service = row.original
        return (
          <span className="font-semibold text-green-600">
            {formatCurrency(service.value)}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const service = row.original
        const statusInfo = getStatusBadge(service.status)
        const StatusIcon = statusInfo.icon
        return (
          <div>
            <Badge className={`${statusInfo.className} flex items-center gap-1 w-fit`}>
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
            {service.status === ServicePaymentStatus.REJECTED && service.rejectionReason && (
              <p className="text-xs text-red-600 mt-1 max-w-xs">
                {service.rejectionReason}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Ações</div>,
      cell: ({ row }) => {
        const service = row.original
        const canDelete = service.status === ServicePaymentStatus.PENDING
        const canDownload = service.status === ServicePaymentStatus.PAID && service.paymentReceipt
        const hasActions = canDelete || canDownload
        
        if (!hasActions) return null

        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canDelete && (
                  <DropdownMenuItem 
                    onClick={() => handleDelete(service.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Deletar
                  </DropdownMenuItem>
                )}
                {canDownload && (
                  <DropdownMenuItem onClick={() => handleDownloadReceipt(service.id)}>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Comprovante
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ], [handleDelete, handleDownloadReceipt])

  if (!session?.user) {
    return <LoadingSpinner className="min-h-[50vh]" text="Carregando..." />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Serviços</h1>
          <p className="text-muted-foreground">Cadastre e acompanhe seus serviços</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Serviço
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open)
        if (!open) setShowAddAnother(false)
      }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-8">
          {showAddAnother ? (
            <>
              <VisuallyHidden>
                <DialogTitle>Serviço cadastrado com sucesso</DialogTitle>
              </VisuallyHidden>
              <div className="space-y-4 py-8">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Serviço cadastrado com sucesso!</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deseja cadastrar outro serviço?
                    </p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={handleClose} className="flex-1">
                      Fechar
                    </Button>
                    <Button onClick={handleAddAnother} className="flex-1 gap-2">
                      <Plus className="h-4 w-4" />
                      Enviar Outro
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Novo Serviço</DialogTitle>
                <DialogDescription>
                  Preencha os dados do serviço e anexe pelo menos um documento (NFS-e, DANFE, Recibo ou Fatura)
                </DialogDescription>
              </DialogHeader>
              <ServicePaymentForm
                key={showAddAnother ? 'reset' : 'form'}
                onSubmit={handleCreateService}
                isLoading={createService.isPending}
                onClose={handleClose}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Meus Serviços</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex gap-2">
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Select value={filterValue} onValueChange={setFilterValue}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {getFilterLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Nenhum serviço encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente alterar os filtros ou cadastre um novo serviço
              </p>
              <Button onClick={() => setShowForm(true)} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Novo Serviço
              </Button>
            </div>
          ) : (
            <DataTable columns={columns} data={services} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
