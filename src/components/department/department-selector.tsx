'use client'

import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface DepartmentSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  multiple?: boolean
}

export function DepartmentSelector({ value, onChange, multiple = false }: DepartmentSelectorProps) {
  const { data: departments } = api.department.getAll.useQuery()

  const handleSelect = (departmentId: string) => {
    if (multiple) {
      const newValue = value.includes(departmentId)
        ? value.filter((id) => id !== departmentId)
        : [...value, departmentId]
      onChange(newValue)
    } else {
      onChange([departmentId])
    }
  }

  const selectedDepartments = departments?.filter((d) => value.includes(d.id))

  if (multiple) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedDepartments && selectedDepartments.length > 0 ? (
            selectedDepartments.map((dept) => (
              <Badge key={dept.id} variant="secondary" className="cursor-pointer" onClick={() => handleSelect(dept.id)}>
                {dept.name} ×
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">Nenhum setor selecionado</span>
          )}
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {departments?.map((department) => (
            <div key={department.id} className="flex items-center space-x-2">
              <Checkbox
                id={`dept-${department.id}`}
                checked={value.includes(department.id)}
                onCheckedChange={() => handleSelect(department.id)}
              />
              <Label htmlFor={`dept-${department.id}`} className="cursor-pointer flex-1">
                {department.name}
                {department.description && (
                  <span className="ml-2 text-xs text-muted-foreground">- {department.description}</span>
                )}
              </Label>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Select value={value[0] || ''} onValueChange={(val) => onChange([val])}>
      <SelectTrigger>
        <SelectValue placeholder="Selecionar setor..." />
      </SelectTrigger>
      <SelectContent>
        {departments?.map((department) => (
          <SelectItem key={department.id} value={department.id}>
            {department.name}
            {department.description && (
              <span className="ml-2 text-xs text-muted-foreground">- {department.description}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

