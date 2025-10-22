'use client'

import * as React from 'react'
import { addDays, addMonths, addWeeks, subMonths, subWeeks, format, getDaysInMonth, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, RotateCcw, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { SubtaskStatus, RecurringType, WeekDay, Priority } from '@prisma/client'
import { TaskCalendarSidebar } from './task-calendar-sidebar'
import { SubtaskDetailsModal } from './subtask-details-modal'

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
      <div className="space-y-1 mt-1">
        {tasks.slice(0, 3).map((task) => {
          const status = getTaskStatusOnDate(task, date)
          return (
            <div
              key={`${task.id}-${dayKey}`}
              className={cn(
                "text-xs p-1 rounded truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
                status === 'completed' 
                  ? 'bg-green-100 text-green-800' 
                  : status === 'overdue'
                  ? 'bg-red-100 text-red-800'
                  : status === 'pending-approval'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-yellow-100 text-yellow-800'
              )}
              title={`${task.title} - ${task.mainTask.title} (clique para ver detalhes)`}
              onClick={() => handleOpenDetails(task)}
            >
              {status === 'completed' && <CheckCircle2 className="h-3 w-3 flex-shrink-0" />}
              {status === 'overdue' && <XCircle className="h-3 w-3 flex-shrink-0" />}
              {status === 'pending-approval' && <Clock className="h-3 w-3 flex-shrink-0" />}
              {status === 'pending' && <Clock className="h-3 w-3 flex-shrink-0" />}
              {task.isRecurring && <RotateCcw className="h-3 w-3 flex-shrink-0" />}
              <span className="truncate">{task.title}</span>
            </div>
          )
        })}
        {tasks.length > 3 && (
          <div className="text-xs text-muted-foreground text-center">
            +{tasks.length - 3} mais
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendário de Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Carregando calendário...</span>
          </div>
        </CardContent>
      </Card>
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
      <div className="flex-1 flex flex-col">
        <Card className="flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Calendário de Tarefas
              </CardTitle>
              <Tabs value={view} onValueChange={(v) => setView(v as CalendarView)} className="w-auto">
                <TabsList className="grid w-auto grid-cols-3 h-9 rounded-lg">
                  <TabsTrigger value="day" className="px-3 text-xs sm:text-sm">
                    Dia
                  </TabsTrigger>
                  <TabsTrigger value="week" className="px-3 text-xs sm:text-sm">
                    Semana
                  </TabsTrigger>
                  <TabsTrigger value="month" className="px-3 text-xs sm:text-sm">
                    Mês
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={goToToday} className="rounded-full px-4 text-sm font-medium">
                  Hoje
                </Button>
                <div className="flex items-center">
                  <Button variant="ghost" size="icon" onClick={goToPrev} className="rounded-full">
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={goToNext} className="rounded-full">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <h2 className="text-lg font-semibold">{formatHeaderTitle()}</h2>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-100 rounded"></div>
                  <span>Concluída</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-100 rounded"></div>
                  <span>Atrasada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-100 rounded"></div>
                  <span>Aguardando Aprovação</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-100 rounded"></div>
                  <span>Pendente</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-3 w-3" />
                  <span>Recorrente</span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
        <div className="space-y-4">
          {/* Calendário */}
          <div className={cn(
            "h-full border rounded-lg overflow-hidden",
            view === 'day' ? "grid grid-cols-1" : 
            view === 'week' ? "grid grid-cols-7" : 
            "grid grid-cols-7"
          )}>
            {/* Cabeçalhos dos dias da semana - apenas para semana e mês */}
            {(view === 'week' || view === 'month') && ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="p-3 text-center text-sm font-medium border-r border-b bg-gray-50">
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
                    "p-2 border-r border-b relative transition-colors cursor-pointer",
                    view === 'day' ? "min-h-[400px]" : "min-h-[120px]",
                    view === 'month' && !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                    isSelected && "bg-blue-50",
                    "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className={cn(
                        "flex items-center justify-center h-7 w-7 text-sm rounded-full",
                        isToday && "bg-blue-600 text-white font-medium",
                        isSelected && !isToday && "border-2 border-blue-600 text-blue-600 font-medium",
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {tasks.length > 0 && (
                      <Badge variant="secondary" className="h-5 text-xs">
                        {tasks.length}
                      </Badge>
                    )}
                  </div>
                  
                  {(view === 'day' || view === 'week' || (view === 'month' && isCurrentMonth)) && renderTasksForDay(day)}
                </div>
              )
            })}
          </div>

          {/* Detalhes do dia selecionado */}
          {selectedDate && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Tarefas para {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
              </h3>
              {(() => {
                const dayKey = format(selectedDate, 'yyyy-MM-dd')
                const tasks = tasksByDate[dayKey] || []
                
                if (tasks.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CalendarIcon className="h-12 w-12 text-gray-300 mb-2" />
                      <p className="text-muted-foreground text-sm">
                        Nenhuma tarefa para este dia
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-2">
                    {tasks.map((task) => {
                      const status = getTaskStatusOnDate(task, selectedDate)
                      return (
                        <div
                          key={`${task.id}-${dayKey}`}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleOpenDetails(task)}
                        >
                          <div className="flex items-center gap-3">
                            {status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            {status === 'overdue' && <XCircle className="h-5 w-5 text-red-600" />}
                            {status === 'pending-approval' && <Clock className="h-5 w-5 text-orange-600" />}
                            {status === 'pending' && <Clock className="h-5 w-5 text-yellow-600" />}
                            {task.isRecurring && <RotateCcw className="h-5 w-5 text-blue-600" />}
                            <div>
                              <div className="font-medium text-sm">{task.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {task.mainTask.title}
                              </div>
                              {task.assignedTo && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Atribuído para: {task.assignedTo.name}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                status === 'completed' ? 'default' : 
                                status === 'overdue' ? 'destructive' : 
                                status === 'pending-approval' ? 'secondary' : 
                                'secondary'
                              }
                              className={
                                status === 'pending-approval' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' : ''
                              }
                            >
                              {status === 'completed' ? 'Concluída' : 
                               status === 'overdue' ? 'Atrasada' : 
                               status === 'pending-approval' ? 'Aguardando Aprovação' : 
                               'Pendente'}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
          </CardContent>
        </Card>
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
