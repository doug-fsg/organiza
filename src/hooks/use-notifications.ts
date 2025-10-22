import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export function useNotifications(userId: string) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  const utils = api.useUtils()

  // Query para buscar notificações não lidas
  const { data: notifications, refetch } = api.notification.getByUser.useQuery(
    { userId, read: false },
    { 
      enabled: isEnabled,
      refetchInterval: 15000, // Reduzido para 15 segundos
    }
  )

  // Query para buscar todas as notificações
  const { data: allNotifications } = api.notification.getByUser.useQuery(
    { userId },
    { enabled: isEnabled }
  )

  // Query para contar notificações não lidas
  const { data: unreadCount } = api.notification.getUnreadCount.useQuery(
    { userId },
    { 
      enabled: isEnabled,
      refetchInterval: 15000, // Reduzido para 15 segundos
    }
  )

  // Mutation para marcar como lida
  const markAsRead = api.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getByUser.invalidate({ userId })
      utils.notification.getUnreadCount.invalidate({ userId })
    },
  })

  // Mutation para marcar todas como lidas
  const markAllAsRead = api.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.getByUser.invalidate({ userId })
      utils.notification.getUnreadCount.invalidate({ userId })
    },
  })

  // Verificar novas notificações e mostrar toast
  useEffect(() => {
    if (!isEnabled || !notifications) return

    const newNotifications = notifications.filter(
      notification => new Date(notification.createdAt) > lastCheck
    )

    newNotifications.forEach(notification => {
      const getToastIcon = (type: string) => {
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

      toast(
        `${getToastIcon(notification.type)} ${notification.message}`,
        {
          duration: 5000,
          position: 'top-right',
          style: {
            background: '#3b82f6',
            color: '#fff',
          },
        }
      )
    })

    if (newNotifications.length > 0) {
      setLastCheck(new Date())
    }
  }, [notifications, lastCheck, isEnabled])

  // Habilitar notificações
  const enableNotifications = () => {
    setIsEnabled(true)
    setLastCheck(new Date())
  }

  // Desabilitar notificações
  const disableNotifications = () => {
    setIsEnabled(false)
  }

  return {
    notifications: allNotifications || [],
    unreadNotifications: notifications || [],
    unreadCount: unreadCount || 0,
    isEnabled,
    enableNotifications,
    disableNotifications,
    markAsRead: (id: string) => markAsRead.mutate({ id }),
    markAllAsRead: () => markAllAsRead.mutate({ userId }),
    refetch,
  }
}
