'use client'

import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ServiceRejectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  serviceName: string
  isLoading?: boolean
}

export function ServiceRejectionDialog({
  isOpen,
  onClose,
  onConfirm,
  serviceName,
  isLoading = false,
}: ServiceRejectionDialogProps) {
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim())
      setReason('')
    }
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Recusar Serviço
          </DialogTitle>
          <DialogDescription>
            Você está prestes a recusar o serviço:
            <br />
            <strong>{serviceName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da recusa *</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Valor acima do orçamento aprovado, serviço não autorizado, documentação insuficiente..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? 'Recusando...' : 'Recusar Serviço'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}