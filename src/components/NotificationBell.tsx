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
import { Bell, X, Check, CalendarPlus, CalendarX, CalendarClock, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/hooks/useNotifications'
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'
import { usePushNotifications } from '@/hooks/usePushNotifications'

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
  const { permission, requestPermission } = usePushNotifications(userId)

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

      <PopoverContent className="w-96 max-w-[calc(100vw-2rem)] p-0 rounded-2xl overflow-hidden" align="end">
        {/* Header */}
        <div className="px-4 py-3 border-b flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h3 className="font-black tracking-tight text-gray-900 text-base">Notificaciones</h3>
            {permission !== 'granted' ? (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                onClick={requestPermission}
                title="Activar notificaciones push"
              >
                <Smartphone className="w-4 h-4 opacity-50" />
              </Button>
            ) : (
              <div className="flex items-center text-emerald-600" title="Notificaciones push activadas">
                <Smartphone className="w-4 h-4" />
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Lista de notificaciones */}
        <div className="max-h-[400px] overflow-y-auto">
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
                  className={`px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-all group ${
                    !notification.is_read ? 'bg-gray-50/50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3 items-start">
                    {/* Icono circular con color de fondo */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full ${styles.bgColor} flex items-center justify-center`}>
                        <NotificationIcon className={`w-5 h-5 ${styles.iconColor}`} />
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-gray-900">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(notification.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>

                    {/* Acciones - visibles en hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.is_read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Marcar como leído"
                          aria-label="Marcar como leído"
                        >
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Eliminar"
                        aria-label="Eliminar notificación"
                      >
                        <X className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer - Marcar todas como leídas */}
        {unreadCount > 0 && (
          <div className="p-3 border-t bg-white">
            <button
              onClick={() => {
                markAllAsRead()
              }}
              className="w-full text-center text-sm font-medium text-orange-600 hover:text-orange-700 transition-colors py-1"
            >
              Marcar todas como leídas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// ✅ Exportar con React.memo para prevenir re-renders innecesarios
export default memo(NotificationBell)
