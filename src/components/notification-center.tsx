'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel,
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, CheckCheck, Settings, X } from 'lucide-react'
import { useNotifications } from '@/hooks/use-notifications'

interface NotificationCenterProps {
  userId: string
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const {
    notifications,
    unreadNotifications,
    unreadCount,
    isEnabled,
    enableNotifications,
    disableNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications(userId)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUBTASK_COMPLETED':
        return '✅'
      case 'SUBTASK_ASSIGNED':
        return '📋'
      case 'SUBTASK_BLOCKED':
        return '🚫'
      case 'SUBTASK_OVERDUE':
        return '⏰'
      case 'MAIN_TASK_COMPLETED':
        return '🎉'
      case 'DEPENDENCY_RESOLVED':
        return '🔓'
      default:
        return '🔔'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'SUBTASK_COMPLETED':
      case 'MAIN_TASK_COMPLETED':
        return 'bg-green-50 border-green-200'
      case 'SUBTASK_BLOCKED':
        return 'bg-red-50 border-red-200'
      case 'SUBTASK_OVERDUE':
        return 'bg-orange-50 border-orange-200'
      case 'DEPENDENCY_RESOLVED':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}m atrás`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h atrás`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d atrás`
    
    return notificationDate.toLocaleDateString('pt-BR')
  }

  return (
    <>
      {/* Botão de Notificações */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="font-semibold">
            <div className="flex items-center justify-between">
              <span>Notificações</span>
              <div className="flex items-center space-x-1">
                {!isEnabled ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={enableNotifications}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={disableNotifications}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="h-6 w-6 p-0"
                  >
                    <CheckCheck className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          {!isEnabled ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>Notificações desabilitadas</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={enableNotifications}
                className="mt-2"
              >
                Habilitar Notificações
              </Button>
            </div>
          ) : unreadNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação nova</p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {unreadNotifications.slice(0, 5).map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className="p-3 cursor-pointer"
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3 w-full">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              
              {unreadNotifications.length > 5 && (
                <DropdownMenuItem 
                  className="text-center text-sm text-muted-foreground"
                  onClick={() => setIsDialogOpen(true)}
                >
                  Ver todas ({unreadNotifications.length})
                </DropdownMenuItem>
              )}
            </div>
          )}
          
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-center text-sm"
                onClick={() => setIsDialogOpen(true)}
              >
                Ver todas as notificações
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog para ver todas as notificações */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] sm:max-h-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Todas as Notificações</span>
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar todas como lidas
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] pr-4">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`${getNotificationColor(notification.type)} ${
                      !notification.read ? 'border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(notification.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
