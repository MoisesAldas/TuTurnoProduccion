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
  Store, Receipt, CreditCard, Hash, PlusSquare
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
    const baseClass = "transition-all duration-300 pointer-events-none border-0 font-black uppercase text-[10px] tracking-tight hover:opacity-100"
    switch (status) {
      case 'pending': return { label: 'Pendiente', color: `${baseClass} bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-50`, icon: AlertTriangle }
      case 'confirmed': return { label: 'Confirmada', color: `${baseClass} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-50`, icon: CheckCircle }
      case 'in_progress': return { label: 'En progreso', color: `${baseClass} bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-50`, icon: Clock }
      case 'completed': return { label: 'Completada', color: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100`, icon: CheckCircle }
      case 'cancelled': return { label: 'Cancelada', color: `${baseClass} bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-50`, icon: XCircle }
      case 'no_show': return { label: 'No asistió', color: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100`, icon: XCircle }
      default: return { label: status, color: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100`, icon: AlertTriangle }
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Premium Integrated Header */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 flex-shrink-0 sticky top-0 z-30 shadow-sm md:h-20 flex items-center">
        <div className="w-full px-6 py-4 md:py-0">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black text-slate-400 border-slate-200 px-2.5 py-0.5">
                    Panel Cliente
                  </Badge>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Gestión de Citas</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 flex items-center justify-center md:justify-start gap-3">
                  Mis Citas
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                    <CalendarIcon className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                  </div>
                </h1>
              </div>
            </div>

            <div className="flex items-center justify-center w-full md:w-auto gap-3">
              <Button asChild className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 shadow-xl hover:shadow-slate-900/20 transition-all duration-300 text-white font-black h-10 px-8 rounded-2xl text-xs tracking-tight">
                <Link href="/marketplace">
                  <PlusSquare className="w-4 h-4 mr-2" />
                  NUEVA RESERVA
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-50">
        {/* Left Panel - Appointments List */}
        <div className="w-full lg:w-96 border-r bg-white flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="p-4 border-b space-y-4 flex-shrink-0 bg-slate-50/30">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 transition-all group-focus-within:text-slate-900 group-focus-within:scale-110" />
              <Input
                type="text"
                placeholder="Buscar por negocio, servicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 bg-white border-slate-200 rounded-2xl focus:border-slate-900 focus:ring-slate-900/5 transition-all duration-300 shadow-sm font-medium"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style dangerouslySetInnerHTML={{ __html: '.scrollbar-hide::-webkit-scrollbar { display: none; }' }} />
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className={`flex-shrink-0 rounded-xl px-4 h-8 font-black uppercase text-[9px] tracking-wider transition-all duration-300 ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                Todas
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('upcoming')}
                className={`flex-shrink-0 rounded-xl px-4 h-8 font-black uppercase text-[9px] tracking-wider transition-all duration-300 ${
                  filter === 'upcoming'
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                Próximas
              </Button>
              <Button
                variant={filter === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('past')}
                className={`flex-shrink-0 rounded-xl px-4 h-8 font-black uppercase text-[9px] tracking-wider transition-all duration-300 ${
                  filter === 'past'
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                }`}
              >
                Pasadas
              </Button>
              <Button
                variant={filter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('cancelled')}
                className={`flex-shrink-0 rounded-xl px-4 h-8 font-black uppercase text-[9px] tracking-wider transition-all duration-300 ${
                  filter === 'cancelled'
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
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
                    className={`w-full p-4 text-left transition-all duration-500 relative group overflow-hidden border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                      selectedAppointment?.id === appointment.id
                        ? 'bg-slate-50 dark:bg-slate-800/40'
                        : 'bg-white dark:bg-gray-900 hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                    }`}
                  >
                    {/* Selected Indicator */}
                    {selectedAppointment?.id === appointment.id && (
                      <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-slate-900 rounded-r-full shadow-[2px_0_10px_rgba(15,23,42,0.1)] transition-all duration-500"></div>
                    )}
                    
                    <div className="flex gap-4">
                      {/* Business Photo */}
                      <div className="w-16 h-16 rounded-[1.25rem] overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200/50 dark:border-slate-700/50 shadow-sm group-hover:shadow-md transition-all duration-500 group-hover:scale-[1.03]">
                        {appointment.business?.cover_photo_url ? (
                          <img
                            src={appointment.business.cover_photo_url}
                            alt={appointment.business.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                            <Store className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-black tracking-tight truncate transition-all duration-300 ${
                            selectedAppointment?.id === appointment.id ? 'text-slate-900 dark:text-white text-base' : 'text-gray-900 dark:text-gray-100 text-[15px]'
                          }`}>
                            {appointment.business?.name || 'Negocio'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 text-slate-400" />
                            {formatDateShort(appointment.appointment_date)}
                          </div>
                          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {appointment.start_time.slice(0, 5)}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-[15px] font-black text-slate-900 dark:text-white tracking-tighter">
                            {formatPrice(appointment.total_price)}
                          </p>
                          <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-[9px] font-black uppercase px-2 py-0 border-0 group-hover:bg-white dark:group-hover:bg-slate-800 transition-colors">
                            {appointment.appointment_services.length} Serv.
                          </Badge>
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
              {/* Premium Hero Header */}
              <div className="relative h-72 flex-shrink-0 overflow-hidden shadow-2xl">
                {/* Background Image */}
                {selectedAppointment.business?.cover_photo_url ? (
                  <img
                    src={selectedAppointment.business.cover_photo_url}
                    alt={selectedAppointment.business.name}
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                )}
                
                {/* Premium Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                
                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <div className="flex items-end justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-sm">
                            <Store className="w-4 h-4 text-white" />
                         </div>
                         <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.2em] drop-shadow-sm">Detalle de Reserva</p>
                      </div>
                      <h1 className="text-4xl font-black text-white mb-3 tracking-tighter drop-shadow-2xl">
                        {selectedAppointment.business?.name || 'Negocio'}
                      </h1>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-white/70 font-bold tracking-wide">
                          REF ID: <span className="text-white font-black">{selectedAppointment.id.slice(0, 8).toUpperCase()}</span>
                        </p>
                        <span className="w-1 h-1 rounded-full bg-white/30"></span>
                        <p className="text-xs text-white/70 font-bold">Reserva realizada el {new Date(selectedAppointment.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${getStatusInfo(selectedAppointment.status).color} text-[11px] px-5 py-2.5 font-black uppercase tracking-widest border-0 shadow-2xl backdrop-blur-md bg-white/10 dark:bg-black/20 rounded-2xl ring-1 ring-white/20`}>
                      {React.createElement(getStatusInfo(selectedAppointment.status).icon, { className: 'w-4 h-4 mr-2' })}
                      {getStatusInfo(selectedAppointment.status).label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-slate-50/50">
                {/* Metrics Grid - 5 Columns */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                  <Card className="border-0 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_45px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-[2rem] overflow-hidden group bg-white">
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg shadow-slate-900/20">
                        <CalendarIcon className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Fecha</p>
                      <p className="text-[15px] font-black text-slate-900 leading-tight capitalize">
                        {formatDateShort(selectedAppointment.appointment_date)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_45px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-[2rem] overflow-hidden group bg-white">
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-3 shadow-lg shadow-slate-900/20">
                        <Clock className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hora</p>
                      <p className="text-[15px] font-black text-slate-900">
                        {selectedAppointment.start_time.slice(0, 5)}
                      </p>
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full mt-3">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">
                          {getDuration(selectedAppointment.start_time, selectedAppointment.end_time)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_45px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-[2rem] overflow-hidden group bg-white">
                    <CardContent className="p-6 text-center">
                      <Avatar className="w-14 h-14 mx-auto mb-4 border-2 border-slate-100 ring-4 ring-slate-50 transition-all duration-500 group-hover:scale-110 shadow-md">
                        <AvatarImage src={selectedAppointment.employee?.avatar_url} alt={selectedAppointment.employee?.first_name} />
                        <AvatarFallback className="bg-slate-900 text-white font-black text-lg">
                          {selectedAppointment.employee?.first_name?.[0]}{selectedAppointment.employee?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Profesional</p>
                      <p className="text-[15px] font-black text-slate-900 leading-tight line-clamp-1">
                        {selectedAppointment.employee?.first_name}
                      </p>
                      {selectedAppointment.employee?.position && (
                        <p className="text-[10px] text-slate-500 font-bold mt-1.5 line-clamp-1 uppercase tracking-tighter">{selectedAppointment.employee.position}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card 
                    className="border-0 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_45px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-[2rem] overflow-hidden group cursor-pointer bg-white"
                    onClick={() => setShowMapModal(true)}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-lg shadow-slate-900/20">
                        <MapPin className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ubicación</p>
                      <p className="text-[15px] font-black text-slate-900 group-hover:underline underline-offset-4">
                        Ver Mapa
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_15px_45px_-8px_rgba(0,0,0,0.08)] transition-all duration-500 rounded-[2rem] overflow-hidden group bg-white">
                    <CardContent className="p-6 text-center">
                      <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6 shadow-lg shadow-slate-900/20">
                        <Receipt className="w-7 h-7 text-white" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Servicios</p>
                      <p className="text-[15px] font-black text-slate-900 leading-tight">
                        {selectedAppointment.appointment_services.length} Total
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons - Premium Dynamic Layout */}
                {(() => {
                  const buttons = []
                  
                  // Gestionar Cita - Slate 900
                  if (canModify(selectedAppointment)) {
                    buttons.push(
                      <Button
                        key="manage"
                        asChild
                        className="bg-slate-900 hover:bg-slate-800 text-white h-14 text-base font-black shadow-xl hover:shadow-slate-900/20 transition-all duration-300 rounded-2xl"
                      >
                        <Link href={`/dashboard/client/appointments/${selectedAppointment.id}`}>
                          <Edit className="w-5 h-5 mr-3" />
                          Gestionar cita
                        </Link>
                      </Button>
                    )
                  }
                  
                  // Llamar al Negocio - Blue 600
                  if (selectedAppointment.business?.phone) {
                    buttons.push(
                      <Button
                        key="call"
                        asChild
                        className="bg-blue-600 hover:bg-blue-700 text-white h-14 text-base font-black shadow-xl hover:shadow-blue-600/20 transition-all duration-300 rounded-2xl"
                      >
                        <a href={`tel:${selectedAppointment.business.phone}`}>
                          <Phone className="w-5 h-5 mr-3" />
                          Llamar ahora
                        </a>
                      </Button>
                    )
                  }
                  
                  // Dejar Reseña - Amber 600
                  if (selectedAppointment.status === 'completed' && !selectedAppointment.has_review) {
                    buttons.push(
                      <Button
                        key="review"
                        onClick={() => setShowReviewModal(true)}
                        className="bg-amber-600 hover:bg-amber-700 text-white h-14 text-base font-black shadow-xl hover:shadow-amber-600/20 transition-all duration-300 rounded-2xl"
                      >
                        <Star className="w-5 h-5 mr-3" />
                        Calificar servicio
                      </Button>
                    )
                  }
                  
                  const count = buttons.length
                  const gridClass = count === 1 ? 'grid grid-cols-1' : count === 2 ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-3 gap-4'
                  
                  return <div className={gridClass}>{buttons}</div>
                })()}

                {/* Services Summary - Premium Card */}
                <Card className="border-0 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.04)] rounded-[2rem] overflow-hidden bg-white">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-slate-900" />
                        </div>
                        Detalle de Servicios
                      </h3>
                      <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 font-black px-3 py-1 rounded-lg uppercase tracking-tighter text-[10px]">
                        {selectedAppointment.appointment_services.length} items
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      {selectedAppointment.appointment_services.map((service, index) => (
                        <div key={index} className="flex justify-between items-center py-4 border-b border-slate-50 last:border-0 group">
                          <div className="flex-1">
                            <p className="font-black text-slate-900 group-hover:text-slate-600 transition-colors">
                              {service.service?.name || 'Servicio'}
                            </p>
                            {service.service?.description && (
                              <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Servicio Profesional</p>
                            )}
                          </div>
                          <p className="text-lg font-black text-slate-900 tabular-nums tracking-tighter">
                            {formatPrice(service.price)}
                          </p>
                        </div>
                      ))}
                      
                      <div className="mt-8 pt-2">
                        <div className="flex justify-between items-center bg-slate-900 p-6 rounded-[1.5rem] shadow-2xl shadow-slate-900/30 group hover:scale-[1.01] transition-transform duration-500">
                          <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total a Pagar</p>
                            <p className="text-2xl font-black text-white tracking-tighter">Monto Final</p>
                          </div>
                          <div className="text-right">
                             <p className="text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
                                {formatPrice(selectedAppointment.total_price)}
                             </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Client Notes Section - Premium Alert */}
                {selectedAppointment.client_notes && (
                  <Card className="border-0 bg-blue-50/40 dark:bg-blue-900/10 shadow-sm rounded-[1.5rem] overflow-hidden ring-1 ring-blue-100 dark:ring-blue-900/30">
                    <CardContent className="p-6">
                      <h3 className="text-xs font-black text-blue-900 dark:text-blue-400 mb-3 flex items-center gap-2 uppercase tracking-[0.15em]">
                        <AlertTriangle className="w-4 h-4" />
                        Notas de la Reserva
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic pr-4 border-l-2 border-blue-200 pl-4 ml-1">
                        "{selectedAppointment.client_notes}"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 bg-slate-50/30">
              <div className="text-center max-w-sm">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200/50">
                  <CalendarIcon className="w-12 h-12 text-slate-200" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">Gestiona tusReservas</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Selecciona una cita de la lista lateral para ver el detalle completo, contactar al negocio o calificar tu experiencia.
                </p>
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
    </div>
  )
}
