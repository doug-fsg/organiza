'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Upload, X, FileText, Image, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface ServiceItem {
  id: string
  description: string
  value: string
  serviceDate: Date | undefined
  attachments: UploadedFile[]
}

interface UploadedFile {
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
}

interface ServicePaymentBulkFormProps {
  onSubmit: (services: Array<{
    description: string
    value: number
    serviceDate: Date
    attachments: UploadedFile[]
  }>) => Promise<void>
  isLoading?: boolean
  onClose?: () => void
}

export function ServicePaymentBulkForm({ onSubmit, isLoading = false, onClose }: ServicePaymentBulkFormProps) {
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: '1',
      description: '',
      value: '',
      serviceDate: undefined,
      attachments: [],
    }
  ])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const addService = () => {
    setServices(prev => [...prev, {
      id: Date.now().toString(),
      description: '',
      value: '',
      serviceDate: undefined,
      attachments: [],
    }])
  }

  const removeService = (id: string) => {
    if (services.length === 1) {
      toast.error('Você precisa ter pelo menos um serviço')
      return
    }
    setServices(prev => prev.filter(s => s.id !== id))
  }

  const updateService = (id: string, field: keyof ServiceItem, value: any) => {
    setServices(prev => prev.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const handleFileUpload = async (files: FileList, serviceId: string) => {
    if (files.length === 0) return

    const fileArray = Array.from(files)
    const serviceIndex = services.findIndex(s => s.id === serviceId)
    setUploadingIndex(serviceIndex)

    // Validar tamanho
    const maxSize = 200 * 1024 * 1024 // 200MB
    for (const file of fileArray) {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} muito grande (máx. 200MB)`)
        setUploadingIndex(null)
        return
      }
    }

    try {
      const formData = new FormData()
      fileArray.forEach(file => formData.append('files', file))

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Erro no upload')
      }

      const result = await response.json()
      const currentAttachments = services.find(s => s.id === serviceId)?.attachments || []
      updateService(serviceId, 'attachments', [...currentAttachments, ...result.files])
      toast.success(`${fileArray.length} arquivo(s) anexado(s)`)
    } catch (error) {
      toast.error('Erro ao fazer upload')
    } finally {
      setUploadingIndex(null)
    }
  }

  const removeAttachment = (serviceId: string, index: number) => {
    const service = services.find(s => s.id === serviceId)
    if (!service) return
    updateService(serviceId, 'attachments', service.attachments.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <Image className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  const handleSubmit = async () => {
    // Validar todos os serviços
    const errors: string[] = []
    
    services.forEach((service, index) => {
      if (!service.description.trim()) {
        errors.push(`Serviço ${index + 1}: Descrição é obrigatória`)
      }
      if (!service.value || parseFloat(service.value) <= 0) {
        errors.push(`Serviço ${index + 1}: Valor inválido`)
      }
      if (!service.serviceDate) {
        errors.push(`Serviço ${index + 1}: Data é obrigatória`)
      }
      if (service.attachments.length === 0) {
        errors.push(`Serviço ${index + 1}: Pelo menos um anexo é obrigatório`)
      }
    })

    if (errors.length > 0) {
      errors.forEach(error => toast.error(error))
      return
    }

    try {
      const servicesData = services.map(service => ({
        description: service.description,
        value: parseFloat(service.value),
        serviceDate: service.serviceDate!,
        attachments: service.attachments,
      }))

      await onSubmit(servicesData)
      toast.success(`${services.length} serviço(s) cadastrado(s) com sucesso!`)
      onClose?.()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar serviços')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cadastro em Lote</h3>
          <p className="text-sm text-muted-foreground">
            Cadastre múltiplos serviços de uma vez. Cada serviço precisa de pelo menos um anexo.
          </p>
        </div>
        <Button type="button" onClick={addService} variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Serviço
        </Button>
      </div>

      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {services.map((service, index) => (
          <div key={service.id} className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Serviço {index + 1}</h4>
              {services.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeService(service.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor={`description-${service.id}`}>
                Descrição <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id={`description-${service.id}`}
                placeholder="Ex: Manutenção preventiva do elevador social"
                rows={2}
                value={service.description}
                onChange={(e) => updateService(service.id, 'description', e.target.value)}
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`value-${service.id}`}>
                  Valor (R$) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`value-${service.id}`}
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={service.value}
                  onChange={(e) => updateService(service.id, 'value', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Data do Serviço <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !service.serviceDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {service.serviceDate ? (
                        format(service.serviceDate, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        'Selecione a data'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={service.serviceDate}
                      onSelect={(date) => updateService(service.id, 'serviceDate', date)}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Upload de Anexos */}
            <div className="space-y-2">
              <Label htmlFor={`attachments-${service.id}`}>
                Anexos <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                NFS-e, DANFE (PDF), Recibo ou Fatura simples
              </p>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files, service.id)}
                  className="hidden"
                  id={`attachments-${service.id}`}
                  disabled={uploadingIndex === index}
                />
                <label htmlFor={`attachments-${service.id}`} className="cursor-pointer">
                  <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {uploadingIndex === index ? 'Enviando...' : 'Clique para anexar arquivos'}
                  </p>
                </label>
              </div>

              {/* Lista de anexos */}
              {service.attachments.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {service.attachments.map((file, fileIndex) => (
                      <div
                        key={fileIndex}
                        className="flex items-center gap-2 p-2 bg-background rounded-lg border text-sm"
                      >
                        {getFileIcon(file.mimeType)}
                        <span className="truncate max-w-[150px]">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(file.fileSize)})
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(service.id, fileIndex)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botão de envio */}
      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {services.length} serviço(s) para cadastrar
        </p>
        <Button 
          type="button"
          onClick={handleSubmit}
          className="gap-2"
          disabled={isLoading}
        >
          {isLoading ? 'Cadastrando...' : `Cadastrar ${services.length} Serviço(s)`}
        </Button>
      </div>
    </div>
  )
}


