'use client'

import { ServicePaymentStatus } from '@prisma/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Clock, 
  CheckCircle, 
  DollarSign, 
  XCircle, 
  Calendar,
  Paperclip,
  Eye,
  Download
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ServicePaymentCardProps {
  service: {
    id: string
    description: string
    value: number
    serviceDate: Date
    status: ServicePaymentStatus
    createdAt: Date
    approvedAt?: Date | null
    paidAt?: Date | null
    rejectedAt?: Date | null
    rejectionReason?: string | null
    supplier?: { name: string }
    approvedBy?: { name: string } | null
    paidBy?: { name: string } | null
    attachments?: { id: string; fileName: string }[]
    paymentReceipt?: { fileName: string; filePath: string } | null
  }
  onView?: () => void
  onApprove?: () => void
  onReject?: () => void
  onMarkAsPaid?: () => void
  onDownloadReceipt?: () => void
  showActions?: boolean
  variant?: 'supplier' | 'manager' | 'financial'
}

const statusConfig = {
  [ServicePaymentStatus.PENDING]: {
    icon: Clock,
    label: 'Pendente',
    color: 'bg-status-pending text-status-pending-foreground border-status-pending',
  },
  [ServicePaymentStatus.APPROVED]: {
    icon: CheckCircle,
    label: 'Aprovado',
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  [ServicePaymentStatus.PAID]: {
    icon: DollarSign,
    label: 'Pago',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  [ServicePaymentStatus.REJECTED]: {
    icon: XCircle,
    label: 'Recusado',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
}

export function ServicePaymentCard({ 
  service, 
  onView, 
  onApprove, 
  onReject, 
  onMarkAsPaid,
  onDownloadReceipt,
  showActions = true,
  variant = 'supplier'
}: ServicePaymentCardProps) {
  const statusInfo = statusConfig[service.status]
  const StatusIcon = statusInfo.icon

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return format(date, 'dd/MM/yyyy', { locale: ptBR })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight mb-2 line-clamp-2">
              {service.description}
            </h3>
            {variant !== 'supplier' && service.supplier && (
              <p className="text-sm text-muted-foreground">
                por {service.supplier.name}
              </p>
            )}
          </div>
          <Badge className={`${statusInfo.color} flex items-center gap-1 ml-3 flex-shrink-0`}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Valor e Data */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-600 text-base">
              {formatCurrency(service.value)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(service.serviceDate)}</span>
          </div>
        </div>

        {/* Anexos */}
        {service.attachments && service.attachments.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Paperclip className="h-4 w-4" />
            <span>{service.attachments.length} anexo(s)</span>
          </div>
        )}

        {/* Informações de status */}
        {service.status === ServicePaymentStatus.REJECTED && service.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Motivo:</strong> {service.rejectionReason}
            </p>
          </div>
        )}

        {service.status === ServicePaymentStatus.APPROVED && service.approvedBy && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <p className="text-xs text-green-700">
              Aprovado por {service.approvedBy.name} em {service.approvedAt && formatDate(service.approvedAt)}
            </p>
          </div>
        )}

        {service.status === ServicePaymentStatus.PAID && service.paidBy && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <p className="text-xs text-blue-700">
              Pago por {service.paidBy.name} em {service.paidAt && formatDate(service.paidAt)}
            </p>
          </div>
        )}

        {/* Ações */}
        {showActions && (
          <div className="flex gap-2 pt-2">
            {onView && (
              <Button variant="outline" size="sm" onClick={onView} className="flex-1">
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Button>
            )}

            {/* Ações do Gestor */}
            {variant === 'manager' && service.status === ServicePaymentStatus.PENDING && (
              <>
                {onApprove && (
                  <Button size="sm" onClick={onApprove} className="flex-1 bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                )}
                {onReject && (
                  <Button variant="destructive" size="sm" onClick={onReject} className="flex-1">
                    <XCircle className="h-4 w-4 mr-1" />
                    Recusar
                  </Button>
                )}
              </>
            )}

            {/* Ações do Financeiro */}
            {variant === 'financial' && service.status === ServicePaymentStatus.APPROVED && onMarkAsPaid && (
              <Button size="sm" onClick={onMarkAsPaid} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <DollarSign className="h-4 w-4 mr-1" />
                Marcar como Pago
              </Button>
            )}

            {/* Download do comprovante */}
            {service.status === ServicePaymentStatus.PAID && service.paymentReceipt && onDownloadReceipt && (
              <Button variant="outline" size="sm" onClick={onDownloadReceipt} className="flex-1">
                <Download className="h-4 w-4 mr-1" />
                Comprovante
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}