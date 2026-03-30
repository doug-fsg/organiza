'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle, DollarSign, XCircle } from 'lucide-react'

interface ServicePaymentStatsProps {
  stats: {
    pending: number
    approved: number
    paid: number
    rejected: number
    totalValue: number
  }
}

export function ServicePaymentStats({ stats }: ServicePaymentStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const statCards = [
    {
      title: 'Pendentes',
      value: stats.pending,
      icon: Clock,
      color: 'text-status-pending-foreground',
      bgColor: 'bg-status-pending',
      borderColor: 'border-status-pending',
    },
    {
      title: 'Aprovados',
      value: stats.approved,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Pagos',
      value: stats.paid,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Recusados',
      value: stats.rejected,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className={`${stat.bgColor} ${stat.borderColor} border-2`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Total Pago */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(stats.totalValue)}
            </div>
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}