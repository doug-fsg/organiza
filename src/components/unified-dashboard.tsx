'use client'

import { useState, useMemo } from 'react'
import { UserRole, Priority, MainTaskStatus, SubtaskStatus } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Search, 
  Filter, 
  Users, 
  Calendar, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  Download,
  PieChart,
  RotateCcw
} from 'lucide-react'
import { api } from '@/lib/api'
import { RecurringTasksPanel } from '@/components/recurring-tasks-panel'

interface User {
  id: string
  name: string
  role: UserRole
}

interface UnifiedDashboardProps {
  currentUser: User
}

export function UnifiedDashboard({ currentUser }: UnifiedDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<MainTaskStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'ALL'>('ALL')
  const [userFilter, setUserFilter] = useState<string>('ALL')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  // Queries
  const { data: mainTasks, isLoading } = api.mainTask.getAll.useQuery()
  const { data: users } = api.user.getAll.useQuery()

  // Filtros aplicados para dashboard
  const filteredTasks = useMemo(() => {
    if (!mainTasks) return []

    return mainTasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter
      
      let matchesUser = true
      if (userFilter !== 'ALL') {
        const hasUserSubtask = task.subtasks.some(subtask => subtask.assignedToId === userFilter)
        const isCreatedByUser = task.createdBy === userFilter
        matchesUser = hasUserSubtask || isCreatedByUser
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesUser
    })
  }, [mainTasks, searchTerm, statusFilter, priorityFilter, userFilter])

  // Métricas calculadas para dashboard
  const dashboardMetrics = useMemo(() => {
    if (!mainTasks) return null

    const totalTasks = mainTasks.length
    const completedTasks = mainTasks.filter(t => t.status === MainTaskStatus.COMPLETED).length
    const inProgressTasks = mainTasks.filter(t => t.status === MainTaskStatus.IN_PROGRESS).length
    const notStartedTasks = mainTasks.filter(t => t.status === MainTaskStatus.NOT_STARTED).length
    
    const totalSubtasks = mainTasks.reduce((acc, task) => acc + task.subtasks.length, 0)
    const completedSubtasks = mainTasks.reduce((acc, task) => {
      return acc + task.subtasks.filter(s => s.status === SubtaskStatus.APPROVED || s.status === SubtaskStatus.APPROVED).length
    }, 0)
    const blockedSubtasks = mainTasks.reduce((acc, task) => {
      return acc + task.subtasks.filter(s => s.status === SubtaskStatus.BLOCKED).length
    }, 0)
    
    const overdueTasks = mainTasks.filter(task => 
      task.deadline && new Date(task.deadline) < new Date() && task.status !== MainTaskStatus.COMPLETED
    ).length

    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const subtaskCompletionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      totalSubtasks,
      completedSubtasks,
      blockedSubtasks,
      overdueTasks,
      taskCompletionRate,
      subtaskCompletionRate
    }
  }, [mainTasks])

  // Análises para relatórios
  const analytics = useMemo(() => {
    if (!mainTasks || !users) return null

    const now = new Date()
    let startDate: Date | null = null

    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    }

    // Filtrar tarefas por período
    const filteredTasks = startDate 
      ? mainTasks.filter(task => new Date(task.createdAt) >= startDate!)
      : mainTasks

    // Métricas gerais
    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter(t => t.status === MainTaskStatus.COMPLETED).length
    const inProgressTasks = filteredTasks.filter(t => t.status === MainTaskStatus.IN_PROGRESS).length
    const overdueTasks = filteredTasks.filter(t => 
      t.deadline && new Date(t.deadline) < now && t.status !== MainTaskStatus.COMPLETED
    ).length

    const totalSubtasks = filteredTasks.reduce((acc, task) => acc + task.subtasks.length, 0)
    const completedSubtasks = filteredTasks.reduce((acc, task) => {
      return acc + task.subtasks.filter(s => 
        s.status === SubtaskStatus.APPROVED || s.status === SubtaskStatus.APPROVED
      ).length
    }, 0)

    // Taxa de conclusão
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
    const subtaskCompletionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

    // Distribuição por prioridade
    const priorityDistribution = {
      [Priority.URGENT]: filteredTasks.filter(t => t.priority === Priority.URGENT).length,
      [Priority.HIGH]: filteredTasks.filter(t => t.priority === Priority.HIGH).length,
      [Priority.MEDIUM]: filteredTasks.filter(t => t.priority === Priority.MEDIUM).length,
      [Priority.LOW]: filteredTasks.filter(t => t.priority === Priority.LOW).length,
    }

    // Performance por usuário
    const userPerformance = users.map(user => {
      const userSubtasks = filteredTasks.reduce((acc, task) => {
        return acc.concat(task.subtasks.filter(s => s.assignedToId === user.id))
      }, [] as any[])

      const userCompletedSubtasks = userSubtasks.filter(s => 
        s.status === SubtaskStatus.APPROVED || s.status === SubtaskStatus.APPROVED
      ).length

      const userOverdueSubtasks = userSubtasks.filter(s => 
        s.deadline && new Date(s.deadline) < now && 
        s.status !== SubtaskStatus.APPROVED && s.status !== SubtaskStatus.APPROVED
      ).length

      const userCompletionRate = userSubtasks.length > 0 ? 
        (userCompletedSubtasks / userSubtasks.length) * 100 : 0

      // Calcular horas trabalhadas vs estimadas
      const totalEstimatedHours = userSubtasks.reduce((acc, s) => acc + (s.estimatedHours || 0), 0)
      const totalActualHours = userSubtasks.reduce((acc, s) => acc + (s.actualHours || 0), 0)

      return {
        user,
        totalSubtasks: userSubtasks.length,
        completedSubtasks: userCompletedSubtasks,
        overdueSubtasks: userOverdueSubtasks,
        completionRate: userCompletionRate,
        totalEstimatedHours,
        totalActualHours,
        efficiency: totalEstimatedHours > 0 ? (totalEstimatedHours / totalActualHours) * 100 : 0
      }
    }).filter(perf => perf.totalSubtasks > 0)

    // Tendências mensais (últimos 6 meses)
    const monthlyTrends = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthTasks = mainTasks.filter(task => {
        const taskDate = new Date(task.createdAt)
        return taskDate >= monthStart && taskDate <= monthEnd
      })

      const monthCompletedTasks = monthTasks.filter(t => t.status === MainTaskStatus.COMPLETED).length

      monthlyTrends.push({
        month: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        totalTasks: monthTasks.length,
        completedTasks: monthCompletedTasks,
        completionRate: monthTasks.length > 0 ? (monthCompletedTasks / monthTasks.length) * 100 : 0
      })
    }

    // Tempo médio de conclusão
    const completedTasksWithDates = filteredTasks.filter(t => 
      t.status === MainTaskStatus.COMPLETED && t.completedAt
    )

    const averageCompletionTime = completedTasksWithDates.length > 0 ? 
      completedTasksWithDates.reduce((acc, task) => {
        const createdDate = new Date(task.createdAt)
        const completedDate = new Date(task.completedAt!)
        const diffDays = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        return acc + diffDays
      }, 0) / completedTasksWithDates.length : 0

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      totalSubtasks,
      completedSubtasks,
      taskCompletionRate,
      subtaskCompletionRate,
      priorityDistribution,
      userPerformance,
      monthlyTrends,
      averageCompletionTime
    }
  }, [mainTasks, users, timeRange])

  // Dados por usuário para dashboard
  const userMetrics = useMemo(() => {
    if (!mainTasks || !users) return []

    return users.map(user => {
      const userSubtasks = mainTasks.reduce((acc, task) => {
        return acc.concat(task.subtasks.filter(s => s.assignedToId === user.id))
      }, [] as any[])

      const completedSubtasks = userSubtasks.filter(s => 
        s.status === SubtaskStatus.APPROVED || s.status === SubtaskStatus.APPROVED
      ).length

      const totalSubtasks = userSubtasks.length
      const completionRate = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0

      const overdueSubtasks = userSubtasks.filter(s => 
        s.deadline && new Date(s.deadline) < new Date() && 
        s.status !== SubtaskStatus.APPROVED && s.status !== SubtaskStatus.APPROVED
      ).length

      return {
        user,
        totalSubtasks,
        completedSubtasks,
        completionRate,
        overdueSubtasks,
        activeSubtasks: userSubtasks.filter(s => s.status === SubtaskStatus.IN_PROGRESS).length,
        blockedSubtasks: userSubtasks.filter(s => s.status === SubtaskStatus.BLOCKED).length
      }
    }).filter(metric => metric.totalSubtasks > 0)
  }, [mainTasks, users])

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'bg-red-100 text-red-800'
      case Priority.HIGH:
        return 'bg-orange-100 text-orange-800'
      case Priority.MEDIUM:
        return 'bg-yellow-100 text-yellow-800'
      case Priority.LOW:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColorSolid = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'bg-red-500'
      case Priority.HIGH:
        return 'bg-orange-500'
      case Priority.MEDIUM:
        return 'bg-yellow-500'
      case Priority.LOW:
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusColor = (status: MainTaskStatus) => {
    switch (status) {
      case MainTaskStatus.NOT_STARTED:
        return 'bg-gray-100 text-gray-800'
      case MainTaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case MainTaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800'
      case MainTaskStatus.CANCELLED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENT:
        return 'Urgente'
      case Priority.HIGH:
        return 'Alta'
      case Priority.MEDIUM:
        return 'Média'
      case Priority.LOW:
        return 'Baixa'
      default:
        return priority
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const calculateTaskProgress = (subtasks: any[]) => {
    if (subtasks.length === 0) return 0
    const completed = subtasks.filter(s => s.status === SubtaskStatus.APPROVED || s.status === SubtaskStatus.APPROVED).length
    return Math.round((completed / subtasks.length) * 100)
  }

  const exportReport = () => {
    if (!analytics) return

    const report = {
      periodo: timeRange,
      geradoEm: new Date().toLocaleDateString('pt-BR'),
      metricas: {
        totalTarefas: analytics.totalTasks,
        tarefasConcluidas: analytics.completedTasks,
        taxaConclusao: analytics.taskCompletionRate,
        tempoMedioConclusao: analytics.averageCompletionTime
      },
      performanceUsuarios: analytics.userPerformance,
      tendenciasMensais: analytics.monthlyTrends
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-taskflow-${timeRange}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <h2 className="text-2xl font-bold">Dashboard e Relatórios</h2>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as MainTaskStatus | 'ALL')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Status</SelectItem>
              <SelectItem value={MainTaskStatus.NOT_STARTED}>Não Iniciada</SelectItem>
              <SelectItem value={MainTaskStatus.IN_PROGRESS}>Em Andamento</SelectItem>
              <SelectItem value={MainTaskStatus.COMPLETED}>Concluída</SelectItem>
              <SelectItem value={MainTaskStatus.CANCELLED}>Cancelada</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as Priority | 'ALL')}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as Prioridades</SelectItem>
              <SelectItem value={Priority.LOW}>Baixa</SelectItem>
              <SelectItem value={Priority.MEDIUM}>Média</SelectItem>
              <SelectItem value={Priority.HIGH}>Alta</SelectItem>
              <SelectItem value={Priority.URGENT}>Urgente</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os Usuários</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas Principais */}
      {dashboardMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total de Tarefas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Math.round(dashboardMetrics.taskCompletionRate)}%</p>
                  <p className="text-xs text-muted-foreground">Taxa de Conclusão</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Activity className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalSubtasks}</p>
                  <p className="text-xs text-muted-foreground">Total Subtarefas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{dashboardMetrics.overdueTasks}</p>
                  <p className="text-xs text-muted-foreground">Tarefas Atrasadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="team">Equipe</TabsTrigger>
          {currentUser.role === UserRole.ADMIN && (
            <TabsTrigger value="recurring">
              <RotateCcw className="h-4 w-4 mr-2" />
              Tarefas Recorrentes
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          {/* Lista de Tarefas Filtradas */}
          <Card>
            <CardHeader>
              <CardTitle>
                Tarefas Principais ({filteredTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const progress = calculateTaskProgress(task.subtasks)
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== MainTaskStatus.COMPLETED
                  
                  return (
                    <div key={task.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{task.title}</h3>
                            {isOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Atrasado
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status === MainTaskStatus.NOT_STARTED && 'Não Iniciada'}
                            {task.status === MainTaskStatus.IN_PROGRESS && 'Em Andamento'}
                            {task.status === MainTaskStatus.COMPLETED && 'Concluída'}
                            {task.status === MainTaskStatus.CANCELLED && 'Cancelada'}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {task.priority === Priority.LOW && 'Baixa'}
                            {task.priority === Priority.MEDIUM && 'Média'}
                            {task.priority === Priority.HIGH && 'Alta'}
                            {task.priority === Priority.URGENT && 'Urgente'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>📋 {task.subtasks.length} subtarefas</span>
                          <span>👤 {task.creator.name}</span>
                          {task.deadline && (
                            <span>📅 {formatDate(task.deadline)}</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={progress} className="w-24" />
                          <span className="text-sm text-muted-foreground">{progress}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma tarefa encontrada com os filtros aplicados</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {analytics && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Progresso Geral */}
                <Card>
                  <CardHeader>
                    <CardTitle>Progresso Geral</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Tarefas Concluídas</span>
                        <span className="text-sm">{analytics.completedTasks}/{analytics.totalTasks}</span>
                      </div>
                      <Progress value={analytics.taskCompletionRate} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Subtarefas Concluídas</span>
                        <span className="text-sm">{analytics.completedSubtasks}/{analytics.totalSubtasks}</span>
                      </div>
                      <Progress value={analytics.subtaskCompletionRate} />
                    </div>
                  </CardContent>
                </Card>

                {/* Status das Tarefas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status das Tarefas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Concluídas</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium">{analytics.completedTasks}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Em Andamento</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium">{analytics.inProgressTasks}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Não Iniciadas</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                          <span className="text-sm font-medium">{analytics.totalTasks - analytics.completedTasks - analytics.inProgressTasks}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Atrasadas</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm font-medium">{analytics.overdueTasks}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tendências Mensais */}
              <Card>
                <CardHeader>
                  <CardTitle>Tendências Mensais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.monthlyTrends.map((trend, index) => (
                      <div key={trend.month} className="flex items-center justify-between py-2 border-b last:border-b-0">
                        <div className="flex-1">
                          <p className="font-medium">{trend.month}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <span>{trend.totalTasks} tarefas</span>
                            <span>{trend.completedTasks} concluídas</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Progress value={trend.completionRate} className="w-20" />
                          <span className="text-sm font-medium w-12">{Math.round(trend.completionRate)}%</span>
                          {index > 0 && (
                            <div className="w-6">
                              {trend.completionRate > analytics.monthlyTrends[index - 1].completionRate ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : trend.completionRate < analytics.monthlyTrends[index - 1].completionRate ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição por Prioridade */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analytics.priorityDistribution).map(([priority, count]) => {
                      const percentage = analytics.totalTasks > 0 ? (count / analytics.totalTasks) * 100 : 0
                      return (
                        <div key={priority} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">
                              {getPriorityLabel(priority as Priority)}
                            </span>
                            <span className="text-sm">{count} tarefas ({Math.round(percentage)}%)</span>
                          </div>
                          <div className="relative">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${getPriorityColorSolid(priority as Priority)}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          {/* Performance da Equipe */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userMetrics.map((metric) => (
              <Card key={metric.user.id}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {metric.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium">{metric.user.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {metric.user.role === UserRole.ADMIN && 'Administrador'}
                        {metric.user.role === UserRole.MANAGER && 'Gerente'}
                        {metric.user.role === UserRole.MEMBER && 'Membro'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{Math.round(metric.completionRate)}%</span>
                    </div>
                    <Progress value={metric.completionRate} />
                    
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total</p>
                        <p className="font-medium">{metric.totalSubtasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Concluídas</p>
                        <p className="font-medium">{metric.completedSubtasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ativas</p>
                        <p className="font-medium">{metric.activeSubtasks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Bloqueadas</p>
                        <p className="font-medium text-red-600">{metric.blockedSubtasks}</p>
                      </div>
                    </div>
                    
                    {metric.overdueSubtasks > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-600">
                        ⚠️ {metric.overdueSubtasks} tarefa(s) atrasada(s)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {currentUser.role === UserRole.ADMIN && (
          <TabsContent value="recurring" className="space-y-4">
            <RecurringTasksPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
