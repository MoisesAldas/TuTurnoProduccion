'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, Phone,
  User, Star, Edit, Trash2, MessageCircle, AlertTriangle,
  CheckCircle, XCircle, MoreVertical, Filter, Search
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  duration: number
  total_price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  client_notes?: string
  business: {
    id: string
    name: string
    address?: string
    phone?: string
  }
  service: {
    id: string
    name: string
    description?: string
  }
  employee: {
    id: string
    first_name: string
    last_name: string
    position?: string
  }
  created_at: string
}

export default function ClientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [newDate, setNewDate] = useState<Date | undefined>(undefined)
  const [newTime, setNewTime] = useState('')

  const { authState } = useAuth()
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

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          business:businesses(id, name, address, phone),
          service:services(id, name, description),
          employee:employees(id, first_name, last_name, position)
        `)
        .eq('client_id', authState.user.id)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      setAppointments(data || [])

    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          client_notes: `${selectedAppointment.client_notes || ''}\nMotivo de cancelación: ${cancelReason}`.trim()
        })
        .eq('id', selectedAppointment.id)

      if (error) {
        console.error('Error canceling appointment:', error)
        alert('Error al cancelar la cita')
        return
      }

      await fetchAppointments()
      setShowCancelDialog(false)
      setSelectedAppointment(null)
      setCancelReason('')

    } catch (error) {
      console.error('Error canceling appointment:', error)
      alert('Error al cancelar la cita')
    }
  }

  const handleRescheduleAppointment = async () => {
    if (!selectedAppointment || !newDate || !newTime) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: newDate.toISOString().split('T')[0],
          appointment_time: newTime,
          status: 'pending' // Reset to pending for business confirmation
        })
        .eq('id', selectedAppointment.id)

      if (error) {
        console.error('Error rescheduling appointment:', error)
        alert('Error al reagendar la cita')
        return
      }

      await fetchAppointments()
      setShowRescheduleDialog(false)
      setSelectedAppointment(null)
      setNewDate(undefined)
      setNewTime('')

    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      alert('Error al reagendar la cita')
    }
  }

  const handleSubmitReview = async () => {
    if (!selectedAppointment) return

    try {
      // In a real implementation, this would go to a reviews table
      ('Review submitted:', {
        appointmentId: selectedAppointment.id,
        businessId: selectedAppointment.business.id,
        rating: reviewRating,
        comment: reviewComment
      })

      // For now, just close the dialog
      setShowReviewDialog(false)
      setSelectedAppointment(null)
      setReviewRating(5)
      setReviewComment('')

      alert('¡Gracias por tu reseña!')

    } catch (error) {
      console.error('Error submitting review:', error)
      alert('Error al enviar la reseña')
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
      case 'confirmed':
        return { label: 'Confirmada', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'in_progress':
        return { label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock }
      case 'completed':
        return { label: 'Completada', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'cancelled':
        return { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle }
      case 'no_show':
        return { label: 'No asistió', color: 'bg-gray-100 text-gray-800', icon: XCircle }
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const isUpcoming = (appointment: Appointment) => {
    const now = new Date()
    const aptDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    return aptDate > now && ['pending', 'confirmed'].includes(appointment.status)
  }

  const isPast = (appointment: Appointment) => {
    const now = new Date()
    const aptDate = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`)
    return aptDate <= now || ['completed', 'cancelled', 'no_show'].includes(appointment.status)
  }

  const canModify = (appointment: Appointment) => {
    return isUpcoming(appointment) && appointment.status !== 'cancelled'
  }

  const filteredAppointments = appointments.filter(appointment => {
    const matchesSearch =
      appointment.business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${appointment.employee.first_name} ${appointment.employee.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())

    switch (filter) {
      case 'upcoming':
        return isUpcoming(appointment) && matchesSearch
      case 'past':
        return isPast(appointment) && !['cancelled'].includes(appointment.status) && matchesSearch
      case 'cancelled':
        return appointment.status === 'cancelled' && matchesSearch
      default:
        return matchesSearch
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus citas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard/client">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Gestión de Citas</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar por negocio, servicio o profesional..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Todas ({appointments.length})
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('upcoming')}
              >
                Próximas ({appointments.filter(isUpcoming).length})
              </Button>
              <Button
                variant={filter === 'past' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('past')}
              >
                Pasadas ({appointments.filter(apt => isPast(apt) && apt.status !== 'cancelled').length})
              </Button>
              <Button
                variant={filter === 'cancelled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('cancelled')}
              >
                Canceladas ({appointments.filter(apt => apt.status === 'cancelled').length})
              </Button>
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No se encontraron citas' : 'No tienes citas en esta categoría'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery ? 'Intenta con una búsqueda diferente' : 'Reserva tu próxima cita para cuidarte'}
              </p>
              <Link href="/marketplace">
                <Button>Explorar Servicios</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => {
              const statusInfo = getStatusInfo(appointment.status)
              const StatusIcon = statusInfo.icon

              return (
                <Card key={appointment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="font-semibold text-xl text-gray-900">
                            {appointment.business.name}
                          </h3>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center text-gray-600">
                              <User className="w-4 h-4 mr-3 text-green-600" />
                              <div>
                                <p className="font-medium">{appointment.service.name}</p>
                                <p className="text-sm">
                                  con {appointment.employee.first_name} {appointment.employee.last_name}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center text-gray-600">
                              <CalendarIcon className="w-4 h-4 mr-3 text-green-600" />
                              <div>
                                <p className="font-medium">{formatDate(appointment.appointment_date)}</p>
                                <p className="text-sm">{appointment.appointment_time} • {appointment.duration} min</p>
                              </div>
                            </div>

                            <div className="flex items-center text-gray-600">
                              <MapPin className="w-4 h-4 mr-3 text-green-600" />
                              <p className="text-sm">{appointment.business.address}</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {appointment.business.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="w-4 h-4 mr-3 text-green-600" />
                                <p className="text-sm">{appointment.business.phone}</p>
                              </div>
                            )}

                            <div className="flex items-center">
                              <span className="text-2xl font-bold text-green-600">
                                {formatPrice(appointment.total_price)}
                              </span>
                            </div>

                            {appointment.client_notes && (
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                  <strong>Notas:</strong> {appointment.client_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-6">
                        {canModify(appointment) && (
                          <>
                            <Dialog open={showRescheduleDialog && selectedAppointment?.id === appointment.id}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointment(appointment)
                                    setShowRescheduleDialog(true)
                                  }}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Reagendar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Reagendar Cita</DialogTitle>
                                  <DialogDescription>
                                    Selecciona una nueva fecha y hora para tu cita
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Nueva Fecha</label>
                                    <Calendar
                                      mode="single"
                                      selected={newDate}
                                      onSelect={setNewDate}
                                      disabled={(date) => date < new Date()}
                                      className="rounded-md border"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Nueva Hora</label>
                                    <Input
                                      type="time"
                                      value={newTime}
                                      onChange={(e) => setNewTime(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
                                    Cancelar
                                  </Button>
                                  <Button
                                    onClick={handleRescheduleAppointment}
                                    disabled={!newDate || !newTime}
                                  >
                                    Reagendar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={showCancelDialog && selectedAppointment?.id === appointment.id}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedAppointment(appointment)
                                    setShowCancelDialog(true)
                                  }}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Cancelar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Cancelar Cita</DialogTitle>
                                  <DialogDescription>
                                    ¿Estás seguro de que quieres cancelar esta cita?
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Textarea
                                    placeholder="Motivo de cancelación (opcional)"
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                  />
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                                    No cancelar
                                  </Button>
                                  <Button variant="destructive" onClick={handleCancelAppointment}>
                                    Sí, cancelar cita
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </>
                        )}

                        {appointment.status === 'completed' && (
                          <Dialog open={showReviewDialog && selectedAppointment?.id === appointment.id}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment)
                                  setShowReviewDialog(true)
                                }}
                              >
                                <Star className="w-4 h-4 mr-2" />
                                Reseña
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Deja una Reseña</DialogTitle>
                                <DialogDescription>
                                  Comparte tu experiencia en {appointment.business.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Calificación</label>
                                  <div className="flex items-center space-x-1 mt-2">
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                      <button
                                        key={rating}
                                        onClick={() => setReviewRating(rating)}
                                        className="focus:outline-none"
                                      >
                                        <Star
                                          className={`w-6 h-6 ${
                                            rating <= reviewRating
                                              ? 'text-yellow-400 fill-current'
                                              : 'text-gray-300'
                                          }`}
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Comentario</label>
                                  <Textarea
                                    placeholder="Cuéntanos sobre tu experiencia..."
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    rows={4}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleSubmitReview}>
                                  Enviar Reseña
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}

                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}