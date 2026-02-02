'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
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
import ClientAppointmentDetailsModal from '@/components/ClientAppointmentDetailsModal'
import LocationMapModal from '@/components/LocationMapModal'
// Modular cancellation components
import { handleClientCancellation } from '@/lib/appointments/clientCancellationAdapter'
import { CancelAppointmentDialog } from '@/components/CancelAppointmentDialog'

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
    latitude?: number
    longitude?: number
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
  const [showMobileDetailsModal, setShowMobileDetailsModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
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

      // Direct query instead of RPC to get latitude/longitude
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          business:businesses(
            id,
            name,
            address,
            phone,
            cover_image_url,
            latitude,
            longitude
          ),
          employee:employees(id, first_name, last_name, position, avatar_url),
          appointment_services(
            service:services(id, name, description),
            price
          )
        `)
        .eq('client_id', authState.user.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      // Debug: Log raw data to see structure
      console.log('📊 Raw Supabase Data:', data?.[0])

      // Check for reviews
      const appointmentIds = (data || []).map((apt: any) => apt.id)
      const { data: reviews } = await supabase
        .from('reviews')
        .select('appointment_id')
        .in('appointment_id', appointmentIds)

      const reviewedAppointmentIds = new Set(reviews?.map((r: any) => r.appointment_id) || [])

      // Transform data to match component interface
      const transformedData = (data || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        total_price: apt.total_price,
        status: apt.status,
        client_notes: apt.client_notes,
        created_at: apt.created_at,
        has_review: reviewedAppointmentIds.has(apt.id),
        business: apt.business ? {
          id: apt.business.id,
          name: apt.business.name,
          address: apt.business.address,
          phone: apt.business.phone,
          cover_photo_url: apt.business.cover_image_url,
          latitude: apt.business.latitude,
          longitude: apt.business.longitude
        } : null,
        employee: apt.employee,
        appointment_services: apt.appointment_services || []
      }))

      setAppointments(transformedData)
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async (reason: string) => {
    if (!selectedAppointment || !authState.user) return

    await handleClientCancellation({
      appointmentId: selectedAppointment.id,
      clientId: authState.user.id,
      cancelReason: reason,
      onSuccess: () => {
        fetchAppointments()
        setShowCancelDialog(false)
        setSelectedAppointment(null)
        toast({
          title: 'Cita cancelada',
          description: 'Tu cita ha sido cancelada exitosamente.',
        })
      },
      onError: (error) => {
        toast({
          variant: 'destructive',
          title: 'Error al cancelar',
          description: error.message || 'No pudimos cancelar tu cita. Por favor intenta nuevamente.',
        })
      }
    })
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando tus citas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preparando tu historial de reservas...</p>
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-slate-700" />
              <Input
                type="text"
                placeholder="Buscar negocios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white focus:border-slate-700 focus:ring-2 focus:ring-slate-700/20 transition-all duration-200"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={`flex-shrink-0 rounded-full transition-all duration-200 ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-500/25 hover:shadow-lg hover:bg-slate-800'
                    : 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
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
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-500/25 hover:shadow-lg hover:bg-slate-800'
                    : 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
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
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-500/25 hover:shadow-lg hover:bg-slate-800'
                    : 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
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
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-500/25 hover:shadow-lg hover:bg-slate-800'
                    : 'hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'
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
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CalendarIcon className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-1">No hay citas</h3>
                <p className="text-sm text-gray-500 mb-4">Explora negocios y reserva tu primera cita</p>
                <Button asChild size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
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
                    onClick={() => {
                      setSelectedAppointment(appointment)
                      // On mobile, open modal instead of showing in right panel
                      if (window.innerWidth < 1024) {
                        setShowMobileDetailsModal(true)
                      }
                    }}
                    className={`w-full p-4 text-left transition-all duration-200 ${
                      selectedAppointment?.id === appointment.id
                        ? 'bg-slate-100 border-l-4 border-l-slate-900 shadow-sm'
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
                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Store className="w-6 h-6 text-slate-400" />
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
                          <p className="text-sm font-semibold text-slate-900">
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
        <div className="hidden lg:flex flex-1 flex-col overflow-hidden bg-gray-50">
          {selectedAppointment ? (
            <div className="flex flex-col h-full">
              {/* Hero Header with Cover Image */}
              <div className="relative h-80 flex-shrink-0 overflow-hidden">
                {/* Background Image */}
                {selectedAppointment.business?.cover_photo_url ? (
                  <img
                    src={selectedAppointment.business.cover_photo_url}
                    alt={selectedAppointment.business.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
                
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="flex items-end justify-between">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                        {selectedAppointment.business?.name || 'Negocio'}
                      </h1>
                      <p className="text-sm text-white/90 drop-shadow">
                        ID: #{selectedAppointment.id.slice(0, 8)}
                      </p>
                    </div>
                    <Badge className={`${getStatusInfo(selectedAppointment.status).color} text-sm px-3 py-1.5 font-medium rounded-full shadow-lg`}>
                      {React.createElement(getStatusInfo(selectedAppointment.status).icon, { className: 'w-4 h-4 mr-1.5 inline' })}
                      {getStatusInfo(selectedAppointment.status).label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Key Information - 5 Column Grid */}
                <div className="grid grid-cols-5 gap-3">
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 text-center">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <CalendarIcon className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Fecha</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight capitalize">
                        {formatDateShort(selectedAppointment.appointment_date)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 text-center">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Hora</p>
                      <p className="text-sm font-bold text-gray-900">
                        {selectedAppointment.start_time.slice(0, 5)}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {getDuration(selectedAppointment.start_time, selectedAppointment.end_time)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 text-center">
                      <Avatar className="w-12 h-12 mx-auto mb-3 border-2 border-slate-200">
                        <AvatarImage src={selectedAppointment.employee?.avatar_url} alt={selectedAppointment.employee?.first_name} />
                        <AvatarFallback className="bg-slate-900 text-white">
                          <User className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Profesional</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {selectedAppointment.employee?.first_name} {selectedAppointment.employee?.last_name}
                      </p>
                      {selectedAppointment.employee?.position && (
                        <p className="text-xs text-slate-600 mt-1">{selectedAppointment.employee.position}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setShowMapModal(true)}
                  >
                    <CardContent className="p-5 text-center">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Ubicación</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        Ver mapa
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 text-center">
                      <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <Receipt className="w-6 h-6 text-white" />
                      </div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Servicios</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight">
                        {selectedAppointment.appointment_services.length} servicio{selectedAppointment.appointment_services.length > 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons - Dynamic Layout */}
                {(() => {
                  const buttons = []
                  
                  // Gestionar Cita - Slate
                  if (canModify(selectedAppointment)) {
                    buttons.push(
                      <Button
                        key="manage"
                        asChild
                        className="bg-slate-900 hover:bg-slate-800 text-white h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <Link href={`/dashboard/client/appointments/${selectedAppointment.id}`}>
                          <Edit className="w-5 h-5 mr-2" />
                          Gestionar cita
                        </Link>
                      </Button>
                    )
                  }
                  
                  // Llamar al Negocio - Blue
                  if (selectedAppointment.business?.phone) {
                    buttons.push(
                      <Button
                        key="call"
                        asChild
                        className="bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <a href={`tel:${selectedAppointment.business.phone}`}>
                          <Phone className="w-5 h-5 mr-2" />
                          Llamar
                        </a>
                      </Button>
                    )
                  }
                  
                  // Dejar Reseña - Amber
                  if (selectedAppointment.status === 'completed' && !selectedAppointment.has_review) {
                    buttons.push(
                      <Button
                        key="review"
                        onClick={() => setShowReviewModal(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <Star className="w-5 h-5 mr-2" />
                        Calificar
                      </Button>
                    )
                  }
                  
                  // Determine grid class based on button count
                  const gridClass = buttons.length === 1 
                    ? 'grid grid-cols-1 gap-3' 
                    : buttons.length === 2 
                    ? 'grid grid-cols-2 gap-3' 
                    : 'grid grid-cols-3 gap-3'
                  
                  return <div className={gridClass}>{buttons}</div>
                })()}

                {/* Services Summary - Full Width */}
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-slate-700" />
                      Resumen de Servicios
                    </h3>
                    <div className="space-y-3">
                      {selectedAppointment.appointment_services.map((service, index) => (
                        <div key={index} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {service.service?.name || 'Servicio'}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-slate-900">
                            {formatPrice(service.price)}
                          </p>
                        </div>
                      ))}
                      <div className="pt-3 mt-2 border-t-2 border-slate-200">
                        <div className="flex justify-between items-center bg-slate-900 px-4 py-3 rounded-lg">
                          <p className="text-lg font-bold text-white">Total</p>
                          <p className="text-2xl font-bold text-white">
                            {formatPrice(selectedAppointment.total_price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Notes Section */}
                {selectedAppointment.client_notes && (
                  <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
                    <CardContent className="p-5">
                      <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-blue-600" />
                        Notas de la Cita
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedAppointment.client_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-sm">
                <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-12 h-12 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona una cita</h3>
                <p className="text-gray-500">Elige una cita de la lista para ver los detalles</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Details Modal */}
      <ClientAppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={showMobileDetailsModal}
        onClose={() => setShowMobileDetailsModal(false)}
        onReview={() => {
          setShowMobileDetailsModal(false)
          setShowReviewModal(true)
        }}
      />

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

      {/* Location Map Modal */}
      {selectedAppointment && selectedAppointment.business && (() => {
        console.log('🗺️ Map Modal Data:', {
          businessName: selectedAppointment.business.name,
          address: selectedAppointment.business.address,
          latitude: selectedAppointment.business.latitude,
          longitude: selectedAppointment.business.longitude
        })
        return (
          <LocationMapModal
            isOpen={showMapModal}
            onClose={() => setShowMapModal(false)}
            businessName={selectedAppointment.business.name}
            address={selectedAppointment.business.address || ''}
            latitude={selectedAppointment.business.latitude || 0}
            longitude={selectedAppointment.business.longitude || 0}
          />
        )
      })()}

      {/* Cancel Appointment Dialog - Modular Component */}
      <CancelAppointmentDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelAppointment}
        appointmentDetails={selectedAppointment ? {
          businessName: selectedAppointment.business?.name,
          date: formatDate(selectedAppointment.appointment_date),
          time: selectedAppointment.start_time.slice(0, 5)
        } : undefined}
      />
    </>
  )
}
