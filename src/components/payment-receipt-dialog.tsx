'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Upload, FileText, X, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'

interface PaymentReceiptDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (receipt: any) => void
  serviceName: string
  serviceValue: number
  isLoading?: boolean
}

export function PaymentReceiptDialog({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
  serviceValue,
  isLoading = false,
}: PaymentReceiptDialogProps) {
  const [receipt, setReceipt] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return

    const file = files[0]
    
    // Validar tamanho
    const maxSize = 200 * 1024 * 1024 // 200MB
    if (file.size > maxSize) {
      toast.error('Arquivo muito grande (máx. 200MB)')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('files', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro no upload')
      }

      const result = await response.json()
      setReceipt(result.files[0])
      toast.success('Comprovante anexado')
    } catch (error) {
      toast.error('Erro ao fazer upload')
    } finally {
      setIsUploading(false)
    }
  }

  const handleConfirm = () => {
    if (receipt) {
      onConfirm(receipt)
      setReceipt(null)
    }
  }

  const handleClose = () => {
    setReceipt(null)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Marcar como Pago
          </DialogTitle>
          <DialogDescription>
            Confirme o pagamento do serviço:
            <br />
            <strong>{serviceName}</strong>
            <br />
            Valor: <strong>{formatCurrency(serviceValue)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Comprovante de Pagamento *</Label>
            
            {!receipt ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="receipt-upload"
                  disabled={isUploading}
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Clique para anexar o comprovante
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, JPG, PNG (máx. 200MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{receipt.fileName}</p>
                    <p className="text-xs text-green-600">
                      {formatFileSize(receipt.fileSize)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setReceipt(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading || isUploading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!receipt || isLoading || isUploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}