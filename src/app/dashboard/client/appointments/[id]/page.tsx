'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  ArrowLeft, Calendar, Clock, MapPin, Phone, User,
  CheckCircle, AlertCircle, Edit, Trash2, Loader2
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { formatSpanishDate } from '@/lib/dateUtils'
import Link from 'next/link'
import LocationMapModal from '@/components/LocationMapModal'
import ModifyAppointmentDialog from '@/components/ModifyAppointmentDialog'
// Modular cancellation components
import { handleClientCancellation } from '@/lib/appointments/clientCancellationAdapter'

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  total_price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  pending_reason?: 'business_edited' | 'business_closed'
  client_notes?: string
  business: {
    id: string
    name: string
    address?: string
    phone?: string
    latitude?: number
    longitude?: number
    allow_client_cancellation: boolean
    allow_client_reschedule: boolean
    cancellation_policy_hours: number
    cancellation_policy_text?: string
  }
  appointment_services: {
    service: {
      id: string
      name: string
      description?: string
    }
    price: number
  }[]
  employee: {
    id: string
    first_name: string
    last_name: string
    position?: string
    avatar_url?: string
  }
}

export default function AppointmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { authState } = useAuth()
  const { toast } = useToast()
  const appointmentId = params.id as string
  const supabase = createClient()

  // State
  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showModifyModal, setShowModifyModal] = useState(false)

  useEffect(() => {
    if (appointmentId && authState.user) {
      fetchAppointment()
    }
  }, [appointmentId, authState.user])

  const fetchAppointment = async () => {
    if (!authState.user || !appointmentId) return

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          business:businesses(
            id,
            name,
            address,
            phone,
            latitude,
            longitude,
            allow_client_cancellation,
            allow_client_reschedule,
            cancellation_policy_hours,
            cancellation_policy_text
          ),
          employee:employees(id, first_name, last_name, position, avatar_url),
          appointment_services(
            service:services(id, name, description),
            price
          )
        `)
        .eq('id', appointmentId)
        .eq('client_id', authState.user.id)
        .single()

      if (error) {
        console.error('Error fetching appointment:', error)
        router.push('/dashboard/client')
        return
      }

      setAppointment(data)
    } catch (error) {
      console.error('Error fetching appointment:', error)
      router.push('/dashboard/client')
    } finally {
      setLoading(false)
    }
  }

  const canCancelAppointment = () => {
    if (!appointment) return false

    if (!appointment.business.allow_client_cancellation) {
      return false
    }

    // NUEVO: Si la cita está pending, siempre permitir cancelar
    // (significa que el negocio hizo cambios y el cliente debe poder responder)
    if (appointment.status === 'pending') {
      return true
    }

    // Validación normal de políticas de tiempo
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    return hoursUntil >= appointment.business.cancellation_policy_hours
  }

  const canRescheduleAppointment = () => {
    if (!appointment) return false

    if (!appointment.business.allow_client_reschedule) {
      return false
    }

    // NUEVO: Si la cita está pending, siempre permitir reprogramar
    // (significa que el negocio hizo cambios y el cliente debe poder responder)
    if (appointment.status === 'pending') {
      return true
    }

    // Validación normal de políticas de tiempo
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    const hoursUntil = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    return hoursUntil >= appointment.business.cancellation_policy_hours
  }

  const getHoursUntilAppointment = () => {
    if (!appointment) return 0
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    const now = new Date()
    return Math.max(0, (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60))
  }

  const handleCancelAppointment = async () => {
    if (!appointment || !authState.user) return

    if (!canCancelAppointment()) {
      const hoursUntil = getHoursUntilAppointment()
      toast({
        variant: 'destructive',
        title: 'No se puede cancelar',
        description: `Debes cancelar con al menos ${appointment.business.cancellation_policy_hours} horas de anticipación. Solo quedan ${Math.floor(hoursUntil)} horas.`,
      })
      return
    }

    try {
      setCancelling(true)

      // Use modular cancellation adapter
      await handleClientCancellation({
        appointmentId: appointment.id,
        clientId: authState.user.id,
        cancelReason: 'Cancelado por el cliente',
        onSuccess: () => {
          toast({
            title: 'Cita cancelada',
            description: 'Tu cita ha sido cancelada exitosamente.',
          })
          setTimeout(() => {
            router.push('/dashboard/client')
          }, 1000)
        },
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Error al cancelar',
            description: error.message || 'No se pudo cancelar la cita. Por favor intenta nuevamente.',
          })
        }
      })
    } catch (error) {
      console.error('Error cancelling appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cancelar',
        description: 'No se pudo cancelar la cita. Por favor intenta nuevamente.',
      })
    } finally {
      setCancelling(false)
    }
  }

  const handleAcceptChanges = async () => {
    if (!appointment) return

    try {
      setCancelling(true) // Reutilizamos el estado de loading

      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment.id)

      if (error) {
        console.error('Error accepting changes:', error)
        toast({
          variant: 'destructive',
          title: 'Error al aceptar',
          description: 'No se pudieron aceptar los cambios. Por favor intenta nuevamente.',
        })
        return
      }

      toast({
        title: 'Cambios aceptados',
        description: 'Has aceptado los cambios. Tu cita ha sido confirmada.',
      })

      // Recargar datos de la cita
      await fetchAppointment()
    } catch (error) {
      console.error('Error accepting changes:', error)
      toast({
        variant: 'destructive',
        title: 'Error al aceptar',
        description: 'No se pudieron aceptar los cambios. Por favor intenta nuevamente.',
      })
    } finally {
      setCancelling(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getStatusBadge = () => {
    switch (appointment?.status) {
      case 'confirmed':
        return <Badge className="bg-blue-600 text-white border-0 font-semibold px-3 py-1.5">Confirmada</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500 text-white border-0 font-semibold px-3 py-1.5">Pendiente</Badge>
      case 'completed':
        return <Badge className="bg-green-600 text-white border-0 font-semibold px-3 py-1.5">Completada</Badge>
      case 'cancelled':
        return <Badge className="bg-red-600 text-white border-0 font-semibold px-3 py-1.5">Cancelada</Badge>
      default:
        return <Badge className="bg-slate-200 text-slate-700 border-0 font-semibold px-3 py-1.5">{appointment?.status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando detalles de la cita</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Obteniendo información completa...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cita no encontrada</h1>
          <p className="text-gray-600 mb-4">No se pudo cargar la información de la cita.</p>
          <Link href="/dashboard/client">
            <Button className="bg-slate-900 hover:bg-slate-800">Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header Sticky - 100% width */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="w-full px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-14 sm:h-16 gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                <Link href="/dashboard/client/appointments">
                  <Button variant="ghost" size="sm" className="hover:bg-slate-100 hover:text-slate-900 h-8 sm:h-9 px-2 sm:px-3">
                    <ArrowLeft className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Volver</span>
                  </Button>
                </Link>
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Detalle de Cita</h1>
                  <p className="text-xs text-gray-500 hidden sm:block truncate">{appointment.business.name}</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                {getStatusBadge()}
              </div>
            </div>
          </div>
        </header>

        <div className="w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Hero Section - 100% width, bg-slate-900 */}
          <Card className="overflow-hidden border-0 shadow-lg">
            <div className="bg-slate-900 p-4 sm:p-8 text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
                <div className="flex-1 w-full">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{appointment.business.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    {appointment.appointment_services.map((appService, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/20"
                      >
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="text-sm sm:text-base font-medium">{appService.service.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-xs sm:text-sm text-white/70 font-medium mb-1">Total</p>
                  <p className="text-3xl sm:text-4xl font-bold">{formatPrice(appointment.total_price)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Main Content - 2 Columns Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6">
            {/* Left Column: Info Grid */}
            <div className="space-y-4 sm:space-y-6">
              {/* Appointment Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {/* Date Card */}
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-colors">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <p className="text-xs text-slate-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Fecha</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      {formatSpanishDate(appointment.appointment_date, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </CardContent>
                </Card>

                {/* Time Card */}
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-colors">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-900 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
                      <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <p className="text-xs text-slate-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Hora</p>
                    <p className="text-sm sm:text-base font-bold text-gray-900">
                      {appointment.start_time.slice(0, 5)} - {appointment.end_time.slice(0, 5)}
                    </p>
                  </CardContent>
                </Card>

                {/* Professional Card */}
                <Card className="border-2 border-slate-200 hover:border-slate-400 transition-colors">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Avatar className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 border-2 border-slate-200">
                      <AvatarImage src={appointment.employee.avatar_url} alt={appointment.employee.first_name} />
                      <AvatarFallback className="bg-slate-900 text-white">
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs text-slate-700 font-bold uppercase tracking-wide mb-1 sm:mb-2">Profesional</p>
                    <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                      {appointment.employee.first_name} {appointment.employee.last_name}
                    </p>
                    {appointment.employee.position && (
                      <p className="text-xs text-slate-600 mt-1">{appointment.employee.position}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Location Card (if available) */}
              {appointment.business.address && (
                <Card className="border-2 border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-slate-700" />
                      Ubicación
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-3">{appointment.business.address}</p>
                    {appointment.business.latitude && appointment.business.longitude && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLocationModal(true)}
                        className="border-2 hover:border-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <MapPin className="w-4 h-4 mr-2 text-slate-700" />
                        <span className="text-slate-900">Ver en mapa</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Alert para citas PENDING - Edición de negocio */}
              {appointment.status === 'pending' && appointment.pending_reason === 'business_edited' && (
                <Alert className="border-2 border-yellow-300 bg-yellow-50">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <AlertDescription className="text-sm text-yellow-800">
                    <p className="font-semibold mb-1">⏳ Cita Pendiente de Confirmación</p>
                    <p>
                      El negocio ha modificado tu cita. Por favor, revisa los cambios y confirma si puedes asistir 
                      en la nueva fecha y hora. Tienes <strong>24 horas</strong> para responder.
                    </p>
                    <p className="mt-2">
                      Puedes <strong>aceptar</strong>, <strong>reprogramar</strong> o <strong>cancelar</strong> esta cita 
                      sin restricciones de tiempo.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Alert para citas PENDING - Negocio cerrado */}
              {appointment.status === 'pending' && appointment.pending_reason === 'business_closed' && (
                <Alert className="border-2 border-orange-400 bg-orange-50">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <AlertDescription className="text-sm text-orange-900">
                    <p className="font-semibold mb-1">🔄 Reprogramación Requerida</p>
                    <p>
                      El negocio estará <strong>cerrado</strong> el día de tu cita. Necesitas reprogramar 
                      para otra fecha disponible.
                    </p>
                    <p className="mt-2">
                      Tienes <strong>7 días</strong> para reprogramar o cancelar. Si no respondes, 
                      la cita se cancelará automáticamente.
                    </p>
                    <p className="mt-2 font-semibold">
                      ⚠️ No podrás aceptar esta cita - debes elegir una nueva fecha.
                    </p>
                  </AlertDescription>
                </Alert>
              )}


            </div>

            {/* Right Column: Actions */}
            <div>
              <Card className="border-0 shadow-lg lg:sticky lg:top-24">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-base sm:text-lg font-semibold">¿Qué deseas hacer?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3">
                  {/* Accept Changes Button - Solo para citas pending por edición (NO para business_closed) */}
                  {appointment.status === 'pending' && appointment.pending_reason === 'business_edited' && (
                    <Button
                      onClick={handleAcceptChanges}
                      disabled={cancelling}
                      className="w-full justify-start h-auto py-4 bg-green-600 hover:bg-green-700 text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          {cancelling ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-white">{cancelling ? 'Aceptando...' : 'Aceptar Cambios'}</p>
                          <p className="text-xs text-white/90">Confirmar nueva fecha y hora</p>
                        </div>
                      </div>
                    </Button>
                  )}

                  {/* Modify Button */}
                  {appointment.business.allow_client_reschedule && canRescheduleAppointment() ? (
                    <Button
                      onClick={() => setShowModifyModal(true)}
                      className="w-full justify-start h-auto py-4 bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <Edit className="w-5 h-5 text-white" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-white">Modificar Cita</p>
                          <p className="text-xs text-white/90">Cambia fecha, hora o servicios</p>
                        </div>
                      </div>
                    </Button>
                  ) : (
                    <Button disabled className="w-full justify-start h-auto py-4 opacity-50 cursor-not-allowed bg-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                          <Edit className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-slate-600">Modificar Cita</p>
                          <p className="text-xs text-slate-500">No disponible</p>
                        </div>
                      </div>
                    </Button>
                  )}

                  {/* Cancel Button */}
                  {appointment.business.allow_client_cancellation && canCancelAppointment() ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={cancelling}
                          variant="outline"
                          className="w-full justify-start h-auto py-4 border-2 border-red-200 hover:border-red-500 hover:bg-red-50 text-red-700 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              {cancelling ? (
                                <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="text-left flex-1">
                              <p className="font-bold text-red-700">{cancelling ? 'Cancelando...' : 'Cancelar Cita'}</p>
                              <p className="text-xs text-red-600">Cancelación permanente</p>
                            </div>
                          </div>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                            <AlertCircle className="w-5 h-5 text-slate-700" />
                            ¿Estás seguro de cancelar esta cita?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-base pt-2 text-slate-600">
                            Esta acción <strong>no se puede deshacer</strong>. La cita será cancelada permanentemente y{' '}
                            {appointment.business.name} será notificado de la cancelación.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-2 border-slate-200 hover:bg-slate-100">
                            No, mantener cita
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelAppointment}
                            className="bg-slate-900 hover:bg-slate-800 text-white"
                          >
                            Sí, cancelar cita
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button disabled variant="outline" className="w-full justify-start h-auto py-4 opacity-50 cursor-not-allowed border-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                          <Trash2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="text-left flex-1">
                          <p className="font-bold text-slate-600">Cancelar Cita</p>
                          <p className="text-xs text-slate-500">No disponible</p>
                        </div>
                      </div>
                    </Button>
                  )}

                  {/* Contact Business */}
                  {appointment.business.phone && (
                    <>
                      <Separator className="my-4" />
                      <Button
                        asChild
                        variant="outline"
                        className="w-full border-2 hover:border-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <a href={`tel:${appointment.business.phone}`} className="flex items-center justify-center">
                          <Phone className="w-4 h-4 mr-2 text-slate-700" />
                          <span className="text-slate-900">Llamar al negocio</span>
                        </a>
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Alert para citas CONFIRMADAS con política cerrada */}
              {appointment.status !== 'pending' && (!canCancelAppointment() || !canRescheduleAppointment()) && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="font-semibold text-red-900 text-sm">Ventana de modificación cerrada</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Columna 1: Tiempo */}
                    <div className="flex gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-700">
                          Tu cita es en <span className="font-semibold text-orange-700">{Math.floor(getHoursUntilAppointment())}h</span>
                        </p>
                        <p className="text-gray-500 mt-0.5">
                          Se requieren {appointment.business.cancellation_policy_hours}h
                        </p>
                      </div>
                    </div>

                    {/* Columna 2: Contacto */}
                    {appointment.business.phone && (
                      <div className="flex gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-gray-700 mb-0.5">Contacta al negocio:</p>
                          <a 
                            href={`tel:${appointment.business.phone}`} 
                            className="font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {appointment.business.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Location Map Modal */}
      {appointment.business.latitude && appointment.business.longitude && (
        <LocationMapModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          latitude={appointment.business.latitude}
          longitude={appointment.business.longitude}
          businessName={appointment.business.name}
          address={appointment.business.address || ''}
          theme="client"
        />
      )}

      {/* Modify Appointment Modal */}
      <ModifyAppointmentDialog
        isOpen={showModifyModal}
        onClose={() => setShowModifyModal(false)}
        appointment={appointment}
        onSuccess={fetchAppointment}
      />
    </>
  )
}
