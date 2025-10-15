'use client'

import * as React from 'react'
import { ChevronDown, CheckSquare, User, Users, Filter, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, RotateCcw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { SubtaskStatus, RecurringType } from '@prisma/client'

interface TaskCalendarSidebarProps {
  className?: string
  allSubtasks?: any[]
  selectedFilters: {
    assignees: string[]
    statuses: SubtaskStatus[]
    recurringTypes: RecurringType[]
    priorities: string[]
  }
  onFiltersChange: (filters: {
    assignees: string[]
    statuses: SubtaskStatus[]
    recurringTypes: RecurringType[]
    priorities: string[]
  }) => void
}

export function TaskCalendarSidebar({ 
  className, 
  allSubtasks = [], 
  selectedFilters, 
  onFiltersChange 
}: TaskCalendarSidebarProps) {
  
  // Extrair dados únicos para os filtros
  const assignees = React.useMemo(() => {
    const uniqueAssignees = new Set<string>()
    allSubtasks.forEach(task => {
      if (task.assignedTo?.name) {
        uniqueAssignees.add(task.assignedTo.name)
      }
    })
    return Array.from(uniqueAssignees).sort()
  }, [allSubtasks])

  // Verificar se há múltiplos responsáveis (se não, não mostrar filtro de responsável)
  const hasMultipleAssignees = assignees.length > 1

  const priorities = [
    { value: 'HIGH', label: 'Alta' },
    { value: 'MEDIUM', label: 'Média' },
    { value: 'LOW', label: 'Baixa' }
  ]
  
  const statuses = [
    { value: SubtaskStatus.NOT_STARTED, label: 'Não Iniciada' },
    { value: SubtaskStatus.IN_PROGRESS, label: 'Em Andamento' },
    { value: SubtaskStatus.BLOCKED, label: 'Bloqueada' },
    { value: SubtaskStatus.APPROVED_PENDING, label: 'Aguardando Aprovação' },
    { value: SubtaskStatus.APPROVED, label: 'Aprovada' },
    { value: SubtaskStatus.REJECTED, label: 'Rejeitada' }
  ]
  
  const recurringTypes = [
    { value: RecurringType.DAILY, label: 'Diária' },
    { value: RecurringType.WEEKLY, label: 'Semanal' },
    { value: RecurringType.MONTHLY, label: 'Mensal' }
  ]

  // Função para alternar filtros
  const toggleFilter = (type: keyof typeof selectedFilters, value: string) => {
    const currentValues = selectedFilters[type] as string[]
    
    // Lógica especial para recorrência
    if (type === 'recurringTypes') {
      if (value === 'NONE') {
        // Se clicar em "Não Recorrente", limpar todos os filtros de recorrência
        onFiltersChange({
          ...selectedFilters,
          recurringTypes: []
        })
      } else {
        // Se clicar em um tipo específico, remover "NONE" e adicionar/remover o tipo
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value)
          : [...currentValues.filter(v => v !== 'NONE'), value]
        
        onFiltersChange({
          ...selectedFilters,
          recurringTypes: newValues
        })
      }
    } else {
      // Lógica normal para outros filtros
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      onFiltersChange({
        ...selectedFilters,
        [type]: newValues
      })
    }
  }

  // Função para limpar todos os filtros
  const clearAllFilters = () => {
    onFiltersChange({
      assignees: [],
      statuses: [],
      recurringTypes: [],
      priorities: []
    })
  }

  // Contar quantos filtros estão ativos
  const activeFiltersCount = Object.values(selectedFilters).reduce((total, filters) => total + filters.length, 0)

  // Função para obter cor do status
  const getStatusColor = (status: SubtaskStatus) => {
    switch (status) {
      case SubtaskStatus.APPROVED:
        return 'bg-green-500'
      case SubtaskStatus.APPROVED_PENDING:
        return 'bg-yellow-500'
      case SubtaskStatus.BLOCKED:
        return 'bg-red-500'
      case SubtaskStatus.IN_PROGRESS:
        return 'bg-blue-500'
      case SubtaskStatus.NOT_STARTED:
        return 'bg-gray-500'
      case SubtaskStatus.REJECTED:
        return 'bg-red-600'
      default:
        return 'bg-gray-500'
    }
  }

  // Função para obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500'
      case 'MEDIUM':
        return 'bg-yellow-500'
      case 'LOW':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  // Função para obter ícone do status
  const getStatusIcon = (status: SubtaskStatus) => {
    switch (status) {
      case SubtaskStatus.APPROVED:
        return <CheckCircle2 className="w-3 h-3" />
      case SubtaskStatus.APPROVED_PENDING:
        return <Clock className="w-3 h-3" />
      case SubtaskStatus.BLOCKED:
        return <XCircle className="w-3 h-3" />
      case SubtaskStatus.IN_PROGRESS:
        return <Clock className="w-3 h-3" />
      case SubtaskStatus.NOT_STARTED:
        return <AlertCircle className="w-3 h-3" />
      case SubtaskStatus.REJECTED:
        return <XCircle className="w-3 h-3" />
      default:
        return <AlertCircle className="w-3 h-3" />
    }
  }

  return (
    <div className={cn("w-64 p-4 pr-2 border-r shrink-0 hidden md:block bg-white", className)}>

      {/* Filtros Ativos */}
      {activeFiltersCount > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Filtros Ativos ({activeFiltersCount})
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
            >
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedFilters.assignees?.map((assignee, index) => (
              <Badge key={`assignee-${assignee}-${index}`} variant="secondary" className="text-xs">
                {assignee}
              </Badge>
            )) || []}
            {selectedFilters.statuses?.map((status, index) => (
              <Badge key={`status-${status}-${index}`} variant="secondary" className="text-xs">
                {status?.replace('_', ' ') || status}
              </Badge>
            )) || []}
            {selectedFilters.priorities?.map((priority, index) => (
              <Badge key={`priority-${priority}-${index}`} variant="secondary" className="text-xs">
                {priority}
              </Badge>
            )) || []}
            {selectedFilters.recurringTypes?.map((type, index) => (
              <Badge key={`recurring-${type}-${index}`} variant="secondary" className="text-xs">
                {type}
              </Badge>
            )) || []}
          </div>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-6 pr-2">
          {/* Filtro por Responsável - só aparece se há múltiplos responsáveis */}
          {hasMultipleAssignees && (
            <div>
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 group">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4 text-gray-500" />
                    Responsável
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 pl-6">
                    {assignees.length > 0 ? (
                      assignees.map((assignee, index) => (
                        <div key={`assignee-item-${assignee}-${index}`} className="flex items-center space-x-2 group py-1">
                          <Checkbox 
                            id={`assignee-${assignee}`} 
                            checked={selectedFilters.assignees?.includes(assignee) || false}
                            onCheckedChange={() => toggleFilter('assignees', assignee)}
                            className="rounded-sm" 
                          />
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <label
                            htmlFor={`assignee-${assignee}`}
                            className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600 cursor-pointer"
                          >
                            {assignee}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div key="no-assignees" className="text-sm text-gray-500 pl-6">Nenhum responsável encontrado</div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Filtro por Status */}
          <div>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 group">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckSquare className="w-4 h-4 text-gray-500" />
                  Status
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pl-6">
                  {statuses.map((status, index) => (
                    <div key={`status-item-${status.value}-${index}`} className="flex items-center space-x-2 group py-1">
                      <Checkbox 
                        id={`status-${status.value}`} 
                        checked={selectedFilters.statuses?.includes(status.value) || false}
                        onCheckedChange={() => toggleFilter('statuses', status.value)}
                        className="rounded-sm" 
                      />
                      <div className={cn("w-3 h-3 rounded-sm", getStatusColor(status.value))} />
                      <label
                        htmlFor={`status-${status.value}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600 cursor-pointer flex items-center gap-1"
                      >
                        {getStatusIcon(status.value)}
                        {status.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Filtro por Prioridade */}
          <div>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 group">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  Prioridade
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pl-6">
                  {priorities.map((priority, index) => (
                    <div key={`priority-item-${priority.value}-${index}`} className="flex items-center space-x-2 group py-1">
                      <Checkbox 
                        id={`priority-${priority.value}`} 
                        checked={selectedFilters.priorities?.includes(priority.value) || false}
                        onCheckedChange={() => toggleFilter('priorities', priority.value)}
                        className="rounded-sm" 
                      />
                      <div className={cn("w-3 h-3 rounded-sm", getPriorityColor(priority.value))} />
                      <label
                        htmlFor={`priority-${priority.value}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600 cursor-pointer"
                      >
                        {priority.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Filtro por Tipo de Recorrência */}
          <div>
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full mb-2 group">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <RotateCcw className="w-4 h-4 text-gray-500" />
                  Recorrência
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1 pl-6">
                  <div key="recurring-none-item" className="flex items-center space-x-2 group py-1">
                    <Checkbox 
                      id="recurring-none" 
                      checked={selectedFilters.recurringTypes?.length === 0}
                      onCheckedChange={() => toggleFilter('recurringTypes', 'NONE')}
                      className="rounded-sm" 
                    />
                    <div className="w-3 h-3 rounded-sm bg-gray-500" />
                    <label
                      htmlFor="recurring-none"
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600 cursor-pointer"
                    >
                      Todas
                    </label>
                  </div>
                  {recurringTypes.map((type, index) => (
                    <div key={`recurring-item-${type.value}-${index}`} className="flex items-center space-x-2 group py-1">
                      <Checkbox 
                        id={`recurring-${type.value}`} 
                        checked={selectedFilters.recurringTypes?.includes(type.value) || false}
                        onCheckedChange={() => toggleFilter('recurringTypes', type.value)}
                        className="rounded-sm" 
                      />
                      <div className="w-3 h-3 rounded-sm bg-purple-500" />
                      <label
                        htmlFor={`recurring-${type.value}`}
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-blue-600 cursor-pointer"
                      >
                        {type.label}
                      </label>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

        </div>
      </ScrollArea>
    </div>
  )
}
