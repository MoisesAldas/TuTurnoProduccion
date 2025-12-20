'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar, Clock, MapPin, User, Star, Plus, CheckCircle, XCircle, AlertCircle, History, Edit, DollarSign, Users, Briefcase, MoreVertical, Eye, Trash2
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { parseDateString, formatSpanishDate } from '@/lib/dateUtils'
import Link from 'next/link'
import ReviewModal from '@/components/ReviewModal'
import { StatsCard } from '@/components/StatsCard'
import { DataTable } from '@/components/ui/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '@/components/ui/data-table-column-header'

// NOTE: All data fetching and state logic from the original file is preserved.

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

interface QuickStats {
  upcoming: number
  completed: number
  cancelled: number
  totalSpent: number
}

export default function ClientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<QuickStats>({ upcoming: 0, completed: 0, cancelled: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

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
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          business:businesses(id, name, address, phone),
          employee:employees(id, first_name, last_name, position, avatar_url),
          appointment_services(
            service:services(id, name, description),
            price
          ),
          reviews(id)
        `)
        .eq('client_id', authState.user.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      const appointmentData = data || []
      const appointmentsWithReviewStatus = appointmentData.map((appointment) => ({
        ...appointment,
        has_review: !!appointment.reviews && appointment.reviews.length > 0
      }))

      setAppointments(appointmentsWithReviewStatus)

      const now = new Date()
      const upcoming = appointmentsWithReviewStatus.filter(apt => {
        const aptDate = parseDateString(apt.appointment_date)
        const [hours, minutes] = apt.start_time.split(':').map(Number)
        aptDate.setHours(hours, minutes)
        return aptDate > now && ['pending', 'confirmed'].includes(apt.status)
      }).length
      const completed = appointmentsWithReviewStatus.filter(apt => apt.status === 'completed').length
      const cancelled = appointmentsWithReviewStatus.filter(apt => apt.status === 'cancelled').length
      const totalSpent = appointmentsWithReviewStatus
        .filter(apt => ['completed', 'confirmed'].includes(apt.status)) // Also include confirmed in total spent
        .reduce((sum, apt) => sum + apt.total_price, 0)

      setStats({ upcoming, completed, cancelled, totalSpent })
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: Appointment['status']) => {
    switch (status) {
      case 'pending': return { label: 'Pendiente', variant: 'secondary', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-400 dark:border-yellow-800' }
      case 'confirmed': return { label: 'Confirmada', variant: 'default', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800' }
      case 'in_progress': return { label: 'En Progreso', variant: 'default', className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800' }
      case 'completed': return { label: 'Completada', variant: 'default', className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-400 dark:border-green-800' }
      case 'cancelled': return { label: 'Cancelada', variant: 'destructive', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800' }
      case 'no_show': return { label: 'No asistió', variant: 'secondary', className: 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
      default: return { label: status, variant: 'secondary', className: 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
    }
  }

  const formatDate = (dateString: string) => {
    return formatSpanishDate(dateString, { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  const upcomingAppointments = useMemo(() =>
    appointments
      .filter(apt => {
        const aptDate = parseDateString(apt.appointment_date)
        const [hours, minutes] = apt.start_time.split(':').map(Number)
        aptDate.setHours(hours, minutes)
        return aptDate > new Date() && ['pending', 'confirmed'].includes(apt.status)
      })
      .sort((a, b) => {
        const dateA = parseDateString(a.appointment_date)
        const [hoursA, minutesA] = a.start_time.split(':').map(Number)
        dateA.setHours(hoursA, minutesA)

        const dateB = parseDateString(b.appointment_date)
        const [hoursB, minutesB] = b.start_time.split(':').map(Number)
        dateB.setHours(hoursB, minutesB)

        return dateA.getTime() - dateB.getTime()
      }),
    [appointments]
  )

  const recentActivity = useMemo(() =>
    appointments.filter(apt => ['confirmed', 'completed', 'cancelled'].includes(apt.status)).slice(0, 10),
    [appointments]
  )

  const handleReviewSubmitted = () => {
    fetchAppointments()
    toast({
      title: 'Reseña enviada',
      description: 'Gracias por compartir tu experiencia.',
    })
  }

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return
    setCancelling(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          client_notes: `${selectedAppointment.client_notes || ''}\nMotivo de cancelación: ${cancelReason}`.trim()
        })
        .eq('id', selectedAppointment.id)

      if (error) throw error

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
        description: 'No pudimos cancelar tu cita. Por favor intenta nuevamente.',
      })
    } finally {
      setCancelling(false)
    }
  }

  const columns: ColumnDef<Appointment>[] = useMemo(() => [
    {
      accessorKey: 'business',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Negocio" />,
      cell: ({ row }) => <span className="font-medium text-gray-900 dark:text-gray-50">{row.original.business?.name}</span>,
    },
    {
      accessorKey: 'appointment_services',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Servicios" />,
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {row.original.appointment_services.map(s => s.service?.name).join(', ')}
          </span>
        </div>
      )
    },
    {
      accessorKey: 'employee',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Profesional" />,
      cell: ({ row }) => (
        row.original.employee ? (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.original.employee.first_name} {row.original.employee.last_name}
          </span>
        ) : <span className="text-sm text-gray-400">-</span>
      )
    },
    {
      accessorKey: 'appointment_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.appointment_date)}</span>
    },
    {
      accessorKey: 'start_time',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hora" />,
      cell: ({ row }) => <span className="text-sm font-medium">{formatTime(row.original.start_time)}</span>
    },
    {
      accessorKey: 'total_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => <span className="font-semibold text-gray-900 dark:text-gray-50">{formatPrice(row.original.total_price)}</span>,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const statusInfo = getStatusInfo(row.original.status)
        return <Badge variant={statusInfo.variant as any} className={statusInfo.className}>{statusInfo.label}</Badge>
      }
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Acciones" />,
      cell: ({ row }) => {
        const appointment = row.original
        const aptDate = parseDateString(appointment.appointment_date)
        const [hours, minutes] = appointment.start_time.split(':').map(Number)
        aptDate.setHours(hours, minutes)
        const isUpcoming = aptDate > new Date()
        const canCancel = ['pending', 'confirmed'].includes(appointment.status)
        const canManage = !['cancelled', 'completed'].includes(appointment.status)
        const canReview = appointment.status === 'completed' && !appointment.has_review

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/client/appointments/${appointment.id}`} className="cursor-pointer">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Cita
                </Link>
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/client/appointments`} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    Gestionar Cita
                  </Link>
                </DropdownMenuItem>
              )}
              {canReview && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedAppointment(appointment)
                    setReviewModalOpen(true)
                  }}
                  className="cursor-pointer"
                >
                  <Star className="mr-2 h-4 w-4" />
                  Escribir Reseña
                </DropdownMenuItem>
              )}
              {canCancel && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedAppointment(appointment)
                      setShowCancelDialog(true)
                    }}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cancelar Cita
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    }
  ], [formatPrice, formatDate, formatTime])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando tu dashboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preparando tus citas y estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">¡Hola, {authState.user?.first_name || 'Cliente'}!</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Aquí tienes un resumen de tu actividad en TuTurno.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 shadow-md hover:shadow-lg transition-all text-white">
                <Link href="/marketplace">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Reserva
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Citas Próximas" value={stats.upcoming} description="Reservas confirmadas" icon={Calendar} variant="green" />
          <StatsCard title="Citas Completadas" value={stats.completed} description="Historial de citas" icon={CheckCircle} variant="blue" />
          <StatsCard title="Citas Canceladas" value={stats.cancelled} description="Reservas canceladas" icon={XCircle} variant="red" />
          <StatsCard title="Gasto Total" value={formatPrice(stats.totalSpent)} description="En todas tus citas" icon={DollarSign} variant="purple" />
        </div>

        {/* Upcoming Appointments */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4">Tus Próximas Citas</h2>
          {upcomingAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingAppointments.map((apt, index) => (
                <Card key={apt.id} className="hover:shadow-lg transition-all duration-200 group">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3 mb-2">
                       <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-50 line-clamp-1">{apt.business?.name}</CardTitle>
                       <Badge className={`${getStatusInfo(apt.status).className} flex-shrink-0`}>{getStatusInfo(apt.status).label}</Badge>
                    </div>
                     <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{apt.appointment_services.map(s => s.service?.name).join(', ')}</p>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400"><Calendar className="w-4 h-4 mr-3 text-slate-700"/>{formatDate(apt.appointment_date)}</div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400"><Clock className="w-4 h-4 mr-3 text-slate-700"/>{formatTime(apt.start_time)}</div>
                    {apt.employee && <div className="flex items-center text-gray-600 dark:text-gray-400"><User className="w-4 h-4 mr-3 text-slate-700"/>{apt.employee.first_name} {apt.employee.last_name}</div>}
                    {apt.business?.address && <div className="flex items-center text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 mr-3 text-slate-700"/>{apt.business.address}</div>}
                  </CardContent>
                  <div className="p-6 pt-3 flex items-center justify-between">
                     <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatPrice(apt.total_price)}</span>
                     <Button asChild variant="ghost" size="sm">
                       <Link href={`/dashboard/client/appointments/${apt.id}`}><Edit className="w-4 h-4 mr-2"/>Ver Detalles</Link>
                     </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <Card className="border-2 border-dashed border-gray-200 dark:border-gray-800">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-10 h-10 text-slate-700 dark:text-slate-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">Tu agenda está libre</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Explora miles de servicios y encuentra el perfecto para ti.
                  </p>
                   <Button asChild className="bg-slate-900 hover:bg-slate-800 shadow-md hover:shadow-lg transition-all text-white">
                        <Link href="/marketplace">
                          <Plus className="w-4 h-4 mr-2" />
                          Explorar Servicios
                        </Link>
                      </Button>
                </CardContent>
              </Card>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-4">Actividad Reciente</h2>
            <DataTable columns={columns} data={recentActivity} />
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedAppointment && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          appointmentId={selectedAppointment.id}
          businessId={selectedAppointment.business?.id || ''}
          businessName={selectedAppointment.business?.name || 'Negocio'}
          clientId={authState.user?.id || ''}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar Cita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar esta cita? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="cancelReason" className="text-sm font-medium">
                Motivo de cancelación (opcional)
              </label>
              <Textarea
                id="cancelReason"
                placeholder="Escribe el motivo de la cancelación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancelReason('')
                setSelectedAppointment(null)
              }}
              disabled={cancelling}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelAppointment}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelando...' : 'Cancelar Cita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
