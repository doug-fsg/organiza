'use client'

import { useState, useMemo } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { api } from '@/lib/api'
import { UserPlus, Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ClientSelectorProps {
  value: string | null
  onChange: (clientId: string | null) => void
  placeholder?: string
  className?: string
  /** Quando true, adiciona opção "Sem cliente" (valor "none") e "Todos" para filtros */
  filterMode?: boolean
}

export function ClientSelector({ value, onChange, placeholder = 'Selecionar contato...', className, filterMode }: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data } = api.clients.list.useQuery({ limit: 100 })
  const clients = data?.clients ?? []

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients
    const term = search.toLowerCase().trim()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.email?.toLowerCase().includes(term) ?? false) ||
        (c.phone?.includes(term) ?? false)
    )
  }, [clients, search])

  const selectedClient = value && value !== 'none' ? clients.find((c) => c.id === value) : null

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch('') }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="truncate">
            {filterMode && value === 'none' ? (
              <span className="flex items-center gap-2 text-muted-foreground">Sem contato</span>
            ) : selectedClient ? (
              <span className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                {selectedClient.name}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <ScrollArea className="h-[240px]">
          <div className="p-1">
            {filterMode && (
              <button
                type="button"
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors',
                  !value && 'bg-accent'
                )}
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <span className="text-muted-foreground">Todos</span>
                {!value && <Check className="h-4 w-4" />}
              </button>
            )}
            <button
              type="button"
              className={cn(
                'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors',
                (!filterMode && !value) && 'bg-accent',
                (filterMode && value === 'none') && 'bg-accent'
              )}
              onClick={() => {
                onChange(filterMode ? 'none' : null)
                setOpen(false)
              }}
            >
              <span className="text-muted-foreground italic">
                {filterMode ? 'Sem contato' : 'Nenhum contato'}
              </span>
              {((!filterMode && !value) || (filterMode && value === 'none')) && <Check className="h-4 w-4" />}
            </button>
            {filteredClients.map((client) => (
              <button
                key={client.id}
                type="button"
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left',
                  value === client.id && 'bg-accent'
                )}
                onClick={() => {
                  onChange(client.id)
                  setOpen(false)
                }}
              >
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{client.name}</span>
                  {(client.email || client.phone) && (
                    <span className="text-xs text-muted-foreground truncate">
                      {client.email || client.phone}
                    </span>
                  )}
                </div>
                {value === client.id && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
            {filteredClients.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum contato encontrado
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
