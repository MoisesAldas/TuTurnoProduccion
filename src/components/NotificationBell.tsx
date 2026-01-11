'use client'

/**
 * NotificationBell Component
 *
 * Componente de campana de notificaciones con:
 * - Badge con contador de notificaciones no leídas
 * - Popover con lista de notificaciones
 * - Reproducción de sonido al recibir notificación
 * - Toast notification temporal
 * - Marcar como leído / Eliminar
 * - Navegación a la cita al hacer click
 *
 * Integra con:
 * - useNotifications: Estado y operaciones CRUD
 * - useRealtimeNotifications: Suscripción en tiempo real
 * - useToast: Notificaciones toast
 * - useRouter: Navegación
 */

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { Bell, X, Check, CalendarPlus, CalendarX, CalendarClock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/hooks/useNotifications'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

interface NotificationBellProps {
  userId: string | undefined
}

/**
 * Obtiene los estilos visuales según el tipo de notificación
 */
const getNotificationStyles = (type: string) => {
  switch (type) {
    case 'new_appointment':
      return {
        icon: CalendarPlus,
        iconColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-l-emerald-500',
        badgeBg: 'bg-emerald-100',
        badgeText: 'text-emerald-700',
        badgeLabel: 'Nueva reserva'
      }
    case 'appointment_cancelled_by_client':
      return {
        icon: CalendarX,
        iconColor: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-l-red-500',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-700',
        badgeLabel: 'Cancelación'
      }
    case 'appointment_modified_by_client':
      return {
        icon: CalendarClock,
        iconColor: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-l-blue-500',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-700',
        badgeLabel: 'Modificación'
      }
    case 'appointment_confirmed':
      return {
        icon: Check,
        iconColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-l-green-500',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-700',
        badgeLabel: 'Confirmación'
      }
    case 'appointment_cancelled':
      return {
        icon: CalendarX,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-l-orange-500',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-700',
        badgeLabel: 'Cancelado'
      }
    case 'appointment_rescheduled':
      return {
        icon: CalendarClock,
        iconColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-l-orange-500',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-700',
        badgeLabel: 'Reprogramación'
      }
    default:
      return {
        icon: Bell,
        iconColor: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-l-gray-500',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-700',
        badgeLabel: 'Notificación'
      }
  }
}

function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    supabase
  } = useNotifications(userId)

  // Inicializar audio
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/sounds/notification.mp3')
      audioRef.current.volume = 0.5
    }
  }, [])

  // ✅ Memoizar el callback para evitar re-suscripciones
  const handleNewNotification = useCallback((notification: any) => {
    console.log('🎯 [NotificationBell] ============ INICIO handleNewNotification ============')
    console.log('🎯 [NotificationBell] Notificación recibida:', notification)
    console.log('🎯 [NotificationBell] addNotification existe?', !!addNotification)
    console.log('🎯 [NotificationBell] toast existe?', !!toast)

    // Agregar al estado
    console.log('🎯 [NotificationBell] Llamando addNotification...')
    addNotification(notification)
    console.log('🎯 [NotificationBell] addNotification completado')

    // Reproducir sonido (solo si el usuario ha interactuado con la página)
    console.log('🎯 [NotificationBell] Intentando reproducir sonido...')
    audioRef.current?.play().catch(err => {
      console.warn('⚠️ [NotificationBell] No se pudo reproducir sonido:', err)
      // Los navegadores bloquean audio automático hasta que el usuario interactúe
    })

    // Mostrar toast
    console.log('🎯 [NotificationBell] Mostrando toast...')
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000
    })
    console.log('🎯 [NotificationBell] ============ FIN handleNewNotification ============')
  }, [addNotification, toast]) // Dependencias estables

  // ✅ Logging reducido - solo en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🟣 [NotificationBell] Component mounted/updated', {
        userId,
        hasCallback: !!handleNewNotification,
        unreadCount,
        notificationsLength: notifications.length
      })
    }
  }, [userId, unreadCount, notifications.length])

  // Realtime subscription
  useRealtimeNotifications({
    userId,
    onNewNotification: handleNewNotification,
    debug: true // ✅ Habilitado para debugging
  })

  const handleNotificationClick = async (notification: any) => {
    // Marcar como leído
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Cerrar popover
    setOpen(false)

    // Navegar a la cita en el día exacto
    if (notification.appointment_id && supabase) {
      try {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('appointment_date')
          .eq('id', notification.appointment_id)
          .single()

        if (appointment?.appointment_date) {
          router.push(`/dashboard/business/appointments?date=${appointment.appointment_date}`)
        } else {
          router.push('/dashboard/business/appointments')
        }
      } catch (error) {
        console.error('Error fetching appointment date:', error)
        router.push('/dashboard/business/appointments')
      }
    } else {
      router.push('/dashboard/business/appointments')
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

      // Hace menos de 1 minuto
      if (diffInSeconds < 60) {
        return 'Justo ahora'
      }

      // Hace menos de 1 hora
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60)
        return `Hace ${minutes} min${minutes !== 1 ? 's' : ''}`
      }

      // Hace menos de 24 horas
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600)
        return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`
      }

      // Formato completo
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      return dateString
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative"
          aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídas)` : ''}`}
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-1 text-xs bg-orange-600 hover:bg-orange-700"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <h3 className="font-semibold text-gray-900">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                markAllAsRead()
              }}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 text-xs h-auto py-1 px-2"
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>

        {/* Lista de notificaciones */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-2"></div>
              <p className="text-sm">Cargando...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium">No tienes notificaciones</p>
              <p className="text-xs mt-1">Te avisaremos cuando llegue algo nuevo</p>
            </div>
          ) : (
            notifications.map(notification => {
              const styles = getNotificationStyles(notification.type)
              const NotificationIcon = styles.icon

              return (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notification.is_read
                      ? `${styles.bgColor} border-l-4 ${styles.borderColor}`
                      : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3 items-start">
                    {/* Icono tipo de notificación */}
                    <div className="flex-shrink-0 mt-0.5">
                      <NotificationIcon className={`w-5 h-5 ${styles.iconColor}`} />
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Badge tipo + título */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`${styles.badgeBg} ${styles.badgeText} text-xs font-medium px-2 py-0.5`}
                        >
                          {styles.badgeLabel}
                        </Badge>
                        {!notification.is_read && (
                          <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" aria-label="No leído"></span>
                        )}
                      </div>

                      <h4 className={`font-medium text-sm ${
                        !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Marcar como leído"
                          aria-label="Marcar como leído"
                        >
                          <Check className="w-4 h-4 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title="Eliminar"
                        aria-label="Eliminar notificación"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer (opcional - mostrar solo si hay notificaciones) */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50 text-center">
            <p className="text-xs text-gray-500">
              Mostrando las últimas {notifications.length} notificaciones
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ✅ Exportar con React.memo para prevenir re-renders innecesarios
export default memo(NotificationBell)
