'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, RotateCcw } from 'lucide-react'

interface RecurringTaskConfigProps {
  isRecurring: boolean
  recurringType: string
  recurringWeekDays: string[]
  recurringMonthDays: number[]
  recurringInterval: number
  skipWeekends: boolean
  skipHolidays: boolean
  recurringEndDate: string
  onConfigChange: (config: {
    isRecurring: boolean
    recurringType: string
    recurringWeekDays: string[]
    recurringMonthDays: number[]
    recurringInterval: number
    skipWeekends: boolean
    skipHolidays: boolean
    recurringEndDate: string
  }) => void
}

const WEEK_DAYS = [
  { key: 'SUNDAY', label: 'Dom', full: 'Domingo' },
  { key: 'MONDAY', label: 'Seg', full: 'Segunda' },
  { key: 'TUESDAY', label: 'Ter', full: 'Terça' },
  { key: 'WEDNESDAY', label: 'Qua', full: 'Quarta' },
  { key: 'THURSDAY', label: 'Qui', full: 'Quinta' },
  { key: 'FRIDAY', label: 'Sex', full: 'Sexta' },
  { key: 'SATURDAY', label: 'Sab', full: 'Sábado' }
]

export function RecurringTaskConfig({
  isRecurring,
  recurringType,
  recurringWeekDays,
  recurringMonthDays,
  recurringInterval,
  skipWeekends,
  skipHolidays,
  recurringEndDate,
  onConfigChange
}: RecurringTaskConfigProps) {
  const updateConfig = (updates: Partial<RecurringTaskConfigProps>) => {
    onConfigChange({
      isRecurring,
      recurringType,
      recurringWeekDays,
      recurringMonthDays,
      recurringInterval,
      skipWeekends,
      skipHolidays,
      recurringEndDate,
      ...updates
    })
  }

  const toggleWeekDay = (day: string) => {
    const newDays = recurringWeekDays.includes(day)
      ? recurringWeekDays.filter(d => d !== day)
      : [...recurringWeekDays, day]
    
    updateConfig({ recurringWeekDays: newDays })
  }

  const toggleMonthDay = (day: number) => {
    const newDays = recurringMonthDays.includes(day)
      ? recurringMonthDays.filter(d => d !== day)
      : [...recurringMonthDays, day].sort((a, b) => a - b)
    
    updateConfig({ recurringMonthDays: newDays })
  }

  const getPreviewText = () => {
    if (!isRecurring) return ''
    
    switch (recurringType) {
      case 'DAILY':
        return recurringInterval > 1 
          ? `A cada ${recurringInterval} dias`
          : 'Todos os dias'
      
      case 'WEEKLY':
        if (recurringWeekDays.length === 0) return 'Selecione os dias'
        if (recurringWeekDays.length === 7) return 'Todos os dias da semana'
        return `Toda ${recurringWeekDays.map(day => 
          WEEK_DAYS.find(d => d.key === day)?.full
        ).join(', ')}`
      
      case 'BIWEEKLY':
        if (recurringWeekDays.length === 0) return 'Selecione os dias'
        return `A cada 2 semanas: ${recurringWeekDays.map(day => 
          WEEK_DAYS.find(d => d.key === day)?.label
        ).join(', ')}`
      
      case 'MONTHLY':
        if (recurringMonthDays.length === 0) return 'Selecione os dias'
        return `Todo mês nos dias: ${recurringMonthDays.join(', ')}`
      
      case 'CUSTOM':
        return `A cada ${recurringInterval} dias`
      
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Toggle Principal */}
      <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
        <Checkbox
          id="is-recurring"
          checked={isRecurring}
          onCheckedChange={(checked) => 
            updateConfig({ 
              isRecurring: checked as boolean,
              recurringType: checked ? 'WEEKLY' : '',
              recurringWeekDays: [],
              recurringMonthDays: [],
              recurringInterval: 1
            })
          }
        />
        <div className="flex-1">
          <Label htmlFor="is-recurring" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Repetir tarefa
          </Label>
          <p className="text-xs text-muted-foreground">
            {isRecurring ? "🔄 Reabre automaticamente" : "Execução única"}
          </p>
        </div>
        {isRecurring && (
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
            🔄 Ativa
          </Badge>
        )}
      </div>

      {/* Configurações de Recorrência */}
      {isRecurring && (
        <div className="p-4 bg-blue-50 rounded-lg space-y-4">
          {/* Tipo de Recorrência */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Frequência</Label>
            <Select 
              value={recurringType} 
              onValueChange={(value) => {
                updateConfig({ 
                  recurringType: value,
                  recurringWeekDays: value === 'WEEKLY' || value === 'BIWEEKLY' ? ['MONDAY'] : [],
                  recurringMonthDays: value === 'MONTHLY' ? [1] : [],
                  recurringInterval: value === 'DAILY' || value === 'CUSTOM' ? 1 : 1
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Diário</SelectItem>
                <SelectItem value="WEEKLY">Semanal</SelectItem>
                <SelectItem value="BIWEEKLY">Quinzenal</SelectItem>
                <SelectItem value="MONTHLY">Mensal</SelectItem>
                <SelectItem value="CUSTOM">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Configuração Diária/Custom */}
          {(recurringType === 'DAILY' || recurringType === 'CUSTOM') && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {recurringType === 'DAILY' ? 'Repetir a cada' : 'Intervalo (dias)'}
              </Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={recurringInterval}
                  onChange={(e) => updateConfig({ recurringInterval: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {recurringInterval === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            </div>
          )}

          {/* Seleção de Dias da Semana */}
          {(recurringType === 'WEEKLY' || recurringType === 'BIWEEKLY') && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dias da semana</Label>
              <div className="grid grid-cols-7 gap-2">
                {WEEK_DAYS.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => toggleWeekDay(day.key)}
                    className={`
                      p-2 text-xs font-medium rounded-md border transition-colors
                      ${recurringWeekDays.includes(day.key)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Seleção de Dias do Mês */}
          {recurringType === 'MONTHLY' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Dias do mês</Label>
              <div className="grid grid-cols-7 gap-1 max-h-32 overflow-y-auto">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleMonthDay(day)}
                    className={`
                      p-1 text-xs font-medium rounded border transition-colors
                      ${recurringMonthDays.includes(day)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opções Avançadas */}
          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-weekends"
                checked={skipWeekends}
                onCheckedChange={(checked) => updateConfig({ skipWeekends: checked as boolean })}
              />
              <Label htmlFor="skip-weekends" className="text-sm cursor-pointer">
                Pular fins de semana
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="skip-holidays"
                checked={skipHolidays}
                onCheckedChange={(checked) => updateConfig({ skipHolidays: checked as boolean })}
              />
              <Label htmlFor="skip-holidays" className="text-sm cursor-pointer">
                Pular feriados
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date" className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Terminar em (opcional)
              </Label>
              <Input
                id="end-date"
                type="date"
                value={recurringEndDate}
                onChange={(e) => updateConfig({ recurringEndDate: e.target.value })}
              />
            </div>
          </div>

          {/* Preview */}
          {getPreviewText() && (
            <div className="text-xs text-blue-600 bg-blue-100 p-3 rounded-md">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span className="font-medium">Resumo:</span>
              </div>
              <p className="mt-1">{getPreviewText()}</p>
              {(skipWeekends || skipHolidays) && (
                <p className="mt-1 text-blue-500">
                  {skipWeekends && skipHolidays ? 'Exceto fins de semana e feriados' :
                   skipWeekends ? 'Exceto fins de semana' : 'Exceto feriados'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
