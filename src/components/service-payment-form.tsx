'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon, Upload, X, FileText, Image } from 'lucide-react'
import toast from 'react-hot-toast'

const serviceSchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  value: z.string().min(1, 'Valor é obrigatório'),
  serviceDate: z.date({ required_error: 'Data do serviço é obrigatória' }),
})

type ServiceFormData = z.infer<typeof serviceSchema>

interface ServicePaymentFormProps {
  onSubmit: (data: ServiceFormData & { attachments: any[] }) => Promise<void>
  isLoading?: boolean
  onClose?: () => void
}

interface UploadedFile {
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
}

export function ServicePaymentForm({ onSubmit, isLoading = false, onClose }: ServicePaymentFormProps) {
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      description: '',
      value: '',
    },
  })

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return

    const fileArray = Array.from(files)
    
    // Validar quantidade
    if (attachments.length + fileArray.length > 10) {
      toast.error('Máximo de 10 arquivos')
      return
    }

    // Validar tamanho
    const maxSize = 200 * 1024 * 1024 // 200MB
    for (const file of fileArray) {
      if (file.size > maxSize) {
        toast.error(`Arquivo ${file.name} muito grande (máx. 200MB)`)
        return
      }
    }

    setIsUploading(true)

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
      const newAttachments = [...attachments, ...result.files]
      setAttachments(newAttachments)
      toast.success(`${fileArray.length} arquivo(s) anexado(s)`)
    } catch (error) {
      toast.error('Erro ao fazer upload')
    } finally {
      setIsUploading(false)
    }
  }

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index)
    setAttachments(newAttachments)
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

  const handleSubmit = async (data: ServiceFormData) => {
    if (attachments.length === 0) {
      form.setError('attachments', { message: 'Pelo menos um anexo é obrigatório' })
      return
    }

    try {
      await onSubmit({
        ...data,
        attachments,
      })
      // Não mostrar toast aqui - a página vai mostrar a tela de sucesso
      // Não resetar nem fechar aqui - deixar a página controlar
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar serviço')
    }
  }

  return (
    <div className="space-y-6">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Serviço</Label>
            <Textarea
              id="description"
              placeholder="Ex: Manutenção preventiva do elevador social"
              rows={3}
              {...form.register('description')}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...form.register('value')}
              />
              {form.formState.errors.value && (
                <p className="text-sm text-red-600">{form.formState.errors.value.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data do Serviço</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !form.watch('serviceDate') && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch('serviceDate') ? (
                      format(form.watch('serviceDate'), 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      'Selecione a data'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.watch('serviceDate')}
                    onSelect={(date) => form.setValue('serviceDate', date!)}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.serviceDate && (
                <p className="text-sm text-red-600">{form.formState.errors.serviceDate.message}</p>
              )}
            </div>
          </div>

          {/* Upload de Anexos */}
          <div className="space-y-4">
            <Label htmlFor="attachments">
              Anexos <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Envie pelo menos um dos seguintes documentos: NFS-e, DANFE (PDF), Recibo ou Fatura simples
            </p>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">
                  Clique para anexar fotos ou documentos
                </p>
                <p className="text-xs text-muted-foreground">
                  Máx. 10 arquivos, 200MB cada
                </p>
              </label>
            </div>
            {form.formState.errors.attachments && (
              <p className="text-sm text-red-600">{form.formState.errors.attachments.message}</p>
            )}

            {/* Lista de anexos */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{attachments.length} arquivo(s) anexado(s):</p>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.mimeType)}
                        <span className="text-sm truncate">{file.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(file.fileSize)})
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Botão de envio */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isUploading}
          >
            {isLoading ? 'Cadastrando...' : 'Cadastrar Serviço'}
          </Button>
        </form>
    </div>
  )
}