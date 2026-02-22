'use client'

import React, { useState, useEffect } from 'react'
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
  CheckCircle, AlertCircle, Edit, Trash2, Loader2, Store, XCircle
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
      duration_minutes: number
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
            service:services(id, name, description, duration_minutes),
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

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { label: 'Confirmada', color: 'text-emerald-500 bg-emerald-50/50 ring-emerald-500/30', icon: CheckCircle }
      case 'pending':
        return { label: 'Pendiente', color: 'text-amber-500 bg-amber-50/50 ring-amber-500/30', icon: Clock }
      case 'completed':
        return { label: 'Completada', color: 'text-slate-500 bg-slate-50/50 ring-slate-500/30', icon: CheckCircle }
      case 'cancelled':
        return { label: 'Cancelada', color: 'text-rose-500 bg-rose-50/50 ring-rose-500/30', icon: XCircle }
      default:
        return { label: status, color: 'text-slate-500 bg-slate-50/50 ring-slate-500/30', icon: AlertCircle }
    }
  }

  const getStatusBadge = () => {
    if (!appointment) return null
    const info = getStatusInfo(appointment.status)
    const Icon = info.icon
    return (
      <Badge variant="outline" className={`${info.color} text-[10px] sm:text-[11px] px-3 sm:px-5 py-1.5 sm:py-2.5 font-black uppercase tracking-widest border-0 shadow-lg backdrop-blur-md bg-white/10 rounded-xl ring-1`}>
        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
        {info.label}
      </Badge>
    )
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Universal Sticky Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30 shadow-sm">
          <div className="w-full px-6 py-4 flex items-center justify-between">
            <div className="relative pl-6">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-slate-700 to-slate-900 rounded-full shadow-[0_0_12px_rgba(30,41,59,0.2)]" />
              <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-500 mb-0.5">Gestión de Citas</p>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                Detalle de Cita
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                {getStatusBadge()}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="rounded-xl hover:bg-slate-100 font-bold text-slate-500 h-10 px-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span>Volver</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full px-6 py-6 space-y-4">
          {/* Section Hero: Compartimentado Premium */}
          <div className="relative h-48 sm:h-56 rounded-3xl overflow-hidden shadow-xl group">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 to-transparent"></div>

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Establecimiento</p>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter">
                      {appointment.business.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {appointment.appointment_services.map((appService, index) => (
                      <Badge key={index} className="bg-white/10 hover:bg-white/20 text-white border-0 text-[10px] font-bold px-3 py-1 rounded-lg backdrop-blur-md">
                        {appService.service.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-end gap-3 shrink-0">
                  <div className="sm:hidden mb-2">
                    {getStatusBadge()}
                  </div>
                  <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-3xl shadow-xl min-w-[120px] text-right">
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">Total Reserva</p>
                    <p className="text-xl sm:text-2xl font-black text-white tracking-tighter">
                      {formatPrice(appointment.total_price)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (8/12) */}
            <div className="lg:col-span-9 space-y-4">
              {/* Metrics (Universal SaaS scale) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all bg-white group">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 h-full">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-950 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 shadow-lg shadow-slate-900/10">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Fecha</p>
                      <div className="text-sm sm:text-base font-black text-slate-900 tracking-tight capitalize truncate">
                        {formatSpanishDate(appointment.appointment_date)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all bg-white group">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 h-full">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-950 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-105 shadow-lg shadow-slate-900/10">
                      <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Hora</p>
                      <div className="text-sm sm:text-base font-black text-slate-900 tracking-tight truncate">
                        {appointment.start_time.slice(0, 5)}
                      </div>
                      <p className="text-[8px] sm:text-[9px] font-medium text-slate-400 truncate">Llegada estimada</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm rounded-2xl hover:shadow-md transition-all bg-white group col-span-2 sm:col-span-1">
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 h-full">
                    <Avatar className="w-9 h-9 sm:w-10 sm:h-10 border border-slate-100 shrink-0 shadow-sm">
                      <AvatarImage src={appointment.employee.avatar_url} />
                      <AvatarFallback className="bg-slate-950 text-white font-black text-[9px]">
                        {appointment.employee.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Atención por</p>
                      <div className="text-sm sm:text-base font-black text-slate-900 tracking-tight uppercase truncate">
                        {appointment.employee.first_name}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Alertas */}
              <div className="space-y-4">
                {appointment.status === 'pending' && (
                  <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/50 p-6 flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-amber-900 tracking-tight">Estado: Pendiente de Confirmación</h3>
                      <p className="text-amber-800 text-xs font-semibold leading-relaxed mt-1">
                        {appointment.pending_reason === 'business_edited' 
                          ? 'El negocio ha modificado los detalles. Por favor, revisa y acepta los cambios.'
                          : 'Se requiere reprogramación debido al cierre temporal del establecimiento.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Services List and Location */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="p-4 border-b border-slate-50">
                    <CardTitle className="text-base font-black text-slate-900 tracking-tight">Servicios Reservados</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      {appointment.appointment_services.map((appService, index) => (
                        <div key={index} className="px-5 py-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-black text-slate-900 uppercase tracking-tight text-[10px]">{appService.service.name}</p>
                            <p className="text-[10px] text-gray-400 font-medium">Duración: {appService.service.duration_minutes} min</p>
                          </div>
                          <p className="font-black text-slate-900 text-lg tracking-tight">{formatPrice(appService.price)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-950 p-4 sm:p-5 flex justify-between items-center text-white">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] opacity-40">Total Final</p>
                      <p className="text-xl font-black tracking-tighter">{formatPrice(appointment.total_price)}</p>
                    </div>
                  </CardContent>
                </Card>

                {appointment.business.address && (
                  <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white flex flex-col h-full">
                    <CardHeader className="p-4 border-b border-slate-50">
                      <CardTitle className="text-base font-black text-slate-900 tracking-tight">Ubicación</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 flex flex-col justify-between flex-1">
                      <div className="space-y-3">
                        <p className="text-gray-500 font-medium text-xs leading-relaxed text-left">{appointment.business.address}</p>
                      </div>
                      {appointment.business.latitude && appointment.business.longitude && (
                        <Button
                          size="sm"
                          onClick={() => setShowLocationModal(true)}
                          className="bg-slate-950 hover:bg-slate-800 text-white font-black rounded-xl h-9 px-5 text-[10px] transition-all shadow-lg active:scale-95 w-full sm:w-fit mt-4"
                        >
                          Ver en Mapa
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Right Column (3/12): Dashboard Panel style */}
            <div className="lg:col-span-3">
              <div className="lg:sticky lg:top-24 space-y-4">
                <Card className="border-0 shadow-xl rounded-[2rem] bg-white overflow-hidden">
                  <div className="bg-slate-50 p-5 pb-2">
                    <div className="relative pl-6">
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-slate-900 rounded-full" />
                      <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Acciones</p>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Opciones</h2>
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-2.5">
                    {appointment.status === 'pending' && appointment.pending_reason === 'business_edited' && (
                      <Button
                        onClick={handleAcceptChanges}
                        disabled={cancelling}
                        className="w-full h-11 bg-slate-950 hover:bg-slate-800 text-white rounded-xl shadow-lg transition-all font-black uppercase tracking-wider text-xs active:scale-95"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aceptar Cambios
                      </Button>
                    )}

                    {appointment.business.allow_client_reschedule && canRescheduleAppointment() ? (
                      <Button
                        onClick={() => setShowModifyModal(true)}
                        className="w-full h-11 bg-slate-950 hover:bg-slate-800 text-white rounded-xl transition-all font-black uppercase tracking-wider text-xs active:scale-95 shadow-sm"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Modificar Cita
                      </Button>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 opacity-60 flex items-center gap-3 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
                        <Edit className="w-3.5 h-3.5" />
                        Reprogramación cerrada
                      </div>
                    )}

                    {appointment.business.allow_client_cancellation && canCancelAppointment() ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            disabled={cancelling}
                            variant="ghost"
                            className="w-full h-11 text-rose-600 hover:bg-rose-50 rounded-xl font-extrabold uppercase tracking-wider text-xs"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancelar Cita
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[2.5rem] p-8 border-0 shadow-2xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-2xl font-black tracking-tight">¿Confirmar Acción?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-500 font-medium leading-relaxed">
                              La cancelación es inmediata y liberará el cupo para otros clientes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="pt-6 gap-3">
                            <AlertDialogCancel className="rounded-xl border-slate-100 font-bold h-11 flex-1">Cerrar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleCancelAppointment}
                              className="bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl h-11 flex-1 shadow-lg shadow-rose-600/20"
                            >
                              Cancelar Cita
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 opacity-60 flex items-center gap-2.5 text-slate-400 font-extrabold uppercase tracking-widest text-[9px]">
                        <Trash2 className="w-3 h-3" />
                        Cancelación cerrada
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Info Card de Políticas */}
                <div className="rounded-3xl bg-slate-950 p-6 shadow-xl text-white space-y-2 border border-white/5">
                  <p className="text-[9px] font-extrabold text-white/30 uppercase tracking-[0.2em]">Importante</p>
                  <h4 className="font-black tracking-tight text-white mb-2">Política del Establecimiento</h4>
                  <p className="text-[11px] text-white/60 leading-relaxed font-medium">
                    Cancelaciones y cambios permitidos hasta {appointment.business.cancellation_policy_hours} horas antes de la cita.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Universal Modals */}
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

        <ModifyAppointmentDialog
          isOpen={showModifyModal}
          onClose={() => setShowModifyModal(false)}
          appointment={appointment}
          onSuccess={fetchAppointment}
        />
      </div>
    </>
  )
}
