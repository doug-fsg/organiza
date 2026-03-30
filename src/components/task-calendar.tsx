'use client'

import * as React from 'react'
import { addDays, addMonths, addWeeks, subMonths, subWeeks, format, getDaysInMonth, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, RotateCcw, HelpCircle } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { SubtaskStatus, RecurringType, WeekDay, Priority } from '@prisma/client'
import { TaskCalendarSidebar } from './task-calendar-sidebar'
import { SubtaskDetailsModal } from './subtask-details-modal'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface TaskCalendarProps {
  currentUser: {
    id: string
    name: string
    role: string
  }
}

interface TaskForCalendar {
  id: string
  title: string
  status: SubtaskStatus
  completedAt: Date | null
  deadline: Date | null
  isRecurring: boolean
  recurringType: RecurringType | null
  recurringDay: number | null
  recurringWeekDay: WeekDay | null
  recurringWeekDays: string | null
  recurringMonthDays: string | null
  recurringInterval: number | null
  skipWeekends: boolean
  skipHolidays: boolean
  recurringEndDate: Date | null
  assignedTo: {
    id: string
    name: string
  } | null
  mainTask: {
    id: string
    title: string
  }
  priority: Priority
}

type CalendarView = 'day' | 'week' | 'month'

export function TaskCalendar({ currentUser }: TaskCalendarProps) {
  const [view, setView] = React.useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [selectedFilters, setSelectedFilters] = React.useState({
    assignees: [] as string[],
    statuses: [] as SubtaskStatus[],
    recurringTypes: [] as RecurringType[],
    priorities: [] as string[]
  })
  const [selectedSubtask, setSelectedSubtask] = React.useState<TaskForCalendar | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false)

  // Buscar tarefas baseado no papel do usuário (com auto-refetch)
  const { data: allSubtasks, isLoading } = api.subtask.getByUser.useQuery({
    userId: currentUser.id,
    userRole: currentUser.role as any,
    showAllTasks: true // Calendário sempre mostra todas as tarefas para ADMIN/MANAGER
  }, {
    refetchInterval: 10000, // Atualiza a cada 10 segundos no calendário
    refetchIntervalInBackground: true,
  })



  // Funções para modal de detalhes
  const handleOpenDetails = (subtask: TaskForCalendar) => {
    setSelectedSubtask(subtask)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetails = () => {
    setSelectedSubtask(null)
    setIsDetailsModalOpen(false)
  }

  // Função para verificar se uma tarefa deve aparecer em uma data específica
  const shouldShowTaskOnDate = (task: TaskForCalendar, date: Date): boolean => {
    if (!date) return false

    // Verificar se passou da data de término da recorrência
    if (task.recurringEndDate && new Date(task.recurringEndDate) < date) {
      // Se tiver deadline, mostrar no deadline
      if (task.deadline && isSameDay(new Date(task.deadline), date)) {
        return true
      }
      return false
    }

    // Tarefas com deadline específico
    if (task.deadline && isSameDay(new Date(task.deadline), date)) {
      return true
    }

    // Tarefas "Aguardando Aprovação" aparecem apenas:
    // 1. No deadline (se tiver)
    // 2. Na data de conclusão (se tiver)
    // 3. Na data atual (hoje)
    if (task.status === 'COMPLETED_PENDING') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const checkDate = new Date(date)
      checkDate.setHours(0, 0, 0, 0)
      
      // Mostrar na data atual
      if (isSameDay(checkDate, today)) {
        return true
      }
      
      // Mostrar na data de conclusão se tiver
      if (task.completedAt && isSameDay(new Date(task.completedAt), date)) {
        return true
      }
      
      return false
    }

    // Tarefas aprovadas aparecem apenas na data de conclusão ou deadline
    if (task.status === 'APPROVED') {
      // Se tem deadline, mostrar no deadline
      if (task.deadline && isSameDay(new Date(task.deadline), date)) {
        return true
      }
      
      // Se tem data de conclusão, mostrar na data de conclusão
      if (task.completedAt && isSameDay(new Date(task.completedAt), date)) {
        return true
      }
      
      return false
    }

    // Tarefas recorrentes
    if (task.isRecurring && task.recurringType) {
      const dayOfWeek = date.getDay()
      const dayOfMonth = date.getDate()
      
      // Verificar se deve pular fins de semana
      if (task.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
        return false
      }

      // TODO: Implementar verificação de feriados quando tivermos lista de feriados
      // if (task.skipHolidays && isHoliday(date)) {
      //   return false
      // }

      switch (task.recurringType) {
        case 'DAILY':
          return true // Aparece todos os dias (respeitando fins de semana se configurado)
          
        case 'WEEKLY':
          // Verificar novo formato (array de dias)
          if (task.recurringWeekDays) {
            try {
              const weekDays = JSON.parse(task.recurringWeekDays) as WeekDay[]
              const weekDayMap: Record<WeekDay, number> = {
                'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
                'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
              }
              return weekDays.some(wd => weekDayMap[wd] === dayOfWeek)
            } catch (e) {
              console.error('Erro ao parsear recurringWeekDays:', e)
            }
          }
          // Fallback para formato antigo
          if (task.recurringWeekDay) {
            const weekDayMap: Record<WeekDay, number> = {
              'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
              'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
            }
            return dayOfWeek === weekDayMap[task.recurringWeekDay]
          }
          return false
          
        case 'BIWEEKLY':
          // Quinzenal - mesma lógica de WEEKLY mas com intervalo de 2 semanas
          // Para simplificar, vamos usar o mesmo critério de dias da semana
          if (task.recurringWeekDays) {
            try {
              const weekDays = JSON.parse(task.recurringWeekDays) as WeekDay[]
              const weekDayMap: Record<WeekDay, number> = {
                'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
                'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
              }
              // TODO: Melhorar para verificar se é uma semana par/ímpar
              return weekDays.some(wd => weekDayMap[wd] === dayOfWeek)
            } catch (e) {
              console.error('Erro ao parsear recurringWeekDays:', e)
            }
          }
          return false
          
        case 'MONTHLY':
          // Verificar novo formato (array de dias)
          if (task.recurringMonthDays) {
            try {
              const monthDays = JSON.parse(task.recurringMonthDays) as number[]
              return monthDays.includes(dayOfMonth)
            } catch (e) {
              console.error('Erro ao parsear recurringMonthDays:', e)
            }
          }
          // Fallback para formato antigo
          if (task.recurringDay) {
            return dayOfMonth === task.recurringDay
          }
          return false
          
        case 'CUSTOM':
          // Personalizado com intervalo
          if (task.recurringInterval) {
            // TODO: Implementar lógica de intervalo customizado
            // Por enquanto, mostrar diariamente
            return true
          }
          return false
          
        default:
          return false
      }
    }

    return false
  }

  // Função para verificar se uma tarefa foi concluída em uma data específica
  const isTaskCompletedOnDate = (task: TaskForCalendar, date: Date): boolean => {
    if (!date) return false
    
    // Se a tarefa está aprovada, ela é considerada concluída
    if (task.status === 'APPROVED') {
      return true
    }
    
    // Se a tarefa está aguardando aprovação, ela é considerada concluída
    if (task.status === 'COMPLETED_PENDING') {
      return true
    }
    
    // Se tem data de conclusão, verificar se foi concluída nessa data
    if (task.completedAt) {
      return isSameDay(new Date(task.completedAt), date)
    }
    
    return false
  }

  // Função para verificar se uma tarefa está atrasada em uma data específica
  const isTaskOverdueOnDate = (task: TaskForCalendar, date: Date): boolean => {
    if (!date) return false
    
    // Tarefas aprovadas nunca são consideradas atrasadas
    if (task.status === 'APPROVED') {
      return false
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    
    // Se a data já passou e a tarefa não foi concluída
    return checkDate < today && !isTaskCompletedOnDate(task, date)
  }

  // Função para obter o status de uma tarefa em uma data específica
  const getTaskStatusOnDate = (task: TaskForCalendar, date: Date) => {
    if (!date) return 'pending'
    
    // Tarefas "Aguardando Aprovação" têm status especial
    if (task.status === 'COMPLETED_PENDING') {
      return 'pending-approval'
    }
    
    if (isTaskCompletedOnDate(task, date)) {
      return 'completed'
    }
    if (isTaskOverdueOnDate(task, date)) {
      return 'overdue'
    }
    return 'pending'
  }

  // Navegação do calendário
  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const goToPrev = () => {
    if (view === 'day') {
      setCurrentDate((prev) => addDays(prev, -1))
    } else if (view === 'week') {
      setCurrentDate((prev) => subWeeks(prev, 1))
    } else {
      setCurrentDate((prev) => subMonths(prev, 1))
    }
  }

  const goToNext = () => {
    if (view === 'day') {
      setCurrentDate((prev) => addDays(prev, 1))
    } else if (view === 'week') {
      setCurrentDate((prev) => addWeeks(prev, 1))
    } else {
      setCurrentDate((prev) => addMonths(prev, 1))
    }
  }

  // Filtrar tarefas baseado nos filtros selecionados
  const filteredSubtasks = React.useMemo(() => {
    if (!allSubtasks) return []

    return allSubtasks.filter(task => {
      // Filtro por responsável
      if (selectedFilters.assignees.length > 0) {
        const assigneeName = task.assignedTo?.name
        if (!assigneeName || !selectedFilters.assignees.includes(assigneeName)) {
          return false
        }
      }

      // Filtro por status
      if (selectedFilters.statuses.length > 0) {
        if (!selectedFilters.statuses.includes(task.status)) {
          return false
        }
      }

      // Filtro por prioridade
      if (selectedFilters.priorities.length > 0) {
        if (!selectedFilters.priorities.includes(task.priority)) {
          return false
        }
      }

      // Filtro por tipo de recorrência
      if (selectedFilters.recurringTypes.length > 0) {
        if (task.isRecurring && task.recurringType) {
          // Se é recorrente, deve estar na lista de tipos selecionados
          if (!selectedFilters.recurringTypes.includes(task.recurringType)) {
            return false
          }
        } else {
          // Se não é recorrente e estamos filtrando por tipos específicos de recorrência,
          // não mostrar (pois queremos apenas as recorrentes dos tipos selecionados)
          return false
        }
      }
      // Se não há filtros de recorrência, mostrar todas as tarefas (recorrentes e não recorrentes)

      return true
    })
  }, [allSubtasks, selectedFilters])


  // Calcular tarefas para cada dia baseado na visualização atual
  const tasksByDate = React.useMemo(() => {
    if (!filteredSubtasks) return {}

    let daysToProcess: Date[] = []

    if (view === 'day') {
      // Apenas o dia atual
      daysToProcess = [currentDate]
    } else if (view === 'week') {
      // Uma semana começando na segunda-feira
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      for (let i = 0; i < 7; i++) {
        daysToProcess.push(addDays(weekStart, i))
      }
    } else {
      // Mês completo
      const monthStart = startOfMonth(currentDate)
      for (let i = 0; i < getDaysInMonth(currentDate); i++) {
        daysToProcess.push(addDays(monthStart, i))
      }
    }

    const tasksMap: Record<string, TaskForCalendar[]> = {}

    daysToProcess.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      const tasksForDay: TaskForCalendar[] = []

      filteredSubtasks.forEach(task => {
        if (shouldShowTaskOnDate(task, day)) {
          tasksForDay.push(task)
        }
      })

      if (tasksForDay.length > 0) {
        tasksMap[dayKey] = tasksForDay
      }
    })

    return tasksMap
  }, [filteredSubtasks, currentDate, view])

  // Renderizar tarefas para um dia
  const renderTasksForDay = (date: Date) => {
    if (!date) return null
    
    const dayKey = format(date, 'yyyy-MM-dd')
    const tasks = tasksByDate[dayKey] || []

    if (tasks.length === 0) return null

    return (
      <div className="space-y-0.5 mt-0.5">
        {tasks.slice(0, 3).map((task) => {
          const status = getTaskStatusOnDate(task, date)
          return (
            <div
              key={`${task.id}-${dayKey}`}
              className={cn(
                "text-[11px] px-1.5 py-0.5 rounded truncate flex items-center gap-1 cursor-pointer transition-opacity hover:opacity-90",
                status === 'completed' 
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400' 
                  : status === 'overdue'
                  ? 'bg-red-500/15 text-red-700 dark:text-red-400'
                  : status === 'pending-approval'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : 'bg-muted/50 text-muted-foreground'
              )}
              title={`${task.title} - ${task.mainTask.title}`}
              onClick={() => handleOpenDetails(task)}
            >
              {status === 'completed' && <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />}
              {status === 'overdue' && <XCircle className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />}
              {(status === 'pending-approval' || status === 'pending') && <Clock className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />}
              {task.isRecurring && <RotateCcw className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />}
              <span className="truncate">{task.title}</span>
            </div>
          )
        })}
        {tasks.length > 3 && (
          <div className="text-[10px] text-muted-foreground">
            +{tasks.length - 3}
          </div>
        )}
      </div>
    )
  }

  // Gerar dias baseado na visualização atual
  const generateDays = () => {
    const days = []

    if (view === 'day') {
      // Apenas o dia atual
      days.push(currentDate)
    } else if (view === 'week') {
      // Uma semana começando na segunda-feira
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i))
      }
    } else {
      // Mês completo com 6 semanas (42 dias) para cobrir o mês
      const monthStart = startOfMonth(currentDate)
      const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
      
      for (let i = 0; i < 42; i++) {
        days.push(addDays(startDate, i))
      }
    }

    return days
  }

  const days = generateDays()

  // Formatar título do cabeçalho
  const formatHeaderTitle = () => {
    if (view === 'day') {
      return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = addDays(weekStart, 6)
      return `${format(weekStart, "d 'de' MMMM", { locale: ptBR })} - ${format(weekEnd, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`
    } else {
      return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="app-spinner-md" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <TaskCalendarSidebar
        allSubtasks={allSubtasks}
        selectedFilters={selectedFilters}
        onFiltersChange={setSelectedFilters}
      />
      
      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header compacto */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
                Hoje
              </Button>
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" onClick={goToPrev} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm font-medium min-w-[180px] text-center">
                  {formatHeaderTitle()}
                </span>
                <Button variant="ghost" size="icon" onClick={goToNext} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)}>
                <TabsList className="h-8">
                  <TabsTrigger value="day" className="text-xs px-3">Dia</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-3">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-3">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-3" align="end">
                  <p className="text-xs font-medium mb-2">Legenda</p>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
                      Concluída
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500/80" />
                      Atrasada
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                      Aguardando
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-400/80" />
                      Pendente
                    </div>
                    <div className="flex items-center gap-2">
                      <RotateCcw className="h-3 w-3" />
                      Recorrente
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-4 flex-1 min-h-0">
          {/* Calendário */}
          <div className={cn(
            "border rounded-lg overflow-hidden bg-background",
            view === 'day' ? "grid grid-cols-1" : 
            view === 'week' ? "grid grid-cols-7" : 
            "grid grid-cols-7"
          )}>
            {/* Cabeçalhos dos dias da semana - apenas para semana e mês */}
            {(view === 'week' || view === 'month') && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground border-b bg-muted/30">
                {day}
              </div>
            ))}

            {/* Dias do calendário */}
            {days.map((day, index) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const tasks = tasksByDate[dayKey] || []
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelected = isSameDay(day, selectedDate)
              const isToday = isSameDay(day, new Date())

              return (
                <div
                  key={index}
                  className={cn(
                    "p-1.5 border-b border-r last:border-r-0 relative transition-colors cursor-pointer",
                    view === 'day' ? "min-h-[400px]" : "min-h-[100px]",
                    view === 'month' && !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                    isSelected && "bg-primary/5",
                    "hover:bg-muted/30"
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex justify-between items-center mb-0.5">
                    <span
                      className={cn(
                        "flex items-center justify-center h-6 w-6 text-xs rounded-full",
                        isToday && "bg-primary text-primary-foreground font-medium",
                        isSelected && !isToday && "ring-1 ring-primary ring-inset text-primary font-medium",
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {tasks.length > 0 && (
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {tasks.length}
                      </span>
                    )}
                  </div>
                  
                  {(view === 'day' || view === 'week' || (view === 'month' && isCurrentMonth)) && renderTasksForDay(day)}
                </div>
              )
            })}
          </div>

          {/* Detalhes do dia selecionado */}
          {selectedDate && (
            <div className="mt-4 p-4 rounded-lg bg-muted/20 border">
              <h3 className="text-sm font-medium mb-2">
                {format(selectedDate, "EEEE, dd/MM", { locale: ptBR })}
              </h3>
              {(() => {
                const dayKey = format(selectedDate, 'yyyy-MM-dd')
                const tasks = tasksByDate[dayKey] || []
                
                if (tasks.length === 0) {
                  return (
                    <p className="text-muted-foreground text-xs py-4">
                      Nenhuma tarefa para este dia
                    </p>
                  )
                }

                return (
                  <div className="space-y-1">
                    {tasks.map((task) => {
                      const status = getTaskStatusOnDate(task, selectedDate)
                      return (
                        <div
                          key={`${task.id}-${dayKey}`}
                          className="flex items-center justify-between px-2.5 py-2 rounded-md bg-background border cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleOpenDetails(task)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {status === 'completed' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                            {status === 'overdue' && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                            {(status === 'pending-approval' || status === 'pending') && <Clock className="h-4 w-4 text-amber-600 shrink-0" />}
                            {task.isRecurring && <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <div className="min-w-0">
                              <div className="font-medium text-xs truncate">{task.title}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {task.mainTask.title}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {status === 'completed' ? 'Concluída' : 
                             status === 'overdue' ? 'Atrasada' : 
                             status === 'pending-approval' ? 'Aguardando' : 
                             'Pendente'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modal de Detalhes da Subtarefa */}
      {selectedSubtask && (
        <SubtaskDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetails}
          subtask={selectedSubtask}
          mainTaskId={selectedSubtask.mainTask.id}
        />
      )}
    </div>
  )
}
