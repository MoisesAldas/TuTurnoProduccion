/**
 * useNotifications Hook
 *
 * Hook para gestionar el estado completo de notificaciones:
 * - Fetch inicial de notificaciones
 * - Marcar como leído (individual y todas)
 * - Eliminar notificaciones
 * - Agregar nuevas notificaciones (desde Realtime)
 * - Contador de no leídas
 *
 * @example
 * ```tsx
 * const {
 *   notifications,
 *   unreadCount,
 *   loading,
 *   markAsRead,
 *   markAllAsRead,
 *   deleteNotification,
 *   addNotification
 * } = useNotifications(userId)
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import type { Notification } from './useRealtimeNotifications'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (!error && data) {
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      } else if (error) {
        console.error('Error fetching notifications:', error)
      }
    } catch (error) {
      console.error('Unexpected error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, supabase])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      if (!error) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      } else {
        console.error('Error marking notification as read:', error)
      }
    } catch (error) {
      console.error('Unexpected error marking notification as read:', error)
    }
  }, [supabase])

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
      } else {
        console.error('Error marking all notifications as read:', error)
      }
    } catch (error) {
      console.error('Unexpected error marking all notifications as read:', error)
    }
  }, [userId, supabase])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (!error) {
        // Actualizar estado local
        setNotifications(prev => {
          const deleted = prev.find(n => n.id === notificationId)
          const filtered = prev.filter(n => n.id !== notificationId)

          // Si la notificación eliminada no estaba leída, decrementar contador
          if (deleted && !deleted.is_read) {
            setUnreadCount(prevCount => Math.max(0, prevCount - 1))
          }

          return filtered
        })
      } else {
        console.error('Error deleting notification:', error)
      }
    } catch (error) {
      console.error('Unexpected error deleting notification:', error)
    }
  }, [supabase])

  // Add new notification (llamado desde Realtime)
  const addNotification = useCallback((notification: Notification) => {
    console.log('📥 [useNotifications] addNotification llamado con:', notification)
    console.log('📥 [useNotifications] Notificaciones actuales:', notifications.length)
    setNotifications(prev => {
      console.log('📥 [useNotifications] Agregando a lista existente de:', prev.length)
      const updated = [notification, ...prev].slice(0, 20)
      console.log('📥 [useNotifications] Nueva lista tendrá:', updated.length)
      return updated
    })
    if (!notification.is_read) {
      console.log('📥 [useNotifications] Incrementando unreadCount')
      setUnreadCount(prev => {
        console.log('📥 [useNotifications] unreadCount anterior:', prev)
        return prev + 1
      })
    }
    console.log('📥 [useNotifications] addNotification completado')
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    refetch: fetchNotifications,
    supabase // Exportar supabase para uso externo
  }
}
