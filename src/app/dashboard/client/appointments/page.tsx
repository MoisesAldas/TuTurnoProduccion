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
  XCircle, MoreVertical, Search, AlertTriangle
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

  const fetchAppointments = async () => {
    if (!authState.user) return
    try {
      setLoading(true)
      // Fetch appointments with reviews in a single query (optimized - no N+1 problem)
      const { data, error } = await supabase
        .from('appointments')
        .select(
          `
          *,
          business:businesses(id, name, address, phone),
          employee:employees(id, first_name, last_name, position, avatar_url),
          appointment_services(
            service:services(id, name, description),
            price
          ),
          reviews(id)
        `
        )
        .eq('client_id', authState.user.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }
      const appointmentData = data || []
      // Map appointments with review status (no async needed)
      const appointmentsWithReviewStatus = appointmentData.map((appointment) => ({
        ...appointment,
        has_review: !!appointment.reviews && appointment.reviews.length > 0
      }))
      setAppointments(appointmentsWithReviewStatus as any)
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

  const handleReviewSubmitted = () => {
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
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filters Skeleton */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <Skeleton className="h-10 w-full max-w-md" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>

        {/* Appointments List Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-grow space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Filters and Search */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar por negocio, servicio o profesional..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${patterns.input.DEFAULT} pl-10`}
              />
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')} className={`flex-shrink-0 ${filter === 'all' ? 'bg-emerald-600' : ''}`}>Todas</Button>
              <Button variant={filter === 'upcoming' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('upcoming')} className={`flex-shrink-0 ${filter === 'upcoming' ? 'bg-emerald-600' : ''}`}>Próximas</Button>
              <Button variant={filter === 'past' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('past')} className={`flex-shrink-0 ${filter === 'past' ? 'bg-emerald-600' : ''}`}>Pasadas</Button>
              <Button variant={filter === 'cancelled' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('cancelled')} className={`flex-shrink-0 ${filter === 'cancelled' ? 'bg-emerald-600' : ''}`}>Canceladas</Button>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="text-center py-16">
              {searchQuery ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No encontramos "{searchQuery}"</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Intenta buscando por el nombre del negocio, servicio o profesional.</p>
                  <Button variant="outline" onClick={() => setSearchQuery('')}>Limpiar búsqueda</Button>
                </>
              ) : filter === 'upcoming' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Tu agenda está libre</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Es un buen momento para reservar un servicio que te guste.</p>
                  <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-500"><Link href="/marketplace"><CalendarIcon className="w-4 h-4 mr-2" />Reservar una Cita</Link></Button>
                </>
              ) : filter === 'past' ? (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aún no tienes citas completadas</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Tu historial de citas aparecerá aquí después de tu primer servicio.</p>
                </>
              ) : filter === 'cancelled' ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No has cancelado ninguna cita</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Excelente compromiso con tus reservas.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes citas registradas</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">Empieza a reservar tus servicios favoritos.</p>
                  <Button asChild className="bg-gradient-to-r from-emerald-600 to-teal-500"><Link href="/marketplace">Explorar Servicios</Link></Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const statusInfo = getStatusInfo(appointment.status)
              const StatusIcon = statusInfo.icon
              return (
                <Card
                  key={appointment.id}
                  className={`hover:shadow-xl transition-all duration-300 bg-white border-l-4 ${
                    appointment.status === 'confirmed' ? 'border-l-emerald-500' :
                    appointment.status === 'pending' ? 'border-l-yellow-500' :
                    appointment.status === 'completed' ? 'border-l-blue-500' :
                    appointment.status === 'cancelled' ? 'border-l-red-500' :
                    'border-l-gray-300'
                  } hover:scale-[1.01]`}
                >
                  <CardContent className="p-4 sm:p-6">
                    {/* Mobile: Price & Badge at top */}
                    <div className="flex sm:hidden items-center justify-between mb-3 pb-3 border-b border-gray-100">
                      <Badge className={statusInfo.color}><StatusIcon className="w-3 h-3 mr-1.5" />{statusInfo.label}</Badge>
                      <span className="text-xl font-bold text-emerald-600">{formatPrice(appointment.total_price)}</span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Main Info */}
                      <div className="flex-grow space-y-3">
                        {/* Desktop: Name & Badge inline */}
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-semibold text-lg sm:text-xl text-gray-900">{appointment.business?.name || 'Negocio'}</h3>
                          <Badge className={`hidden sm:inline-flex ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3 mr-1.5" />{statusInfo.label}
                          </Badge>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-x-6 sm:gap-y-3">
                          <div className="flex items-center text-sm text-gray-600 bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-md">
                            <User className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{appointment.appointment_services.map(s => s.service?.name).join(', ')}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-md">
                            <CalendarIcon className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                            <span className="truncate">{formatDate(appointment.appointment_date)}</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600 bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-md">
                            <Clock className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                            <span>{appointment.start_time.slice(0,5)} - {appointment.end_time.slice(0,5)}</span>
                          </div>
                          {appointment.business?.address && (
                            <div className="flex items-center text-sm text-gray-600 bg-gray-50 sm:bg-transparent p-2 sm:p-0 rounded-md">
                              <MapPin className="w-4 h-4 mr-2 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">{appointment.business.address}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Desktop: Price and Actions */}
                      <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0 min-w-[140px]">
                        <span className="text-2xl font-bold text-emerald-600">{formatPrice(appointment.total_price)}</span>
                        <div className="flex flex-col gap-2 w-full">
                          {canModify(appointment) && (
                              <Button asChild variant="outline" size="sm" className="w-full hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                                  <Link href={`/dashboard/client/appointments/${appointment.id}`}><Edit className="w-4 h-4 mr-2" />Gestionar</Link>
                              </Button>
                          )}
                          {appointment.status === 'completed' && !appointment.has_review && (
                              <Button variant="outline" size="sm" onClick={() => { setSelectedAppointment(appointment); setShowReviewModal(true); }} className="w-full border-amber-300 text-amber-700 hover:bg-amber-50">
                                  <Star className="w-4 h-4 mr-2" />Reseña
                              </Button>
                          )}
                          {appointment.status === 'completed' && appointment.has_review && (
                              <Button variant="outline" size="sm" disabled className="w-full">
                                  <CheckCircle className="w-4 h-4 mr-2" />Reseñado
                              </Button>
                          )}
                        </div>
                      </div>

                      {/* Mobile: Actions at bottom */}
                      <div className="flex sm:hidden gap-2 pt-3 border-t border-gray-100">
                        {canModify(appointment) && (
                            <Button asChild variant="outline" size="sm" className="flex-1 hover:bg-emerald-50 hover:border-emerald-300 transition-colors">
                                <Link href={`/dashboard/client/appointments/${appointment.id}`}><Edit className="w-4 h-4 mr-2" />Gestionar</Link>
                            </Button>
                        )}
                        {appointment.status === 'completed' && !appointment.has_review && (
                            <Button variant="outline" size="sm" onClick={() => { setSelectedAppointment(appointment); setShowReviewModal(true); }} className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                                <Star className="w-4 h-4 mr-2" />Reseña
                            </Button>
                        )}
                        {appointment.status === 'completed' && appointment.has_review && (
                            <Button variant="outline" size="sm" disabled className="flex-1">
                                <CheckCircle className="w-4 h-4 mr-2" />Reseñado
                            </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {selectedAppointment && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={handleCloseReviewModal}
          appointmentId={selectedAppointment.id}
          businessId={selectedAppointment.business?.id || ''}
          businessName={selectedAppointment.business?.name || 'Negocio'}
          clientId={authState.user?.id || ''}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </>
  )
}
