'use client'

import { Badge } from '@/components/ui/badge'
import { UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientBadgeProps {
  name: string
  className?: string
}

export function ClientBadge({ name, className }: ClientBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-normal gap-1.5 px-2 py-0.5 text-xs',
        className
      )}
    >
      <UserPlus className="h-3 w-3" />
      {name}
    </Badge>
  )
}
