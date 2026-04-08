'use client'

import type { Dispatch, SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Filter, RotateCcw } from 'lucide-react'

export type TasksStatusFilterValue = 'open' | 'all' | 'approved' | 'rejected'

type FilterOptionProject = { id: string; title: string }
type FilterOptionClient = { id: string; name: string }

type CustomAttr = { id: string; name: string }

interface KanbanBoardToolbarFiltersProps {
  activeTab: 'tasks' | 'projects'
  filterOptions: { projects: FilterOptionProject[]; clients: FilterOptionClient[] }

  tasksProjectFilter: string
  setTasksProjectFilter: (v: string) => void
  tasksClientFilter: string
  setTasksClientFilter: (v: string) => void
  tasksStatusFilter: TasksStatusFilterValue
  setTasksStatusFilter: (v: TasksStatusFilterValue) => void
  tasksFiltersActive: boolean
  resetTasksFilters: () => void

  projectsProjectFilter: string
  setProjectsProjectFilter: (v: string) => void
  projectsClientFilter: string
  setProjectsClientFilter: (v: string) => void
  projectsAttrFilter: { attrId: string; value: string } | null
  setProjectsAttrFilter: Dispatch<SetStateAction<{ attrId: string; value: string } | null>>
  projectsFiltersActive: boolean
  resetProjectsFilters: () => void

  customAttributes: CustomAttr[] | undefined
}

export function KanbanBoardToolbarFilters({
  activeTab,
  filterOptions,
  tasksProjectFilter,
  setTasksProjectFilter,
  tasksClientFilter,
  setTasksClientFilter,
  tasksStatusFilter,
  setTasksStatusFilter,
  tasksFiltersActive,
  resetTasksFilters,
  projectsProjectFilter,
  setProjectsProjectFilter,
  projectsClientFilter,
  setProjectsClientFilter,
  projectsAttrFilter,
  setProjectsAttrFilter,
  projectsFiltersActive,
  resetProjectsFilters,
  customAttributes,
}: KanbanBoardToolbarFiltersProps) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5">
      {activeTab === 'tasks' ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-10 min-h-10 gap-1.5 px-3 text-muted-foreground hover:text-foreground sm:h-8 sm:min-h-8 sm:px-2.5',
                tasksFiltersActive && 'text-foreground'
              )}
            >
              <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-xs">Filtros</span>
              {tasksFiltersActive && <span className="size-1.5 rounded-full bg-primary/70" aria-hidden />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Projeto</Label>
              <Select value={tasksProjectFilter} onValueChange={setTasksProjectFilter}>
                <SelectTrigger className="h-10 border-0 bg-muted/40 text-xs sm:h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Contato</Label>
              <Select value={tasksClientFilter} onValueChange={setTasksClientFilter}>
                <SelectTrigger className="h-10 border-0 bg-muted/40 text-xs sm:h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={tasksStatusFilter}
                onValueChange={(v) => setTasksStatusFilter(v as TasksStatusFilterValue)}
              >
                <SelectTrigger className="h-10 border-0 bg-muted/40 text-xs sm:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Abertas</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
              {tasksFiltersActive && (
                <div className="mt-1 border-t pt-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                    onClick={resetTasksFilters}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-10 min-h-10 gap-1.5 px-3 text-muted-foreground hover:text-foreground sm:h-8 sm:min-h-8 sm:px-2.5',
                projectsFiltersActive && 'text-foreground'
              )}
            >
              <Filter className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-xs">Filtros</span>
              {projectsFiltersActive && <span className="size-1.5 rounded-full bg-primary/70" aria-hidden />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <div className="space-y-2.5">
              <Label className="text-xs text-muted-foreground">Projeto</Label>
              <Select value={projectsProjectFilter} onValueChange={setProjectsProjectFilter}>
                <SelectTrigger className="h-10 border-0 bg-muted/40 text-xs sm:h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={projectsClientFilter} onValueChange={setProjectsClientFilter}>
                <SelectTrigger className="h-10 border-0 bg-muted/40 text-xs sm:h-8">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filterOptions.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customAttributes && customAttributes.length > 0 && (
                <>
                  <Label className="text-xs text-muted-foreground">Atributo</Label>
                  <Select
                    value={projectsAttrFilter?.attrId ?? 'all'}
                    onValueChange={(v) =>
                      setProjectsAttrFilter(
                        v === 'all' ? null : { attrId: v, value: projectsAttrFilter?.value ?? '' }
                      )
                    }
                  >
                    <SelectTrigger className="h-10 border-0 bg-muted/40 text-xs sm:h-8">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Nenhum</SelectItem>
                      {customAttributes.map((attr) => (
                        <SelectItem key={attr.id} value={attr.id}>
                          {attr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projectsAttrFilter?.attrId && (
                    <>
                      <Label className="text-xs text-muted-foreground">Valor</Label>
                      <Input
                        placeholder="Buscar..."
                        className="h-10 border-0 bg-muted/40 text-xs sm:h-8"
                        value={projectsAttrFilter.value}
                        onChange={(e) =>
                          setProjectsAttrFilter((prev) =>
                            prev ? { ...prev, value: e.target.value } : null
                          )
                        }
                      />
                    </>
                  )}
                </>
              )}
              {projectsFiltersActive && (
                <div className="mt-1 border-t pt-2.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                    onClick={resetProjectsFilters}
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
