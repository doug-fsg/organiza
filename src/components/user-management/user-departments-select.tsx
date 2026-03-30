'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'
import { ChevronDown } from 'lucide-react'

interface UserDepartmentsSelectProps {
  userId: string
  currentDepartmentIds: string[]
  onUpdate: () => void
}

export function UserDepartmentsSelect({ userId, currentDepartmentIds, onUpdate }: UserDepartmentsSelectProps) {
  const [open, setOpen] = useState(false)

  const { data: departments } = api.department.getAll.useQuery()
  const addUserMutation = api.department.addUser.useMutation({
    onSuccess: () => {
      onUpdate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const removeUserMutation = api.department.removeUser.useMutation({
    onSuccess: () => {
      onUpdate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const handleToggle = (departmentId: string) => {
    const isSelected = currentDepartmentIds.includes(departmentId)

    if (isSelected) {
      removeUserMutation.mutate({ departmentId, userId })
    } else {
      addUserMutation.mutate({ departmentId, userId })
    }
  }

  const selectedDepartments = departments?.filter(d => currentDepartmentIds.includes(d.id)) || []
  const displayText = selectedDepartments.length > 0
    ? selectedDepartments.map(d => d.name).join(', ')
    : 'Nenhum setor'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal h-9"
          disabled={addUserMutation.isPending || removeUserMutation.isPending}
        >
          <span className="truncate text-sm">
            {selectedDepartments.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedDepartments.map((dept) => (
                  <Badge key={dept.id} variant="secondary" className="text-xs">
                    {dept.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Selecionar setores</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
          {departments && departments.length > 0 ? (
            departments.map((department) => (
              <div key={department.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                <Checkbox
                  id={`dept-${department.id}`}
                  checked={currentDepartmentIds.includes(department.id)}
                  onCheckedChange={() => handleToggle(department.id)}
                  disabled={addUserMutation.isPending || removeUserMutation.isPending}
                />
                <Label
                  htmlFor={`dept-${department.id}`}
                  className="cursor-pointer flex-1 text-sm"
                >
                  {department.name}
                </Label>
              </div>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground text-center">
              Nenhum setor disponível
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

