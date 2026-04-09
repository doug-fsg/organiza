'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { SubtaskStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutGrid, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import toast from 'react-hot-toast'
import { SubtaskDetailsModal } from '@/components/subtask-details-modal'
import { SubtaskCompletionModal } from '@/components/subtask-completion-modal'
import { sortSubtasksByDependency } from '@/lib/task-utils'
import { KanbanBoardLoading } from '@/components/kanban/kanban-board-loading'
import { KanbanBoardToolbarFilters } from '@/components/kanban/kanban-board-toolbar-filters'
import { KanbanTasksPanel } from '@/components/kanban/kanban-tasks-panel'
import { KanbanProjectsPanel } from '@/components/kanban/kanban-projects-panel'
import { OPEN_STATUSES } from '@/components/kanban/kanban-helpers'

interface KanbanBoardProps {
  userId: string
  userRole?: string
  /** Quando definido, mostra apenas esta visão (sem abas internas) - usado pelo dashboard */
  view?: 'tasks' | 'projects'
}

export function KanbanBoard({ userId, userRole, view }: KanbanBoardProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects'>(view ?? 'tasks')

  useEffect(() => {
    if (view) setActiveTab(view)
  }, [view])

  const [tasksProjectFilter, setTasksProjectFilter] = useState<string>('all')
  const [tasksClientFilter, setTasksClientFilter] = useState<string>('all')
  const [tasksStatusFilter, setTasksStatusFilter] = useState<'open' | 'all' | 'approved' | 'rejected'>('open')
  const [projectsProjectFilter, setProjectsProjectFilter] = useState<string>('all')
  const [projectsClientFilter, setProjectsClientFilter] = useState<string>('all')
  const [projectsAttrFilter, setProjectsAttrFilter] = useState<{ attrId: string; value: string } | null>(null)
  const [selectedSubtask, setSelectedSubtask] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [initialModalTab, setInitialModalTab] = useState<'details' | 'comments' | 'checklist'>('details')
  const [completionModal, setCompletionModal] = useState<{
    isOpen: boolean
    subtaskId: string
    subtaskTitle: string
    initialChecklistItems: string | null
    /** Botão inteligente a executar no modal (quando "confirmação antes" está ativa) */
    pendingSmartButtonId: string | null
    pendingSmartButtonName: string | null
    requiresApproval: boolean
  }>({
    isOpen: false,
    subtaskId: '',
    subtaskTitle: '',
    initialChecklistItems: null,
    pendingSmartButtonId: null,
    pendingSmartButtonName: null,
    requiresApproval: true,
  })
  const completionModalRef = useRef(completionModal)
  completionModalRef.current = completionModal
  const utils = api.useUtils()
  const { playNotificationSound } = useNotificationSound()
  const previousUnreadCountRef = useRef<Record<string, number>>({})

  const canSeeAllProjects = ['ADMIN', 'OWNER', 'MANAGER'].includes(userRole || '')
  const { data: subtasks, isLoading } = api.subtask.getByUser.useQuery(
    { userRole: userRole as any },
    {
      refetchInterval: 15000,
      refetchIntervalInBackground: false,
    }
  )

  const { data: allMainTasks } = api.mainTask.getAll.useQuery(undefined, {
    enabled: canSeeAllProjects,
  })

  const { data: customAttributes } = api.clientCustomAttribute.getAll.useQuery()

  useEffect(() => {
    if (!subtasks) return

    subtasks.forEach((subtask) => {
      const unreadCount =
        subtask.comments?.filter((comment: any) => {
          try {
            const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
            return !readBy.includes(subtask.assignedToId)
          } catch {
            return true
          }
        }).length || 0

      const previousCount = previousUnreadCountRef.current[subtask.id]
      const isModalOpenForThisSubtask = isDetailsModalOpen && selectedSubtask?.id === subtask.id

      if (previousCount !== undefined && unreadCount > previousCount && !isModalOpenForThisSubtask) {
        playNotificationSound()
        if (subtask.status === SubtaskStatus.COMPLETED_PENDING) {
          toast('Novo comentário', { icon: '💬', duration: 4000 })
        } else {
          toast('Novo comentário em sua tarefa', { icon: '💬', duration: 3000 })
        }
      }

      previousUnreadCountRef.current[subtask.id] = unreadCount
    })
  }, [subtasks, playNotificationSound, isDetailsModalOpen, selectedSubtask])

  const updateSubtask = api.subtask.update.useMutation({
    onMutate: async (variables) => {
      const previousSubtasks = utils.subtask.getByUser.getData({ userRole: userRole as any })
      if (previousSubtasks && variables.status) {
        utils.subtask.getByUser.setData({ userRole: userRole as any }, (old) => {
          if (!old) return old
          return old.map((subtask) =>
            subtask.id === variables.id ? { ...subtask, status: variables.status! } : subtask
          )
        })
      }
      return { previousSubtasks }
    },
    onError: (error, _variables, context) => {
      if (context?.previousSubtasks) {
        utils.subtask.getByUser.setData({ userRole: userRole as any }, context.previousSubtasks)
      }
      toast.error(`Erro ao atualizar tarefa: ${error.message}`)
    },
    onSettled: () => {
      utils.subtask.getByUser.invalidate({ userRole: userRole as any })
    },
  })

  const { data: buttonDefs } = api.taskField.getDefinitions.useQuery()

  const executeSmartButton = api.taskField.executeSmartButton.useMutation({
    onSuccess: (_, variables) => {
      toast.success('Ação executada!')
      setLocalStatuses((prev) => {
        const next = { ...prev }
        delete next[variables.subtaskId]
        return next
      })
      utils.subtask.invalidate()
      utils.comment.invalidate()
      utils.mainTask.invalidate()
    },
    onError: (err, variables) => {
      toast.error('Erro ao executar: ' + err.message)
      setLocalStatuses((prev) => {
        const next = { ...prev }
        delete next[variables.subtaskId]
        return next
      })
    },
  })

  const filterOptions = useMemo(() => {
    const projectMap = new Map<string, string>()
    const clientMap = new Map<string, string>()
    for (const s of subtasks || []) {
      projectMap.set(s.mainTaskId, s.mainTask?.title || 'Projeto')
      if (s.mainTask?.client) clientMap.set(s.mainTask.client.id, s.mainTask.client.name)
    }
    if (canSeeAllProjects && allMainTasks) {
      for (const mt of allMainTasks) {
        projectMap.set(mt.id, mt.title || 'Projeto')
        if (mt.client) clientMap.set(mt.client.id, mt.client.name)
      }
    }
    return {
      projects: Array.from(projectMap.entries())
        .map(([id, title]) => ({ id, title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
      clients: Array.from(clientMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [subtasks, canSeeAllProjects, allMainTasks])

  const filteredSubtasks = useMemo(() => {
    if (!subtasks) return []
    return subtasks.filter((s) => {
      if (tasksProjectFilter !== 'all' && s.mainTaskId !== tasksProjectFilter) return false
      if (tasksClientFilter !== 'all') {
        const clientId = s.mainTask?.client?.id
        if (!clientId || clientId !== tasksClientFilter) return false
      }
      if (tasksStatusFilter === 'open' && !OPEN_STATUSES.includes(s.status)) return false
      if (tasksStatusFilter === 'approved' && s.status !== SubtaskStatus.APPROVED) return false
      if (tasksStatusFilter === 'rejected' && s.status !== SubtaskStatus.REJECTED) return false
      return true
    })
  }, [subtasks, tasksProjectFilter, tasksClientFilter, tasksStatusFilter])

  const matchesCustomAttr = useMemo(() => {
    return (client: { customValues?: string | null } | null) => {
      if (!projectsAttrFilter?.attrId || !projectsAttrFilter?.value?.trim()) return true
      if (!client?.customValues) return false
      try {
        const cv = JSON.parse(client.customValues) as Record<string, unknown>
        const val = cv[projectsAttrFilter.attrId]
        if (val == null) return false
        const strVal = Array.isArray(val)
          ? val.map((f: { fileName?: string }) => f?.fileName ?? '').join(' ').toLowerCase()
          : String(val).toLowerCase()
        return strVal.includes(projectsAttrFilter.value.trim().toLowerCase())
      } catch {
        return false
      }
    }
  }, [projectsAttrFilter])

  const projectsByMainTask = useMemo(() => {
    if (canSeeAllProjects && allMainTasks?.length) {
      return allMainTasks
        .filter((mt) => {
          if (projectsProjectFilter !== 'all' && mt.id !== projectsProjectFilter) return false
          if (projectsClientFilter !== 'all') {
            const cid = mt.client?.id
            if (!cid || cid !== projectsClientFilter) return false
          }
          return matchesCustomAttr(mt.client)
        })
        .map((mt) => ({
          mainTaskId: mt.id,
          mainTask: mt,
          subtasks: mt.subtasks || [],
        }))
    }
    const grouped = new Map<string, any[]>()
    for (const s of subtasks ?? []) {
      const mt = s.mainTask
      if (projectsProjectFilter !== 'all' && s.mainTaskId !== projectsProjectFilter) continue
      if (projectsClientFilter !== 'all') {
        const cid = mt?.client?.id
        if (!cid || cid !== projectsClientFilter) continue
      }
      if (!matchesCustomAttr(mt?.client)) continue
      const list = grouped.get(s.mainTaskId) || []
      list.push(s)
      grouped.set(s.mainTaskId, list)
    }
    return Array.from(grouped.entries()).map(([mainTaskId, subs]) => ({
      mainTaskId,
      mainTask: subs[0]?.mainTask,
      subtasks: subs,
    }))
  }, [subtasks, canSeeAllProjects, allMainTasks, projectsProjectFilter, projectsClientFilter, matchesCustomAttr])

  const tabCounts = useMemo(
    () => ({
      tasks: filteredSubtasks.length,
      projects: projectsByMainTask.length,
    }),
    [filteredSubtasks.length, projectsByMainTask.length]
  )

  const tasksFiltersActive =
    tasksProjectFilter !== 'all' ||
    tasksClientFilter !== 'all' ||
    tasksStatusFilter !== 'open'

  const projectsFiltersActive =
    projectsProjectFilter !== 'all' ||
    projectsClientFilter !== 'all' ||
    Boolean(projectsAttrFilter?.attrId)

  const resetTasksFilters = () => {
    setTasksProjectFilter('all')
    setTasksClientFilter('all')
    setTasksStatusFilter('open')
  }

  const resetProjectsFilters = () => {
    setProjectsProjectFilter('all')
    setProjectsClientFilter('all')
    setProjectsAttrFilter(null)
  }

  const hasAssignedSubtasks = (subtasks?.length ?? 0) > 0

  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})

  const getTabSubtasks = useMemo(() => {
    if (activeTab !== 'tasks') return []
    return sortSubtasksByDependency(filteredSubtasks)
  }, [filteredSubtasks, activeTab]) as any[]

  const handleStatusChange = (subtaskId: string, newValue: string) => {
    const currentSubtask = subtasks?.find((s) => s.id === subtaskId)

    if (newValue.startsWith('btn_')) {
      const buttonId = newValue.substring(4)
      const def = buttonDefs?.find((b: { id: string; confirmBeforeExecute?: boolean }) => b.id === buttonId)
      if (def?.confirmBeforeExecute) {
        setLocalStatuses((prev) => ({ ...prev, [subtaskId]: `btn_${buttonId}` }))
        setCompletionModal({
          isOpen: true,
          subtaskId,
          subtaskTitle: currentSubtask?.title || '',
          initialChecklistItems: currentSubtask?.checklistItems ?? null,
          pendingSmartButtonId: buttonId,
          pendingSmartButtonName: (def as { name?: string }).name ?? null,
          requiresApproval: Boolean(currentSubtask?.requiresApproval ?? true),
        })
        return
      }
      setLocalStatuses((prev) => ({ ...prev, [subtaskId]: newValue }))
      executeSmartButton.mutate({ buttonId, subtaskId })
      return
    }

    setLocalStatuses((prev) => ({ ...prev, [subtaskId]: newValue }))

    const newStatus = newValue as SubtaskStatus
    if (!currentSubtask) return
    if (currentSubtask.status === newStatus) return
    if (!Object.values(SubtaskStatus).includes(newStatus)) return

    const blockingDeps =
      currentSubtask.dependencies?.filter(
        (dep: any) => dep.blocking && dep.blocking.status !== SubtaskStatus.APPROVED
      ) || []
    if (newStatus === SubtaskStatus.IN_PROGRESS && blockingDeps.length > 0) {
      toast.error('Aguarde a conclusão da tarefa anterior')
      return
    }

    if (newStatus === SubtaskStatus.COMPLETED_PENDING) {
      setCompletionModal({
        isOpen: true,
        subtaskId,
        subtaskTitle: currentSubtask?.title || '',
        initialChecklistItems: currentSubtask?.checklistItems ?? null,
        pendingSmartButtonId: null,
        pendingSmartButtonName: null,
        requiresApproval: Boolean(currentSubtask?.requiresApproval ?? true),
      })
      return
    }

    if (newStatus === SubtaskStatus.APPROVED || newStatus === SubtaskStatus.BLOCKED) {
      toast.error('Esta ação deve ser feita pelo gestor ou automaticamente pelo sistema.')
      return
    }

    updateSubtask.mutate({
      id: subtaskId,
      status: newStatus,
    })
  }

  const handleOpenDetails = (subtask: any, tab: 'details' | 'comments' | 'checklist' = 'details') => {
    setSelectedSubtask(subtask)
    setInitialModalTab(tab)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetails = () => {
    setIsDetailsModalOpen(false)
    setSelectedSubtask(null)
    setInitialModalTab('details')
  }

  if (isLoading) {
    return <KanbanBoardLoading />
  }

  const totalUnreadMessagesInWaiting =
    filteredSubtasks.reduce((total, s) => {
      if (s.status !== SubtaskStatus.COMPLETED_PENDING) return total
      const unreadCount =
        s.comments?.filter((comment: any) => {
          if (comment.authorId === userId) return false
          try {
            const readBy = comment.readBy ? JSON.parse(comment.readBy) : []
            return !readBy.includes(userId)
          } catch {
            return true
          }
        }).length || 0
      return total + unreadCount
    }, 0) || 0

  const showInternalTabs = !view

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => showInternalTabs && setActiveTab(value as typeof activeTab)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {showInternalTabs && (
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                Minhas Tarefas
                <div className="flex items-center gap-1">
                  {tabCounts.tasks > 0 && (
                    <Badge variant="info" className="ml-1">
                      {tabCounts.tasks}
                    </Badge>
                  )}
                  {totalUnreadMessagesInWaiting > 0 && (
                    <Badge variant="default" className="motion-safe:animate-pulse gap-1 tabular-nums">
                      <MessageSquare className="h-3 w-3" aria-hidden />
                      {totalUnreadMessagesInWaiting}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="projects" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" aria-hidden />
                Visão do Projeto
                {tabCounts.projects > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {tabCounts.projects}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          )}
          <KanbanBoardToolbarFilters
            activeTab={activeTab}
            filterOptions={filterOptions}
            tasksProjectFilter={tasksProjectFilter}
            setTasksProjectFilter={setTasksProjectFilter}
            tasksClientFilter={tasksClientFilter}
            setTasksClientFilter={setTasksClientFilter}
            tasksStatusFilter={tasksStatusFilter}
            setTasksStatusFilter={setTasksStatusFilter}
            tasksFiltersActive={tasksFiltersActive}
            resetTasksFilters={resetTasksFilters}
            projectsProjectFilter={projectsProjectFilter}
            setProjectsProjectFilter={setProjectsProjectFilter}
            projectsClientFilter={projectsClientFilter}
            setProjectsClientFilter={setProjectsClientFilter}
            projectsAttrFilter={projectsAttrFilter}
            setProjectsAttrFilter={setProjectsAttrFilter}
            projectsFiltersActive={projectsFiltersActive}
            resetProjectsFilters={resetProjectsFilters}
            customAttributes={customAttributes}
          />
        </div>

        <TabsContent value="tasks" className="space-y-6">
          <KanbanTasksPanel
            getTabSubtasks={getTabSubtasks}
            hasAssignedSubtasks={hasAssignedSubtasks}
            tasksFiltersActive={tasksFiltersActive}
            onResetFilters={resetTasksFilters}
            localStatuses={localStatuses}
            buttonDefs={buttonDefs}
            onStatusChange={handleStatusChange}
            onOpenDetails={handleOpenDetails}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <KanbanProjectsPanel
            projectsByMainTask={projectsByMainTask}
            projectsFiltersActive={projectsFiltersActive}
            onResetFilters={resetProjectsFilters}
            onOpenTaskDetails={handleOpenDetails}
          />
        </TabsContent>
      </Tabs>

      {selectedSubtask && (
        <SubtaskDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetails}
          subtask={selectedSubtask}
          mainTaskId={selectedSubtask.mainTaskId}
          initialTab={initialModalTab}
        />
      )}

      <SubtaskCompletionModal
        isOpen={completionModal.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            const id = completionModalRef.current.subtaskId
            if (id) {
              setLocalStatuses((s) => {
                if (!(id in s)) return s
                const next = { ...s }
                delete next[id]
                return next
              })
            }
            setCompletionModal({
              isOpen: false,
              subtaskId: '',
              subtaskTitle: '',
              initialChecklistItems: null,
              pendingSmartButtonId: null,
              pendingSmartButtonName: null,
              requiresApproval: true,
            })
          } else {
            setCompletionModal((prev) => ({ ...prev, isOpen: true }))
          }
        }}
        subtaskId={completionModal.subtaskId}
        subtaskTitle={completionModal.subtaskTitle}
        initialChecklistItems={completionModal.initialChecklistItems}
        smartButtonIdAfterComplete={completionModal.pendingSmartButtonId}
        smartButtonName={completionModal.pendingSmartButtonName}
        requiresApproval={completionModal.requiresApproval}
        userId={userId}
        onSuccess={() => {
          void utils.subtask.getByUser.invalidate({ userRole: userRole as any })
        }}
      />
    </div>
  )
}
