'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Calendar as CalendarIcon, Clock, MapPin, Phone,
  User, Star, Edit, Trash2, CheckCircle,
  XCircle, MoreVertical, Search, AlertTriangle,
  Store, Receipt, CreditCard, Hash
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { patterns } from '@/lib/design-tokens'
import Link from 'next/link'
import ReviewModal from '@/components/ReviewModal'

// NOTE: All data fetching and state logic from the original file is preserved.
// Only the JSX for the appointment cards has been restructured to be mobile-first.

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  total_price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  client_notes?: string
  business?: {
    id: string
    name: string
    address?: string
    phone?: string
    cover_photo_url?: string // Mapped from cover_image_url in DB
  } | null
  appointment_services: {
    service?: {
      id: string
      name: string
      description?: string
    } | null
    price: number
  }[]
  employee?: {
    id: string
    first_name: string
    last_name: string
    position?: string
    avatar_url?: string
  } | null
  created_at: string
  has_review?: boolean
}

export default function ClientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [newTime, setNewTime] = useState('')

  const { authState } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      fetchAppointments()
    }
  }, [authState.user])

  // Auto-select first appointment when list changes
  useEffect(() => {
    if (appointments.length > 0 && !selectedAppointment) {
      setSelectedAppointment(appointments[0])
    }
  }, [appointments])

  const fetchAppointments = async () => {
    if (!authState.user) return
    try {
      setLoading(true)

      // Use optimized RPC function instead of multiple queries
      const { data, error } = await supabase
        .rpc('get_client_appointments_with_reviews', {
          p_client_id: authState.user.id
        })

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      // Transform RPC result to match component interface
      const transformedData = (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        total_price: apt.total_price,
        status: apt.status,
        client_notes: apt.client_notes,
        created_at: apt.created_at,
        has_review: apt.has_review,
        business: {
          id: apt.business_id,
          name: apt.business_name,
          address: apt.business_address,
          phone: apt.business_phone,
          cover_photo_url: apt.business_cover_image_url
        },
        employee: apt.employee_id ? {
          id: apt.employee_id,
          first_name: apt.employee_first_name,
          last_name: apt.employee_last_name,
          position: apt.employee_position,
          avatar_url: apt.employee_avatar_url
        } : null,
        appointment_services: (apt.services || []).map((s: any) => ({
          service: {
            id: s.service_id,
            name: s.service_name,
            description: s.service_description
          },
          price: s.price
        }))
      }))

      setAppointments(transformedData)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return
    try {
      // 1. Actualizar estado de la cita en DB
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          client_notes: `${selectedAppointment.client_notes || ''}\nMotivo de cancelación: ${cancelReason}`.trim()
        })
        .eq('id', selectedAppointment.id)

      if (error) {
        console.error('Error canceling appointment:', error)
        toast({
          variant: 'destructive',
          title: 'Error al cancelar',
          description: 'No pudimos cancelar tu cita. Por favor intenta nuevamente.',
        })
        return
      }

      // 2. Enviar notificaciones (cliente + negocio)
      try {
        await fetch('/api/send-cancellation-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: selectedAppointment.id,
            cancellationReason: cancelReason
          })
        })
      } catch (emailError) {
        console.error('Error sending cancellation emails:', emailError)
        // No bloqueamos la operación si el email falla
      }

      // 3. Actualizar UI
      await fetchAppointments()
      setShowCancelDialog(false)
      setSelectedAppointment(null)
      setCancelReason('')
      toast({
        title: 'Cita cancelada',
        description: 'Tu cita ha sido cancelada exitosamente.',
      })
    } catch (error) {
      console.error('Error canceling appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cancelar',
        description: 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
      })
    }
  }

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment || !newDate || !newTime) return
    try {
      // Guardar datos VIEJOS antes del UPDATE
      const oldData = {
        oldDate: selectedAppointment.appointment_date,
        oldTime: selectedAppointment.start_time,
        oldEndTime: selectedAppointment.end_time,
        oldEmployeeId: selectedAppointment.employee?.id
      }

      // 1. Actualizar la cita en DB
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate.toISOString().split('T')[0],
          start_time: newTime,
          status: 'pending'
        })
        .eq('id', selectedAppointment.id)

      if (error) {
        console.error('Error rescheduling appointment:', error)
        toast({
          variant: 'destructive',
          title: 'Error al reagendar',
          description: 'No pudimos reagendar tu cita. Por favor intenta nuevamente.',
        })
        return
      }

      // 2. Enviar notificaciones (cliente + negocio)
      try {
        await fetch('/api/send-rescheduled-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: selectedAppointment.id,
            changes: oldData
          })
        })
      } catch (emailError) {
        console.error('Error sending rescheduled emails:', emailError)
        // No bloqueamos la operación si el email falla
      }

      // 3. Actualizar UI
      await fetchAppointments()
      setShowRescheduleDialog(false)
      setSelectedAppointment(null)
      setNewDate(undefined)
      setNewTime('')
      toast({
        title: 'Cita reagendada',
        description: 'Tu cita ha sido reagendada exitosamente.',
      })
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      toast({
        variant: 'destructive',
        title: 'Error al reagendar',
        description: 'Ocurrió un error inesperado. Por favor intenta nuevamente.',
      })
    }
  }

  const handleCloseReviewModal = () => {
    setShowReviewModal(false)
    setSelectedAppointment(null)
  }

  const handleReviewSubmitted = (appointmentId: string) => {
    // Update local state immediately
    setAppointments(prevAppointments =>
      prevAppointments.map(apt =>
        apt.id === appointmentId
          ? { ...apt, has_review: true }
          : apt
      )
    )
    // Also update selectedAppointment if it's the one being reviewed
    if (selectedAppointment?.id === appointmentId) {
      setSelectedAppointment({ ...selectedAppointment, has_review: true })
    }
    // Refresh from server in background
    fetchAppointments()
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
      case 'confirmed': return { label: 'Confirmada', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'in_progress': return { label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock }
      case 'completed': return { label: 'Completada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
      case 'cancelled': return { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle }
      case 'no_show': return { label: 'No asistió', color: 'bg-gray-100 text-gray-800', icon: XCircle }
      default: return { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    }
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatDateShort = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`
    return `${minutes} min`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(price)
  }

  const isUpcoming = (appointment: Appointment) => {
    const now = new Date()
    const aptDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    return aptDate > now && ['pending', 'confirmed'].includes(appointment.status)
  }

  const isPast = (appointment: Appointment) => {
    const now = new Date()
    const aptDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    return aptDate <= now || ['completed', 'cancelled', 'no_show'].includes(appointment.status)
  }

  const canModify = (appointment: Appointment) => {
    return isUpcoming(appointment) && appointment.status !== 'cancelled'
  }

  const filteredAppointments = appointments.filter(appointment => {
    const businessName = appointment.business?.name || ''
    const serviceName = appointment.appointment_services[0]?.service?.name || ''
    const employeeName = appointment.employee ? `${appointment.employee.first_name} ${appointment.employee.last_name}` : ''
    const matchesSearch = businessName.toLowerCase().includes(searchQuery.toLowerCase()) || serviceName.toLowerCase().includes(searchQuery.toLowerCase()) || employeeName.toLowerCase().includes(searchQuery.toLowerCase())

    switch (filter) {
      case 'upcoming': return isUpcoming(appointment) && matchesSearch
      case 'past': return isPast(appointment) && !['cancelled'].includes(appointment.status) && matchesSearch
      case 'cancelled': return appointment.status === 'cancelled' && matchesSearch
      default: return matchesSearch
    }
  })

  if (loading) {
    return (
      <div className="h-full flex overflow-hidden">
        <div className="w-full lg:w-96 border-r bg-white">
          <div className="p-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
        <div className="hidden lg:block flex-1 p-8">
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Appointments List */}
        <div className="w-full lg:w-96 border-r bg-white flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3 flex-shrink-0">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-emerald-600" />
              <Input
                type="text"
                placeholder="Buscar negocios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg'
                    : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                }`}
              >
                Todas
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('upcoming')}
                className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                  filter === 'upcoming'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg'
                    : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                }`}
              >
                Próximas
              </Button>
              <Button
                variant={filter === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('past')}
                className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                  filter === 'past'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg'
                    : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                }`}
              >
                Pasadas
              </Button>
              <Button
                variant={filter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('cancelled')}
                className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                  filter === 'cancelled'
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg'
                    : 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200'
                }`}
              >
                Canceladas
              </Button>
            </div>
          </div>

          {/* Appointments List */}
          <div className="flex-1 overflow-y-auto">
            {filteredAppointments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CalendarIcon className="w-10 h-10 text-emerald-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">No hay citas</h3>
                <p className="text-sm text-gray-500 mb-4">Explora negocios y reserva tu primera cita</p>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/marketplace">
                    <Store className="w-4 h-4 mr-2" />
                    Explorar negocios
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAppointments.map((appointment) => (
                  <button
                    key={appointment.id}
                    onClick={() => setSelectedAppointment(appointment)}
                    className={`w-full p-4 text-left transition-all duration-200 ${
                      selectedAppointment?.id === appointment.id
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 border-l-4 border-l-emerald-600 shadow-sm'
                        : 'hover:bg-gray-50/80 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex gap-3">
                      {/* Business Photo */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0 ring-1 ring-gray-200/50 shadow-sm">
                        {appointment.business?.cover_photo_url ? (
                          <img
                            src={appointment.business.cover_photo_url}
                            alt={appointment.business.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                            <Store className="w-6 h-6 text-emerald-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate mb-0.5">
                          {appointment.business?.name || 'Negocio'}
                        </h3>
                        <p className="text-sm text-gray-500 mb-1.5">
                          {formatDateShort(appointment.appointment_date)} a las {appointment.start_time.slice(0, 5)}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatPrice(appointment.total_price)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {appointment.appointment_services.length} servicio{appointment.appointment_services.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Appointment Detail */}
        <div className="hidden lg:block flex-1 overflow-y-auto bg-gray-50">
          {selectedAppointment ? (
            <div>
              {/* Header with Business Photo */}
              <div className="relative h-72 bg-gradient-to-br from-gray-900 to-gray-800">
                {selectedAppointment.business?.cover_photo_url ? (
                  <img
                    src={selectedAppointment.business.cover_photo_url}
                    alt={selectedAppointment.business.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900 to-teal-800">
                    <Store className="w-20 h-20 text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                    {selectedAppointment.business?.name || 'Negocio'}
                  </h1>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div>
                  <Badge className={`${getStatusInfo(selectedAppointment.status).color} text-sm px-4 py-1.5 font-medium rounded-full shadow-sm`}>
                    {React.createElement(getStatusInfo(selectedAppointment.status).icon, { className: 'w-4 h-4 mr-1.5 inline' })}
                    {getStatusInfo(selectedAppointment.status).label}
                  </Badge>
                </div>

                {/* Date & Time */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
                    {formatDate(selectedAppointment.appointment_date)} a las {selectedAppointment.start_time.slice(0, 5)}
                  </h2>
                  <p className="text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    {getDuration(selectedAppointment.start_time, selectedAppointment.end_time)} de duración
                  </p>
                </div>

                {/* Review Section */}
                {selectedAppointment.status === 'completed' && !selectedAppointment.has_review && (
                  <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-amber-200/60 shadow-md shadow-amber-100/50 overflow-hidden">
                    <CardContent className="p-6 relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-100/40 to-transparent rounded-bl-full" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 relative">
                        ¿Cómo fue tu experiencia en {selectedAppointment.business?.name}?
                      </h3>
                      <p className="text-sm text-gray-600 mb-4 relative">Danos tu opinión</p>
                      <div className="flex gap-3 relative">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setShowReviewModal(true)}
                            className="w-14 h-14 hover:scale-110 active:scale-95 transition-all duration-200 group"
                          >
                            <Star className="w-full h-full text-amber-400 fill-amber-100 group-hover:fill-amber-400 transition-colors duration-200" />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {canModify(selectedAppointment) && (
                    <Button asChild variant="outline" className="flex-1 border-gray-300 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all duration-200">
                      <Link href={`/dashboard/client/appointments/${selectedAppointment.id}`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Gestionar cita
                      </Link>
                    </Button>
                  )}
                  {selectedAppointment.status === 'completed' && (
                    <Button asChild className="flex-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-700 hover:via-teal-700 hover:to-emerald-700 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg transition-all duration-200">
                      <Link href={`/business/${selectedAppointment.business?.id}/book`}>
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Volver a reservar
                      </Link>
                    </Button>
                  )}
                </div>

                {/* Business Info */}
                <Card className="border-gray-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                      Información del establecimiento
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Dirección</p>
                          <p className="text-sm text-gray-900 font-medium">{selectedAppointment.business?.address || 'No disponible'}</p>
                        </div>
                      </div>
                      {selectedAppointment.business?.phone && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Teléfono</p>
                            <a href={`tel:${selectedAppointment.business.phone}`} className="text-sm text-emerald-600 font-medium hover:text-emerald-700 hover:underline transition-colors">
                              {selectedAppointment.business.phone}
                            </a>
                          </div>
                        </div>
                      )}
                      {selectedAppointment.employee && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Profesional</p>
                            <p className="text-sm text-gray-900 font-medium">
                              {selectedAppointment.employee.first_name} {selectedAppointment.employee.last_name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="border-gray-200/80 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full" />
                      Resumen
                    </h3>
                    <div className="space-y-3">
                      {selectedAppointment.appointment_services.map((service, index) => (
                        <div key={index} className="flex justify-between items-start p-3 bg-gray-50/50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{service.service?.name || 'Servicio'}</p>
                            <p className="text-sm text-gray-500">
                              {getDuration(selectedAppointment.start_time, selectedAppointment.end_time)} con{' '}
                              {selectedAppointment.employee?.first_name || 'Profesional'}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900">{formatPrice(service.price)}</p>
                        </div>
                      ))}

                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl">
                          <p className="text-lg font-bold text-gray-900">Total</p>
                          <p className="text-xl font-bold text-emerald-600">{formatPrice(selectedAppointment.total_price)}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <CalendarIcon className="w-12 h-12 text-emerald-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una cita</h3>
                <p className="text-gray-500 text-sm">Elige una cita de la lista para ver todos los detalles y opciones disponibles</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedAppointment && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={handleCloseReviewModal}
          appointmentId={selectedAppointment.id}
          businessId={selectedAppointment.business?.id || ''}
          businessName={selectedAppointment.business?.name || 'Negocio'}
          clientId={authState.user?.id || ''}
          onReviewSubmitted={() => handleReviewSubmitted(selectedAppointment.id)}
        />
      )}
    </>
  )
}
