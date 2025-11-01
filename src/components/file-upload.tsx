'use client'

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { X, Upload, File, FileText, FileImage, Paperclip } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface FileUploadProps {
  onFilesSelected: (files: UploadedFile[]) => void
  maxFiles?: number
  maxFileSize?: number // em MB
  disabled?: boolean
}

export interface UploadedFile {
  fileName: string
  fileSize: number
  mimeType: string
  filePath: string
  localFile?: File // Para preview local antes de enviar
}

export function FileUpload({ 
  onFilesSelected, 
  maxFiles = 10, 
  maxFileSize = 200,
  disabled = false 
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFiles = (files: File[]): boolean => {
    if (files.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos por vez`)
      return false
    }

    const maxSize = maxFileSize * 1024 * 1024
    for (const file of files) {
      if (file.size > maxSize) {
        toast.error(`Arquivo "${file.name}" excede ${maxFileSize}MB`)
        return false
      }
    }

    return true
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    
    if (!validateFiles(fileArray)) return

    setSelectedFiles(fileArray)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }, [disabled, maxFiles, maxFileSize])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      selectedFiles.forEach((file) => {
        formData.append('files', file)
      })

      // Simular progresso
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const data = await response.json()
      
      // Adicionar arquivo local para preview
      const filesWithLocal: UploadedFile[] = data.files.map((file: UploadedFile, index: number) => ({
        ...file,
        localFile: selectedFiles[index],
      }))

      onFilesSelected(filesWithLocal)
      setSelectedFiles([])
      toast.success(`${data.files.length} arquivo(s) anexado(s)`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao fazer upload')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <FileImage className="h-4 w-4" />
    if (file.type === 'application/pdf') return <FileText className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className="space-y-3">
      {/* Área de Drag & Drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
        `}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
          accept="*/*"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <Upload className={`h-8 w-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-gray-700 mb-1">
            {isDragging ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
          </p>
          <p className="text-xs text-gray-500">
            Até {maxFiles} arquivos • Máximo {maxFileSize}MB cada
          </p>
        </div>
      </div>

      {/* Lista de Arquivos Selecionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {selectedFiles.length} arquivo(s) selecionado(s)
            </span>
            <Button
              size="sm"
              onClick={handleUpload}
              disabled={isUploading || disabled}
            >
              {isUploading ? 'Enviando...' : 'Anexar'}
            </Button>
          </div>

          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-white border rounded">
              {getFileIcon(file)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}

          {isUploading && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-gray-500 text-center">{uploadProgress}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}



