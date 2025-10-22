'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { X, Download, FileText, File, Image as ImageIcon, Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import Image from 'next/image'

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
  uploadedAt: Date
  uploadedBy: string
}

interface AttachmentPreviewProps {
  attachments: Attachment[]
  currentUserId: string
  onDelete?: (attachmentId: string) => void
}

export function AttachmentPreview({ attachments, currentUserId, onDelete }: AttachmentPreviewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const handlePdfView = (filePath: string) => {
    // Abrir PDF em nova aba do navegador
    window.open(filePath, '_blank')
  }

  if (attachments.length === 0) return null

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/')
  const isPdf = (mimeType: string) => mimeType === 'application/pdf'

  return (
    <div className="space-y-2 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {attachments.map((attachment) => {
          const canDelete = currentUserId === attachment.uploadedBy && onDelete

          if (isImage(attachment.mimeType)) {
            // Preview de imagem
            return (
              <div
                key={attachment.id}
                className="relative group rounded-lg overflow-hidden border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div
                  className="relative aspect-video bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedImage(attachment.filePath)}
                >
                  <Image
                    src={attachment.filePath}
                    alt={attachment.fileName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-2 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {attachment.fileName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={attachment.filePath}
                        download={attachment.fileName}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </a>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(attachment.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // Ícone para PDF e outros arquivos
          return (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group"
            >
              <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded">
                {getFileIcon(attachment.mimeType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</p>
              </div>
              <div className="flex items-center gap-1">
                {isPdf(attachment.mimeType) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePdfView(attachment.filePath)}
                    className="h-8 px-2 text-xs"
                  >
                    Visualizar
                  </Button>
                ) : (
                  <a href={attachment.filePath} download={attachment.fileName}>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Baixar
                    </Button>
                  </a>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(attachment.id)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal para visualizar imagem */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <VisuallyHidden>
                <DialogTitle>Visualizar Imagem</DialogTitle>
              </VisuallyHidden>
            </DialogHeader>
            <div className="relative w-full h-[70vh]">
              <Image
                src={selectedImage}
                alt="Preview"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  )
}

// Componente para área de upload compacta (para usar em comentários)
export function AttachmentButton({ 
  onFilesSelected, 
  maxFiles = 10,
  disabled = false 
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    if (fileArray.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos por vez`)
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      fileArray.forEach((file) => {
        formData.append('files', file)
      })

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      onFilesSelected(data.files)
      toast.success(`${data.files.length} arquivo(s) anexado(s)`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer upload')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled || isUploading}
        accept="*/*"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="shrink-0"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
    </>
  )
}

