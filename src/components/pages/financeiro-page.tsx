'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { api } from '@/lib/api'
import { ServicePaymentCard } from '@/components/service-payment-card'
import { PaymentReceiptDialog } from '@/components/payment-receipt-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  DollarSign, 
  CheckCircle, 
  Search, 
  Calendar,
  Filter,
  Users,
  BarChart3,
  TrendingUp,
  Download,
  Target
} from 'lucide-react'
import { LoadingSpinner } from '@/components/loading-spinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FinanceiroPage() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedService, setSelectedService] = useState<any>(null)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  const { data: approvedServices = [], refetch: refetchApproved, isLoading } = api.servicePayment.listApproved.useQuery(
    undefined,
    { enabled: !!session?.user?.activeAccountId }
  )

  const { data: stats } = api.servicePayment.getStats.useQuery(
    undefined,
    { enabled: !!session?.user?.activeAccountId }
  )

  const markAsPaid = api.servicePayment.markAsPaid.useMutation({
    onSuccess: () => {
      refetchApproved()
      setShowReceiptDialog(false)
      setSelectedService(null)
      toast.success('Pagamento registrado com sucesso!')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleMarkAsPaid = (service: any) => {
    setSelectedService(service)
    setShowReceiptDialog(true)
  }

  const handleConfirmPayment = async (receipt: any) => {
    if (!selectedService) return
    try {
      await markAsPaid.mutateAsync({
        id: selectedService.id,
        receipt,
      })
    } catch {
      // Error handled by mutation
    }
  }

  const filteredServices = useMemo(() => {
    if (!approvedServices) return []
    return approvedServices.filter(service => {
      const matchesSearch = service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          service.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesSupplier = supplierFilter === 'ALL' || service.supplier?.name === supplierFilter
      return matchesSearch && matchesSupplier
    })
  }, [approvedServices, searchTerm, supplierFilter])

  const dashboardMetrics = useMemo(() => {
    if (!approvedServices) return null
    const totalServices = approvedServices.length
    const totalValue = approvedServices.reduce((sum, service) => sum + service.value, 0)
    const supplierStats = approvedServices.reduce((acc: any, service) => {
      const supplierName = service.supplier?.name || 'Sem fornecedor'
      if (!acc[supplierName]) {
        acc[supplierName] = { count: 0, value: 0 }
      }
      acc[supplierName].count++
      acc[supplierName].value += service.value
      return acc
    }, {})
    const topSuppliers = Object.entries(supplierStats)
      .map(([name, data]: [string, any]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
    return {
      totalServices,
      totalValue,
      topSuppliers,
      averageValue: totalServices > 0 ? totalValue / totalServices : 0
    }
  }, [approvedServices])

  const suppliers = useMemo(() => {
    if (!approvedServices) return []
    const uniqueSuppliers = [...new Set(approvedServices.map(s => s.supplier?.name).filter(Boolean))]
    return uniqueSuppliers.sort()
  }, [approvedServices])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const servicesByDate = useMemo(() => {
    return filteredServices.reduce((groups: any, service) => {
      const date = service.approvedAt ? format(new Date(service.approvedAt), 'dd/MM/yyyy', { locale: ptBR }) : 'Sem data'
      if (!groups[date]) groups[date] = []
      groups[date].push(service)
      return groups
    }, {})
  }, [filteredServices])

  if (!session?.user) {
    return <LoadingSpinner className="min-h-screen" text="Carregando..." />
  }

  if (isLoading) {
    return <LoadingSpinner className="min-h-screen" text="Carregando dados financeiros..." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">Gerencie pagamentos de serviços aprovados</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={approvedServices.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {dashboardMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Serviços Aprovados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardMetrics.totalServices}</div>
              <p className="text-xs text-muted-foreground">aguardando pagamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total a Pagar</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.totalValue)}</div>
              <p className="text-xs text-muted-foreground">valor total pendente</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(dashboardMetrics.averageValue)}</div>
              <p className="text-xs text-muted-foreground">por serviço</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fornecedores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers.length}</div>
              <p className="text-xs text-muted-foreground">fornecedores ativos</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Descrição ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os fornecedores</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                  <SelectItem value="all">Todos os períodos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pendentes ({filteredServices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pagamentos Pendentes
                </div>
                <Badge variant="secondary">
                  {filteredServices.length} de {approvedServices.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredServices.length === 0 ? (
                <div className="text-center py-12">
                  {approvedServices.length === 0 ? (
                    <>
                      <CheckCircle className="h-12 w-12 mx-auto text-success mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum pagamento pendente</h3>
                      <p className="text-muted-foreground">Não há serviços aprovados aguardando pagamento</p>
                    </>
                  ) : (
                    <>
                      <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                      <p className="text-muted-foreground">Tente ajustar os filtros para encontrar pagamentos</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(servicesByDate).map(([date, services]: [string, any[]]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium">Aprovados em {date}</h3>
                        <Badge variant="outline" className="text-xs">{services.length} serviço(s)</Badge>
                        <div className="ml-auto text-sm text-muted-foreground">
                          Total: {formatCurrency(services.reduce((sum, s) => sum + s.value, 0))}
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {services.map((service) => (
                          <ServicePaymentCard
                            key={service.id}
                            service={service}
                            variant="financial"
                            onMarkAsPaid={() => handleMarkAsPaid(service)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <PaymentReceiptDialog
        isOpen={showReceiptDialog}
        onClose={() => {
          setShowReceiptDialog(false)
          setSelectedService(null)
        }}
        onConfirm={handleConfirmPayment}
        serviceName={selectedService?.description || ''}
        serviceValue={selectedService?.value || 0}
        isLoading={markAsPaid.isPending}
      />
    </div>
  )
}
