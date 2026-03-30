'use client'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingSpinner } from '@/components/loading-spinner'
import { Trash2, Rocket, CheckCircle2, MessageSquare, Globe, Plus, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ActionButtonForm } from '@/components/action-button/action-button-form'
import { toast } from 'sonner'

const PREDEFINED_COLORS = [
  { name: 'Âmbar', value: 'amber', bg: 'bg-amber-500', text: 'text-white' },
  { name: 'Céu', value: 'sky', bg: 'bg-sky-500', text: 'text-white' },
  { name: 'Rosa', value: 'rose', bg: 'bg-rose-500', text: 'text-white' },
  { name: 'Teal', value: 'teal', bg: 'bg-teal-500', text: 'text-white' },
  { name: 'Índigo', value: 'indigo', bg: 'bg-indigo-500', text: 'text-white' },
  { name: 'Coral', value: 'coral', bg: 'bg-orange-500', text: 'text-white' },
]

export default function SystemPage() {
  const utils = api.useUtils()
  const { data: buttons, isLoading } = api.taskField.getDefinitions.useQuery()
  
  const deleteMutation = api.taskField.deleteDefinition.useMutation({
    onSuccess: () => {
      utils.taskField.getDefinitions.invalidate()
      toast.success('Botão removido')
    }
  })

  if (isLoading) return <LoadingSpinner size="lg" text="Carregando configurações..." />

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Automações do Sistema</h1>
          <p className="text-sm text-muted-foreground">Crie e gerencie botões inteligentes para automação de tarefas</p>
        </div>
        <ActionButtonForm 
          trigger={
            <Button className="shadow-lg hover:shadow-xl transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Novo Botão
            </Button>
          }
        />
      </div>

      <div className="grid gap-6">
        <Card className="card-minimal overflow-hidden border-none shadow-none bg-transparent">
          <CardContent className="p-0">
            <div className="rounded-xl border bg-card/30 dark:bg-card/10 backdrop-blur-md overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50 dark:bg-muted/20">
                  <TableRow>
                    <TableHead className="w-[200px]">Botão</TableHead>
                    <TableHead>Ações Configuradas</TableHead>
                    <TableHead>Visibilidade</TableHead>
                    <TableHead className="text-right w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buttons?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-64 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                          <div className="size-12 rounded-full bg-primary/5 flex items-center justify-center">
                            <Rocket className="size-6 opacity-40" />
                          </div>
                          <p className="text-sm font-medium">Nenhum botão configurado ainda.</p>
                          <ActionButtonForm 
                            trigger={
                              <Button variant="outline" size="sm" className="mt-2 text-xs">
                                Criar primeiro botão
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    buttons?.map((btn) => {
                      const colorInfo = PREDEFINED_COLORS.find(c => c.value === (btn.color || 'amber'))
                      return (
                        <TableRow key={btn.id} className="group hover:bg-accent/40 transition-colors border-b last:border-0">
                          <TableCell className="font-medium">
                            <div className={cn(
                              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold shadow-sm ring-1 ring-inset ring-white/10",
                              colorInfo?.bg, colorInfo?.text
                            )}>
                              {btn.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {btn.actions.length === 0 && <span className="text-[10px] text-muted-foreground italic">Sem ações</span>}
                              {btn.actions.map((act: any) => (
                                <div key={act.id} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/50">
                                  {act.actionType === 'CHANGE_STATUS' && <CheckCircle2 className="w-3 h-3 text-emerald-500/70" />}
                                  {act.actionType === 'ADD_COMMENT' && <MessageSquare className="w-3 h-3 text-blue-500/70" />}
                                  {act.actionType === 'FIRE_WEBHOOK' && <Globe className="w-3 h-3 text-amber-500/70" />}
                                  {act.actionType === 'COMPLETE_MAINTASK' && <Rocket className="w-3 h-3 text-rose-500/70" />}
                                  <span className="opacity-80">
                                    {act.actionType === 'CHANGE_STATUS' ? 'Status' : 
                                     act.actionType === 'ADD_COMMENT' ? 'Comentário' :
                                     act.actionType === 'FIRE_WEBHOOK' ? 'Webhook' : 'Projeto'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium bg-muted/30 w-fit px-2 py-0.5 rounded">
                              <Globe className="size-3 opacity-50" />
                              {btn.projectIds && JSON.parse(btn.projectIds).length > 0 
                                ? `${JSON.parse(btn.projectIds).length} projetos` 
                                : 'Todos os projetos'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <ActionButtonForm 
                                button={btn}
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary hover:bg-primary/10 transition-colors">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                onClick={() => deleteMutation.mutate({ fieldDefId: btn.id })}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
