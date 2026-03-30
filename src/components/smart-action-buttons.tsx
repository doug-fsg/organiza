'use client'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LoadingSpinner } from '@/components/loading-spinner'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface SmartActionButtonsProps {
  subtaskId: string
  className?: string
  onExecute?: () => void
}

const COLOR_MAP: Record<string, string> = {
  amber: 'bg-amber/10 text-amber-foreground border-amber/20 hover:bg-amber/20',
  sky: 'bg-sky/10 text-sky-foreground border-sky/20 hover:bg-sky/20',
  rose: 'bg-rose/10 text-rose-foreground border-rose/20 hover:bg-rose/20',
  teal: 'bg-teal/10 text-teal-foreground border-teal/20 hover:bg-teal/20',
  indigo: 'bg-indigo/10 text-indigo-foreground border-indigo/20 hover:bg-indigo/20',
  coral: 'bg-coral/10 text-coral-foreground border-coral/20 hover:bg-coral/20',
}

export function SmartActionButtons({ subtaskId, className, onExecute }: SmartActionButtonsProps) {
  const utils = api.useUtils()
  const { data: buttons, isLoading } = api.taskField.getButtonsForSubtask.useQuery({ subtaskId })
  const [executingId, setExecutingId] = useState<string | null>(null)

  const executeMutation = api.taskField.executeSmartButton.useMutation({
    onSuccess: () => {
      toast.success('Ação executada!')
      // Invalida tudo que pode ter mudado (status, comentários, etc)
      utils.subtask.invalidate()
      utils.comment.invalidate()
      utils.mainTask.invalidate()
      onExecute?.()
    },
    onError: (err) => {
      toast.error('Erro ao executar: ' + err.message)
    },
    onSettled: () => {
      setExecutingId(null)
    }
  })

  const handleExecute = async (buttonId: string) => {
    setExecutingId(buttonId)
    executeMutation.mutate({ buttonId, subtaskId })
  }

  if (isLoading || !buttons || buttons.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {buttons.map((btn) => (
        <Button
          key={btn.id}
          variant="outline"
          size="sm"
          disabled={!!executingId}
          onClick={() => handleExecute(btn.id)}
          className={cn(
            "h-7 px-3 text-[11px] font-bold uppercase tracking-wider transition-all border",
            COLOR_MAP[btn.color || 'amber'] || COLOR_MAP.amber,
            executingId === btn.id && "opacity-50"
          )}
        >
          {executingId === btn.id ? (
            <LoadingSpinner size="sm" className="mr-1" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-current mr-2 animate-pulse" />
          )}
          {btn.name}
        </Button>
      ))}
    </div>
  )
}
