'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Link, Unlink, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

interface DependencyManagerProps {
  subtaskId: string
  subtaskTitle: string
  mainTaskId: string
  currentDependencies: any[]
  allSubtasks: any[]
}

export function DependencyManager({ 
  subtaskId, 
  subtaskTitle, 
  mainTaskId, 
  currentDependencies, 
  allSubtasks 
}: DependencyManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedDependency, setSelectedDependency] = useState<string>('')

  const utils = api.useUtils()

  // Filtrar subtarefas que podem ser dependências (não podem ser a própria subtarefa nem já serem dependências)
  const availableDependencies = allSubtasks.filter(subtask => 
    subtask.id !== subtaskId && 
    !currentDependencies.some(dep => dep.blockedBy.id === subtask.id)
  )

  const addDependency = api.subtask.addDependency.useMutation({
    onSuccess: () => {
      utils.subtask.getByUser.invalidate()
      utils.subtask.getByMainTask.invalidate({ mainTaskId })
      setSelectedDependency('')
      setIsDialogOpen(false)
      toast.success('Dependência criada com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao criar dependência: ${error.message}`)
    },
  })

  const removeDependency = api.subtask.removeDependency.useMutation({
    onSuccess: () => {
      utils.subtask.getByUser.invalidate()
      utils.subtask.getByMainTask.invalidate({ mainTaskId })
      toast.success('Dependência removida com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao remover dependência: ${error.message}`)
    },
  })

  const handleAddDependency = () => {
    if (!selectedDependency) {
      toast.error('Selecione uma subtarefa para criar a dependência')
      return
    }

    addDependency.mutate({
      dependentId: subtaskId,
      blockedById: selectedDependency,
    })
  }

  const handleRemoveDependency = (dependencyId: string) => {
    removeDependency.mutate({ id: dependencyId })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'BLOCKED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'TODO':
        return 'A Fazer'
      case 'IN_PROGRESS':
        return 'Em Andamento'
      case 'BLOCKED':
        return 'Bloqueado'
      case 'COMPLETED':
        return 'Concluído'
      case 'APPROVED':
        return 'Aprovado'
      default:
        return status
    }
  }

  return (
    <div className="space-y-3">
      {/* Dependências Atuais */}
      {currentDependencies.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Dependências Atuais:</h4>
          <div className="space-y-1">
            {currentDependencies.map((dependency) => (
              <div key={dependency.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <div className="flex items-center space-x-2">
                  <Link className="h-3 w-3 text-blue-500" />
                  <span className="text-sm font-medium">{dependency.blockedBy.title}</span>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(dependency.blockedBy.status)}`}>
                    {getStatusLabel(dependency.blockedBy.status)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDependency(dependency.id)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <Unlink className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adicionar Nova Dependência */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="h-3 w-3 mr-2" />
            Adicionar Dependência
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Dependência</DialogTitle>
            <DialogDescription>
              Selecione uma subtarefa que deve ser concluída antes de "{subtaskTitle}" poder ser iniciada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subtarefa que bloqueia:</label>
              <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma subtarefa..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDependencies.map((subtask) => (
                    <SelectItem key={subtask.id} value={subtask.id}>
                      <div className="flex items-center space-x-2">
                        <span>{subtask.title}</span>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(subtask.status)}`}>
                          {getStatusLabel(subtask.status)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDependency && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Dependência será criada:</p>
                    <p>"{subtaskTitle}" aguardará a conclusão de "{availableDependencies.find(s => s.id === selectedDependency)?.title}"</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddDependency} 
                disabled={!selectedDependency || addDependency.isPending}
              >
                {addDependency.isPending ? 'Criando...' : 'Criar Dependência'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {availableDependencies.length === 0 && currentDependencies.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <Link className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma dependência disponível</p>
          <p className="text-xs">Todas as outras subtarefas já são dependências ou não existem</p>
        </div>
      )}
    </div>
  )
}
