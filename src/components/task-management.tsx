'use client'

import { useState } from 'react'
import { UserRole, Priority, MainTaskStatus } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { WorkflowProgressBarAggregate } from '@/components/workflow-progress-bar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Plus, Users, Clock, AlertTriangle, CheckCircle2, MoreHorizontal, GitBranch, Edit, PlusCircle, Trash2, Layers, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu'
import { getPriorityClasses } from '@/lib/theme-utils'
import { RecurringTaskConfig } from './recurring-task-config'
import { DepartmentSelector } from './department/department-selector'
import { ClientSelector } from './client/client-selector'
import { ClientBadge } from './client/client-badge'

interface User {
  id: string
  name: string
  role: UserRole
}

interface TaskManagementProps {
  currentUser: User
}

export function TaskManagement({ currentUser }: TaskManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubtaskEditDialogOpen, setIsSubtaskEditDialogOpen] = useState(false)
  const [selectedMainTaskId, setSelectedMainTaskId] = useState<string>('')
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any>(null)
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<any>(null)
  const [selectedSubtaskForEdit, setSelectedSubtaskForEdit] = useState<any>(null)
  const [taskToDelete, setTaskToDelete] = useState<any>(null)
  const [applyModelConfirm, setApplyModelConfirm] = useState<{
    modelId: string
    modelName: string
    mainTaskId: string
  } | null>(null)
  const [clientFilterId, setClientFilterId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<MainTaskStatus | 'ALL'>('OPEN') // Filtro padrão: projetos em aberto
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Estados do formulário de tarefa principal
  const [mainTaskForm, setMainTaskForm] = useState<{
    title: string
    description: string
    priority: Priority
    deadline: string
    departmentIds: string[]
    clientId: string | null
  }>({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    deadline: '',
    departmentIds: [],
    clientId: null,
  })

  // Estados do formulário de edição de tarefa principal
  const [editTaskForm, setEditTaskForm] = useState<{
    title: string
    description: string
    priority: Priority
    deadline: string
    status: MainTaskStatus
    departmentIds: string[]
    clientId: string | null
  }>({
    title: '',
    description: '',
    priority: Priority.MEDIUM,
    deadline: '',
    status: MainTaskStatus.NOT_STARTED,
    departmentIds: [],
    clientId: null,
  })

  // Estados do formulário de edição de subtarefa
  const [editSubtaskForm, setEditSubtaskForm] = useState<{
    title: string
    description: string
    assignedToId: string
    priority: Priority
    deadline: string
    estimatedHours: string
    status: string
    dependencyIds: string[]
    requiresApproval: boolean
    isRecurring: boolean
    recurringType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM' | ''
    recurringWeekDays: string[]
    recurringMonthDays: number[]
    recurringInterval: number
    skipWeekends: boolean
    skipHolidays: boolean
    recurringEndDate: string
  }>({
    title: '',
    description: '',
    assignedToId: '',
    priority: Priority.MEDIUM,
    deadline: '',
    estimatedHours: '',
    status: 'TODO',
    dependencyIds: [],
    requiresApproval: true,
    isRecurring: false,
    recurringType: '',
    recurringWeekDays: [],
    recurringMonthDays: [],
    recurringInterval: 1,
    skipWeekends: false,
    skipHolidays: false,
    recurringEndDate: '',
  })

  // Estados do formulário de subtarefa
  const [subtaskForm, setSubtaskForm] = useState<{
    title: string
    description: string
    assignedToId: string
    priority: Priority
    deadline: string
    estimatedHours: string
    dependencyIds: string[]
    requiresApproval: boolean
    isRecurring: boolean
    recurringType: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM' | ''
    recurringWeekDays: string[]
    recurringMonthDays: number[]
    recurringInterval: number
    skipWeekends: boolean
    skipHolidays: boolean
    recurringEndDate: string
  }>({
    title: '',
    description: '',
    assignedToId: '',
    priority: Priority.MEDIUM,
    deadline: '',
    estimatedHours: '',
    dependencyIds: [],
    requiresApproval: true,
    isRecurring: false,
    recurringType: '',
    recurringWeekDays: [],
    recurringMonthDays: [],
    recurringInterval: 1,
    skipWeekends: false,
    skipHolidays: false,
    recurringEndDate: '',
  })

  const utils = api.useUtils()

  // Queries
  const { data: allMainTasks, isLoading } = api.mainTask.getAll.useQuery(
    clientFilterId ? { clientId: clientFilterId } : undefined
  )

  // Filtrar tarefas por status
  const filteredTasks = allMainTasks?.filter(task => {
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'OPEN') return task.status !== MainTaskStatus.COMPLETED
    return task.status === statusFilter
  }) || []

  // Paginação
  const totalItems = filteredTasks.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const mainTasks = filteredTasks.slice(startIndex, endIndex)

  // Reset página quando filtros mudam
  const resetPagination = () => setCurrentPage(1)
  const { data: users } = api.user.getAll.useQuery()
  const { data: subtaskModels } = api.subtaskTemplate.getAll.useQuery()
  const { data: mainTaskSubtasks } = api.subtask.getByMainTask.useQuery(
    { mainTaskId: selectedMainTaskId },
    { enabled: !!selectedMainTaskId }
  )

  // Mutations
  const createMainTask = api.mainTask.create.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      setIsCreateDialogOpen(false)
      setMainTaskForm({ title: '', description: '', priority: Priority.MEDIUM, deadline: '', departmentIds: [], clientId: null })
      toast.success('Projeto criado com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao criar projeto: ${error.message}`)
    },
  })

  const updateMainTask = api.mainTask.update.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      setIsEditDialogOpen(false)
      setSelectedTaskForEdit(null)
      toast.success('Projeto atualizado com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar projeto: ${error.message}`)
    },
  })

  const deleteMainTask = api.mainTask.delete.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      toast.success('Projeto deletado com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao deletar projeto: ${error.message}`)
    },
  })

  const updateSubtask = api.subtask.update.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      setIsSubtaskEditDialogOpen(false)
      setSelectedSubtaskForEdit(null)
      toast.success('Tarefa atualizada com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar tarefa: ${error.message}`)
    },
  })

  const createSubtask = api.subtask.create.useMutation({
    onError: (error) => {
      toast.error(`Erro ao criar tarefa: ${error.message}`)
    },
  })

  const addDependency = api.subtask.addDependency.useMutation({
    onError: (error) => {
      console.error('Erro ao criar dependência:', error)
      toast.error('Erro ao criar algumas dependências')
    },
  })

  const deleteSubtask = api.subtask.delete.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      toast.success('Tarefa deletada com sucesso!')
    },
    onError: (error) => {
      toast.error(`Erro ao deletar tarefa: ${error.message}`)
    },
  })

  const applyModelMutation = api.subtaskTemplate.applyToExistingProject.useMutation({
    onSuccess: () => {
      utils.mainTask.getAll.invalidate()
      setApplyModelConfirm(null)
      toast.success('Modelo aplicado! Tarefas substituídas.')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleCreateMainTask = () => {
    if (!mainTaskForm.title) {
      toast.error('Título é obrigatório')
      return
    }

    createMainTask.mutate({
      title: mainTaskForm.title,
      description: mainTaskForm.description || undefined,
      priority: mainTaskForm.priority,
      deadline: mainTaskForm.deadline ? new Date(mainTaskForm.deadline) : undefined,
      departmentIds: mainTaskForm.departmentIds.length > 0 ? mainTaskForm.departmentIds : undefined,
      clientId: mainTaskForm.clientId ?? undefined,
    })
  }

  const handleEditTask = (task: any) => {
    setSelectedTaskForEdit(task)
    setSelectedTaskForDetails(task)
    const currentDepartmentIds = task.departmentTasks?.map((dt: any) => dt.departmentId) || []
    setEditTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      deadline: task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : '',
      status: task.status,
      departmentIds: currentDepartmentIds,
      clientId: task.clientId ?? null,
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteTask = (task: any) => {
    setTaskToDelete(task)
  }

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteMainTask.mutate({ id: taskToDelete.id })
      setTaskToDelete(null)
    }
  }

  const handleUpdateMainTask = () => {
    if (!editTaskForm.title || !selectedTaskForEdit) {
      toast.error('Título é obrigatório')
      return
    }

    updateMainTask.mutate({
      id: selectedTaskForEdit.id,
      title: editTaskForm.title,
      description: editTaskForm.description || undefined,
      priority: editTaskForm.priority,
      deadline: editTaskForm.deadline ? new Date(editTaskForm.deadline) : undefined,
      status: editTaskForm.status,
      departmentIds: editTaskForm.departmentIds.length > 0 ? editTaskForm.departmentIds : [],
      clientId: editTaskForm.clientId,
    })
  }

  const handleEditSubtask = (subtask: any) => {
    setSelectedSubtaskForEdit(subtask)
    
    // Parse recurringWeekDays e recurringMonthDays se forem strings JSON
    let recurringWeekDays: string[] = []
    let recurringMonthDays: number[] = []
    
    try {
      if (subtask.recurringWeekDays) {
        recurringWeekDays = typeof subtask.recurringWeekDays === 'string' 
          ? JSON.parse(subtask.recurringWeekDays) 
          : subtask.recurringWeekDays
      }
    } catch (e) {
      console.error('Erro ao parsear recurringWeekDays:', e)
    }
    
    try {
      if (subtask.recurringMonthDays) {
        recurringMonthDays = typeof subtask.recurringMonthDays === 'string' 
          ? JSON.parse(subtask.recurringMonthDays) 
          : subtask.recurringMonthDays
      }
    } catch (e) {
      console.error('Erro ao parsear recurringMonthDays:', e)
    }
    
    setEditSubtaskForm({
      title: subtask.title,
      description: subtask.description || '',
      assignedToId: subtask.assignedToId || '',
      priority: subtask.priority,
      deadline: subtask.deadline ? new Date(subtask.deadline).toISOString().split('T')[0] : '',
      estimatedHours: subtask.estimatedHours?.toString() || '',
      status: subtask.status,
      dependencyIds: subtask.dependencies?.map((dep: any) => dep.blocking.id) || [],
      requiresApproval: subtask.requiresApproval ?? true,
      isRecurring: subtask.isRecurring ?? false,
      recurringType: subtask.recurringType || '',
      recurringWeekDays,
      recurringMonthDays,
      recurringInterval: subtask.recurringInterval || 1,
      skipWeekends: subtask.skipWeekends ?? false,
      skipHolidays: subtask.skipHolidays ?? false,
      recurringEndDate: subtask.recurringEndDate ? new Date(subtask.recurringEndDate).toISOString().split('T')[0] : '',
    })
    setIsSubtaskEditDialogOpen(true)
  }

  const handleUpdateSubtask = () => {
    if (!editSubtaskForm.title || !selectedSubtaskForEdit) {
      toast.error('Título é obrigatório')
      return
    }

    updateSubtask.mutate({
      id: selectedSubtaskForEdit.id,
      title: editSubtaskForm.title,
      description: editSubtaskForm.description || undefined,
      assignedToId: editSubtaskForm.assignedToId || undefined,
      priority: editSubtaskForm.priority,
      deadline: editSubtaskForm.deadline ? new Date(editSubtaskForm.deadline) : undefined,
      estimatedHours: editSubtaskForm.estimatedHours ? Number(editSubtaskForm.estimatedHours) : undefined,
      status: editSubtaskForm.status as any,
      dependencyIds: editSubtaskForm.dependencyIds,
      requiresApproval: editSubtaskForm.requiresApproval,
      isRecurring: editSubtaskForm.isRecurring,
      recurringType: editSubtaskForm.recurringType || undefined,
      recurringWeekDays: editSubtaskForm.recurringWeekDays.length > 0 ? editSubtaskForm.recurringWeekDays as any[] : undefined,
      recurringMonthDays: editSubtaskForm.recurringMonthDays.length > 0 ? editSubtaskForm.recurringMonthDays : undefined,
      recurringInterval: editSubtaskForm.recurringInterval > 1 ? editSubtaskForm.recurringInterval : undefined,
      skipWeekends: editSubtaskForm.skipWeekends,
      skipHolidays: editSubtaskForm.skipHolidays,
      recurringEndDate: editSubtaskForm.recurringEndDate ? new Date(editSubtaskForm.recurringEndDate) : undefined,
    })
  }

  const handleDeleteSubtask = (subtask: any) => {
    deleteSubtask.mutate({ id: subtask.id })
  }

  const handleCreateSubtask = async () => {
    if (!subtaskForm.title || !selectedMainTaskId) {
      toast.error('Título do projeto é obrigatório')
      return
    }

    try {
      // Criar a subtarefa
      const createdSubtask = await createSubtask.mutateAsync({
        title: subtaskForm.title,
        description: subtaskForm.description || undefined,
        mainTaskId: selectedMainTaskId,
        assignedToId: subtaskForm.assignedToId || undefined,
        priority: subtaskForm.priority,
        deadline: subtaskForm.deadline ? new Date(subtaskForm.deadline) : undefined,
        estimatedHours: subtaskForm.estimatedHours ? Number(subtaskForm.estimatedHours) : undefined,
        requiresApproval: subtaskForm.requiresApproval,
        creatorRole: currentUser.role,
        isRecurring: subtaskForm.isRecurring,
        recurringType: subtaskForm.recurringType || undefined,
        recurringWeekDays: subtaskForm.recurringWeekDays.length > 0 ? subtaskForm.recurringWeekDays as any[] : undefined,
        recurringMonthDays: subtaskForm.recurringMonthDays.length > 0 ? subtaskForm.recurringMonthDays : undefined,
        recurringInterval: subtaskForm.recurringInterval > 1 ? subtaskForm.recurringInterval : undefined,
        skipWeekends: subtaskForm.skipWeekends,
        skipHolidays: subtaskForm.skipHolidays,
        recurringEndDate: subtaskForm.recurringEndDate ? new Date(subtaskForm.recurringEndDate) : undefined,
      })

      // Criar dependências se foram selecionadas
      if (subtaskForm.dependencyIds.length > 0) {
        for (const dependencyId of subtaskForm.dependencyIds) {
          try {
            await addDependency.mutateAsync({
              dependentId: createdSubtask.id,
              blockedById: dependencyId,
            })
          } catch (error) {
            console.error('Erro ao criar dependência:', error)
          }
        }
        toast.success('Tarefa e dependências criadas com sucesso!')
      }

      // Reset form
      setSubtaskForm({
        title: '',
        description: '',
        assignedToId: '',
        priority: Priority.MEDIUM,
        deadline: '',
        estimatedHours: '',
        dependencyIds: [],
        requiresApproval: true,
        isRecurring: false,
        recurringType: '',
        recurringWeekDays: [],
        recurringMonthDays: [],
        recurringInterval: 1,
        skipWeekends: false,
        skipHolidays: false,
        recurringEndDate: '',
      })
      setIsSubtaskDialogOpen(false)
    } catch (error) {
      toast.error('Erro ao criar tarefa')
    }
  }

  const getPriorityColor = (priority: Priority) => {
    return getPriorityClasses(priority)
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

  const formatDate = (date: Date | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gerenciamento de Projetos</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gerenciamento de Projetos</h2>
        <div className="flex space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Projeto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
<DialogTitle>Criar Projeto</DialogTitle>
            <DialogDescription>
              Crie um novo projeto que pode conter múltiplas tarefas
            </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={mainTaskForm.title}
                    onChange={(e) => setMainTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Criar software de e-commerce"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={mainTaskForm.description}
                    onChange={(e) => setMainTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada da tarefa..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select value={mainTaskForm.priority} onValueChange={(value) => setMainTaskForm(prev => ({ ...prev, priority: value as Priority }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Priority.LOW}>Baixa</SelectItem>
                        <SelectItem value={Priority.MEDIUM}>Média</SelectItem>
                        <SelectItem value={Priority.HIGH}>Alta</SelectItem>
                        <SelectItem value={Priority.URGENT}>Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Prazo</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={mainTaskForm.deadline}
                      onChange={(e) => setMainTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cliente vinculado</Label>
                  <ClientSelector
                    value={mainTaskForm.clientId}
                    onChange={(id) => setMainTaskForm(prev => ({ ...prev, clientId: id }))}
                    placeholder="Selecionar cliente (opcional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Setores</Label>
                  <DepartmentSelector
                    value={mainTaskForm.departmentIds}
                    onChange={(ids) => setMainTaskForm(prev => ({ ...prev, departmentIds: ids }))}
                    multiple={true}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false)
                    setMainTaskForm({
                      title: '',
                      description: '',
                      priority: Priority.MEDIUM,
                      deadline: '',
                      departmentIds: [],
                      clientId: null,
                    })
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateMainTask} disabled={createMainTask.isPending}>
                    {createMainTask.isPending ? 'Criando...' : 'Criar Projeto'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>


      {/* Tabela de Projetos */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <CardTitle>Projetos</CardTitle>
              <span className="state-message-sm">
                {totalItems} {totalItems === 1 ? 'projeto' : 'projetos'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select 
                  value={statusFilter} 
                  onValueChange={(value: MainTaskStatus | 'ALL' | 'OPEN') => {
                    setStatusFilter(value)
                    resetPagination()
                  }}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Em Aberto</SelectItem>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="NOT_STARTED">Não Iniciados</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                    <SelectItem value="COMPLETED">Concluídos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Contato:</span>
                <ClientSelector
                  value={clientFilterId}
                  onChange={(value) => {
                    setClientFilterId(value)
                    resetPagination()
                  }}
                  placeholder="Todos"
                  className="w-[150px]"
                  filterMode
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mainTasks?.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.subtasks.length} tarefas</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.client ? (
                        <ClientBadge name={task.client.name} />
                      ) : (
                        <span className="text-sm text-muted-foreground italic">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status === MainTaskStatus.NOT_STARTED && 'Não Iniciada'}
                        {task.status === MainTaskStatus.IN_PROGRESS && 'Em Andamento'}
                        {task.status === MainTaskStatus.COMPLETED && 'Concluída'}
                        {task.status === MainTaskStatus.CANCELLED && 'Cancelada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority === Priority.LOW && 'Baixa'}
                        {task.priority === Priority.MEDIUM && 'Média'}
                        {task.priority === Priority.HIGH && 'Alta'}
                        {task.priority === Priority.URGENT && 'Urgente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-[140px]">
                        <WorkflowProgressBarAggregate
                          subtasks={task.subtasks as any}
                          showLabels={true}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <DropdownMenu>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Adicionar tarefa ou aplicar modelo</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMainTaskId(task.id)
                                setIsSubtaskDialogOpen(true)
                              }}
                            >
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Adicionar tarefa
                            </DropdownMenuItem>
                            {subtaskModels && subtaskModels.length > 0 && (
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Layers className="h-4 w-4 mr-2" />
                                  Aplicar modelo
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  {subtaskModels.map((model) => (
                                    <DropdownMenuItem
                                      key={model.id}
                                      onClick={() =>
                                        setApplyModelConfirm({
                                          modelId: model.id,
                                          modelName: model.name,
                                          mainTaskId: task.id,
                                        })
                                      }
                                      disabled={applyModelMutation.isPending}
                                    >
                                      {model.name}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(task.id)
                                  toast.success('ID do projeto copiado!')
                                }}
                                className="h-8 w-8 p-0 hover:bg-muted"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Copiar ID do projeto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditTask(task)}
                                className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar Projeto</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <AlertDialog>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDeleteTask(task)}
                                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Deletar Projeto</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <AlertDialogContent className="sm:max-w-[400px]">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar Projeto</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar "{taskToDelete?.title}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setTaskToDelete(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={confirmDeleteTask}
                                disabled={deleteMainTask.isPending}
                              >
                                {deleteMainTask.isPending ? 'Deletando...' : 'Deletar'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <div className="flex items-center gap-2">
                <span className="state-message-sm">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!applyModelConfirm}
        onOpenChange={(open) => !open && setApplyModelConfirm(null)}
      >
        <AlertDialogContent className="sm:max-w-[340px]">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-base">
              Aplicar modelo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              As tarefas atuais serão removidas e substituídas pelas etapas do modelo "{applyModelConfirm?.modelName}". Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-1 sm:gap-0">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                applyModelConfirm &&
                applyModelMutation.mutate({
                  subtaskTemplateId: applyModelConfirm.modelId,
                  mainTaskId: applyModelConfirm.mainTaskId,
                })
              }
              disabled={applyModelMutation.isPending}
            >
              {applyModelMutation.isPending ? 'Aplicando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para Criar Subtarefa */}
      <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Tarefa</DialogTitle>
            <DialogDescription>
              Adicione uma nova tarefa ao projeto selecionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subtask-title">Título *</Label>
              <Input
                id="subtask-title"
                value={subtaskForm.title}
                onChange={(e) => setSubtaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nome da Tarefa"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subtask-description">Descrição</Label>
              <Textarea
                id="subtask-description"
                value={subtaskForm.description}
                onChange={(e) => setSubtaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição detalhada da tarefa..."
                rows={2}
              />
            </div>
            
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="subtask-assigned">Responsável</Label>
                <Select value={subtaskForm.assignedToId || undefined} onValueChange={(value) => setSubtaskForm(prev => ({ ...prev, assignedToId: value || undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({
                          user.role === UserRole.OWNER ? 'Proprietário' :
                          user.role === UserRole.ADMIN ? 'Admin' :
                          user.role === UserRole.MANAGER ? 'Gerente' :
                          'Membro'
                        })
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtask-priority">Prioridade</Label>
                <Select value={subtaskForm.priority} onValueChange={(value) => setSubtaskForm(prev => ({ ...prev, priority: value as Priority }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Priority.LOW}>Baixa</SelectItem>
                    <SelectItem value={Priority.MEDIUM}>Média</SelectItem>
                    <SelectItem value={Priority.HIGH}>Alta</SelectItem>
                    <SelectItem value={Priority.URGENT}>Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subtask-deadline">Prazo</Label>
                <Input
                  id="subtask-deadline"
                  type="date"
                  value={subtaskForm.deadline}
                  onChange={(e) => setSubtaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                />
              </div>
            </div>
            
            {/* Campo de Dependências */}
            {mainTaskSubtasks && mainTaskSubtasks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label>Dependências (opcional)</Label>
                  {subtaskForm.dependencyIds.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center space-x-1 text-xs text-orange-600 cursor-help">
                            <GitBranch className="h-3 w-3 text-orange-500" />
                            <span className="text-orange-600 font-medium">
                              {subtaskForm.dependencyIds.length}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {subtaskForm.dependencyIds.length} dependência{subtaskForm.dependencyIds.length !== 1 ? 's' : ''} selecionada{subtaskForm.dependencyIds.length !== 1 ? 's' : ''}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-3">
                  <p className="text-xs text-muted-foreground">
                    Selecione as tarefas que devem ser concluídas antes desta poder ser iniciada:
                  </p>
                  {mainTaskSubtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`dependency-${subtask.id}`}
                        checked={subtaskForm.dependencyIds.includes(subtask.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSubtaskForm(prev => ({
                              ...prev,
                              dependencyIds: [...prev.dependencyIds, subtask.id]
                            }))
                          } else {
                            setSubtaskForm(prev => ({
                              ...prev,
                              dependencyIds: prev.dependencyIds.filter(id => id !== subtask.id)
                            }))
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`dependency-${subtask.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        <div className="flex items-center justify-between">
                          <span>{subtask.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {subtask.status === 'TODO' && 'A Fazer'}
                            {subtask.status === 'IN_PROGRESS' && 'Em Andamento'}
                            {subtask.status === 'BLOCKED' && 'Bloqueado'}
                            {subtask.status === 'COMPLETED' && 'Concluído'}
                            {subtask.status === 'APPROVED' && 'Aprovado'}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Aprovação - Apenas ADMIN */}
            {currentUser.role === UserRole.ADMIN && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="requires-approval"
                    checked={subtaskForm.requiresApproval}
                    onCheckedChange={(checked) => 
                      setSubtaskForm(prev => ({ ...prev, requiresApproval: checked as boolean }))
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor="requires-approval" className="text-sm font-medium cursor-pointer">
                      Requer aprovação
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {subtaskForm.requiresApproval ? "Manual" : "⚡ Automática"}
                    </p>
                  </div>
                  {!subtaskForm.requiresApproval && (
                    <Badge variant="secondary" className={`text-xs ${getPriorityClasses('MEDIUM')}`}>
                      ⚡ Auto
                    </Badge>
                  )}
                </div>
                
                {/* Recorrência - Novo Componente */}
                <RecurringTaskConfig
                  isRecurring={subtaskForm.isRecurring}
                  recurringType={subtaskForm.recurringType}
                  recurringWeekDays={subtaskForm.recurringWeekDays}
                  recurringMonthDays={subtaskForm.recurringMonthDays}
                  recurringInterval={subtaskForm.recurringInterval}
                  skipWeekends={subtaskForm.skipWeekends}
                  skipHolidays={subtaskForm.skipHolidays}
                  recurringEndDate={subtaskForm.recurringEndDate}
                  onConfigChange={(config) => setSubtaskForm(prev => ({ ...prev, ...config }))}
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsSubtaskDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateSubtask} 
                disabled={createSubtask.isPending || addDependency.isPending}
              >
                {createSubtask.isPending || addDependency.isPending ? 'Criando...' : 'Criar Tarefa'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal Unificado - Detalhes e Edição da Tarefa Principal */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Detalhes e Edição da Tarefa
            </DialogTitle>
            <DialogDescription>
              Visualize e edite as informações do projeto e suas tarefas
            </DialogDescription>
          </DialogHeader>
          
          {selectedTaskForDetails && (
            <div className="space-y-6">
              {/* Seção de Edição da Tarefa Principal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Informações do Projeto</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Título *</Label>
                    <Input
                      id="edit-title"
                      value={editTaskForm.title}
                      onChange={(e) => setEditTaskForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Criar software de e-commerce"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <Select value={editTaskForm.status} onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, status: value as MainTaskStatus }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={MainTaskStatus.NOT_STARTED}>Não Iniciada</SelectItem>
                        <SelectItem value={MainTaskStatus.IN_PROGRESS}>Em Andamento</SelectItem>
                        <SelectItem value={MainTaskStatus.COMPLETED}>Concluída</SelectItem>
                        <SelectItem value={MainTaskStatus.CANCELLED}>Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição</Label>
                  <Textarea
                    id="edit-description"
                    value={editTaskForm.description}
                    onChange={(e) => setEditTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição detalhada da tarefa..."
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority">Prioridade</Label>
                    <Select value={editTaskForm.priority} onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, priority: value as Priority }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={Priority.LOW}>Baixa</SelectItem>
                        <SelectItem value={Priority.MEDIUM}>Média</SelectItem>
                        <SelectItem value={Priority.HIGH}>Alta</SelectItem>
                        <SelectItem value={Priority.URGENT}>Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-deadline">Prazo</Label>
                    <Input
                      id="edit-deadline"
                      type="date"
                      value={editTaskForm.deadline}
                      onChange={(e) => setEditTaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cliente vinculado</Label>
                  <ClientSelector
                    value={editTaskForm.clientId}
                    onChange={(id) => setEditTaskForm(prev => ({ ...prev, clientId: id }))}
                    placeholder="Selecionar cliente (opcional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Setores</Label>
                  <DepartmentSelector
                    value={editTaskForm.departmentIds}
                    onChange={(ids) => setEditTaskForm(prev => ({ ...prev, departmentIds: ids }))}
                    multiple={true}
                  />
                </div>
              </div>

              {/* Seção de Subtarefas */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tarefas ({selectedTaskForDetails.subtasks.length})</h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedMainTaskId(selectedTaskForDetails.id)
                      setIsSubtaskDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {selectedTaskForDetails.subtasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma tarefa criada ainda
                    </p>
                  ) : (
                    selectedTaskForDetails.subtasks.map((subtask: any) => (
                      <div key={subtask.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{subtask.title}</h4>
                            {subtask.description && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {subtask.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <Badge variant="outline" className="text-xs">
                              {subtask.status === 'TODO' && 'A Fazer'}
                              {subtask.status === 'IN_PROGRESS' && 'Em Andamento'}
                              {subtask.status === 'BLOCKED' && 'Bloqueado'}
                              {subtask.status === 'COMPLETED' && 'Concluído'}
                              {subtask.status === 'APPROVED' && 'Aprovado'}
                            </Badge>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditSubtask(subtask)}
                                    className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-600"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Editar Tarefa</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja deletar a tarefa "{subtask.title}"? 
                                          Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteSubtask(subtask)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Deletar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Deletar Tarefa</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <Badge variant="outline" className={getPriorityColor(subtask.priority)}>
                              {subtask.priority === Priority.LOW && 'Baixa'}
                              {subtask.priority === Priority.MEDIUM && 'Média'}
                              {subtask.priority === Priority.HIGH && 'Alta'}
                              {subtask.priority === Priority.URGENT && 'Urgente'}
                            </Badge>
                            {subtask.assignedTo && (
                              <span>Responsável: {subtask.assignedTo.name}</span>
                            )}
                            {subtask.deadline && (
                              <span>Prazo: {formatDate(subtask.deadline)}</span>
                            )}
                          </div>
                          
                          {/* Indicador de Dependências */}
                          {subtask.dependencies && subtask.dependencies.length > 0 && (() => {
                            const blockingDependencies = subtask.dependencies.filter((dep: any) => 
                              dep.blocking && 
                              dep.blocking.status !== 'APPROVED'
                            )
                            
                            return blockingDependencies.length > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center space-x-1 text-xs text-orange-600 cursor-help">
                                      <GitBranch className="h-3 w-3 text-orange-500" />
                                      <span className="text-orange-600 font-medium">
                                        {blockingDependencies.length}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">
                                      {blockingDependencies.length} dependência{blockingDependencies.length > 1 ? 's' : ''} pendente{blockingDependencies.length > 1 ? 's' : ''}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : null
                          })()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Fechar
                </Button>
                <Button onClick={handleUpdateMainTask} disabled={updateMainTask.isPending}>
                  {updateMainTask.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Subtarefa - Versão Minimalista */}
      <Dialog open={isSubtaskEditDialogOpen} onOpenChange={setIsSubtaskEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Tarefa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subtask-title" className="text-sm font-medium">Título *</Label>
                <Input
                  id="edit-subtask-title"
                  value={editSubtaskForm.title}
                  onChange={(e) => setEditSubtaskForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Nome da tarefa"
                  className="text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-subtask-description" className="text-sm font-medium">Descrição</Label>
                <Textarea
                  id="edit-subtask-description"
                  value={editSubtaskForm.description}
                  onChange={(e) => setEditSubtaskForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição opcional da tarefa"
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Configurações Principais */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-subtask-assigned" className="text-sm font-medium">Responsável</Label>
                <Select 
                  value={editSubtaskForm.assignedToId || "none"} 
                  onValueChange={(value) => setEditSubtaskForm(prev => ({ ...prev, assignedToId: value === "none" ? undefined : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem responsável</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({
                          user.role === UserRole.OWNER ? 'Proprietário' :
                          user.role === UserRole.ADMIN ? 'Admin' :
                          user.role === UserRole.MANAGER ? 'Gerente' :
                          'Membro'
                        })
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-subtask-priority" className="text-sm font-medium">Prioridade</Label>
                <Select 
                  value={editSubtaskForm.priority} 
                  onValueChange={(value) => setEditSubtaskForm(prev => ({ ...prev, priority: value as Priority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={Priority.LOW}>🟢 Baixa</SelectItem>
                    <SelectItem value={Priority.MEDIUM}>🟡 Média</SelectItem>
                    <SelectItem value={Priority.HIGH}>🟠 Alta</SelectItem>
                    <SelectItem value={Priority.URGENT}>🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-subtask-deadline" className="text-sm font-medium">Prazo</Label>
                <Input
                  id="edit-subtask-deadline"
                  type="date"
                  value={editSubtaskForm.deadline}
                  onChange={(e) => setEditSubtaskForm(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Dependências - Versão Simplificada */}
            {selectedTaskForDetails && selectedTaskForDetails.subtasks && selectedTaskForDetails.subtasks.length > 1 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Dependências</Label>
                  {editSubtaskForm.dependencyIds.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {editSubtaskForm.dependencyIds.length} selecionada{editSubtaskForm.dependencyIds.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                  {selectedTaskForDetails.subtasks
                    .filter((subtask: any) => subtask.id !== selectedSubtaskForEdit?.id)
                    .map((subtask: any) => (
                    <div key={subtask.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded transition-colors">
                      <Checkbox
                        id={`edit-dependency-${subtask.id}`}
                        checked={editSubtaskForm.dependencyIds.includes(subtask.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditSubtaskForm(prev => ({
                              ...prev,
                              dependencyIds: [...prev.dependencyIds, subtask.id]
                            }))
                          } else {
                            setEditSubtaskForm(prev => ({
                              ...prev,
                              dependencyIds: prev.dependencyIds.filter(id => id !== subtask.id)
                            }))
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`edit-dependency-${subtask.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{subtask.title}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ml-2 ${
                              subtask.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              subtask.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              subtask.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {subtask.status === 'TODO' && 'A Fazer'}
                            {subtask.status === 'IN_PROGRESS' && 'Em Andamento'}
                            {subtask.status === 'BLOCKED' && 'Bloqueado'}
                            {subtask.status === 'COMPLETED_PENDING' && 'Pendente'}
                            {subtask.status === 'APPROVED' && 'Aprovado'}
                          </Badge>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Configurações Avançadas - Apenas ADMIN */}
            {currentUser.role === UserRole.ADMIN && (
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="edit-requires-approval"
                    checked={editSubtaskForm.requiresApproval}
                    onCheckedChange={(checked) => 
                      setEditSubtaskForm(prev => ({ ...prev, requiresApproval: checked as boolean }))
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor="edit-requires-approval" className="text-sm font-medium cursor-pointer">
                      Requer aprovação
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {editSubtaskForm.requiresApproval ? "Manual" : "⚡ Automática"}
                    </p>
                  </div>
                  {!editSubtaskForm.requiresApproval && (
                    <Badge variant="secondary" className={`text-xs ${getPriorityClasses('MEDIUM')}`}>
                      ⚡ Auto
                    </Badge>
                  )}
                </div>
                
                {/* Recorrência - Componente Completo */}
                <RecurringTaskConfig
                  isRecurring={editSubtaskForm.isRecurring}
                  recurringType={editSubtaskForm.recurringType}
                  recurringWeekDays={editSubtaskForm.recurringWeekDays}
                  recurringMonthDays={editSubtaskForm.recurringMonthDays}
                  recurringInterval={editSubtaskForm.recurringInterval}
                  skipWeekends={editSubtaskForm.skipWeekends}
                  skipHolidays={editSubtaskForm.skipHolidays}
                  recurringEndDate={editSubtaskForm.recurringEndDate}
                  onConfigChange={(config) => setEditSubtaskForm(prev => ({ ...prev, ...config }))}
                />
              </div>
            )}
            
            {/* Botões de Ação */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsSubtaskEditDialogOpen(false)}
                className="px-6"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateSubtask} 
                disabled={updateSubtask.isPending || !editSubtaskForm.title.trim()}
                className="px-6"
              >
                {updateSubtask.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
