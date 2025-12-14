'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Calendar, Clock, MapPin, User, Star, Plus, CheckCircle, XCircle, AlertCircle, History, Edit, DollarSign, Users, Briefcase
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
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
  totalSpent: number
}

export default function ClientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<QuickStats>({ upcoming: 0, completed: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

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
      const upcoming = appointmentsWithReviewStatus.filter(apt => new Date(`${apt.appointment_date}T${apt.start_time}`) > now && ['pending', 'confirmed'].includes(apt.status)).length
      const completed = appointmentsWithReviewStatus.filter(apt => apt.status === 'completed').length
      const totalSpent = appointmentsWithReviewStatus
        .filter(apt => ['completed', 'confirmed'].includes(apt.status)) // Also include confirmed in total spent
        .reduce((sum, apt) => sum + apt.total_price, 0)

      setStats({ upcoming, completed, totalSpent })
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
      case 'completed': return { label: 'Completada', variant: 'default', className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:border-emerald-800' }
      case 'cancelled': return { label: 'Cancelada', variant: 'destructive', className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800' }
      default: return { label: status, variant: 'secondary', className: 'bg-gray-200 text-gray-600 border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' }
    }
  }

  const formatDate = (dateString: string, timeString?: string) => {
    const date = new Date(timeString ? `${dateString}T${timeString}` : dateString)
    return date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
  }

  const upcomingAppointments = useMemo(() =>
    appointments
      .filter(apt => new Date(`${apt.appointment_date}T${apt.start_time}`) > new Date() && ['pending', 'confirmed'].includes(apt.status))
      .sort((a, b) => new Date(`${a.appointment_date}T${a.start_time}`).getTime() - new Date(`${b.appointment_date}T${b.start_time}`).getTime()),
    [appointments]
  )

  const recentActivity = useMemo(() =>
    appointments.filter(apt => ['completed', 'cancelled'].includes(apt.status)).slice(0, 10),
    [appointments]
  )

  const handleReviewSubmitted = () => {
    fetchAppointments()
    toast({
      title: 'Reseña enviada',
      description: 'Gracias por compartir tu experiencia.',
    })
  }

  const columns: ColumnDef<Appointment>[] = useMemo(() => [
    {
      accessorKey: 'business',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Negocio" />,
      cell: ({ row }) => <span className="font-medium text-gray-900 dark:text-gray-50">{row.original.business?.name}</span>,
    },
    {
      accessorKey: 'total_price',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
      cell: ({ row }) => <span className="font-semibold text-orange-600 dark:text-orange-400">{formatPrice(row.original.total_price)}</span>,
    },
    {
      accessorKey: 'appointment_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
      cell: ({ row }) => <span>{formatDate(row.original.appointment_date)}</span>
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const statusInfo = getStatusInfo(row.original.status)
        return <Badge variant={statusInfo.variant as any} className={statusInfo.className}>{statusInfo.label}</Badge>
      }
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const appointment = row.original
        if (appointment.status === 'completed' && !appointment.has_review) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedAppointment(appointment)
                setReviewModalOpen(true)
              }}
            >
              <Star className="w-4 h-4 mr-2" />
              Escribir Reseña
            </Button>
          )
        }
        return null
      }
    }
  ], [formatPrice, formatDate])

  if (loading) {
    return (
       <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-theme-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-theme-600 border-t-transparent rounded-full animate-spin"></div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">¡Hola, {authState.user?.first_name || 'Cliente'}!</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Aquí tienes un resumen de tu actividad en TuTurno.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button asChild className="w-full sm:w-auto bg-theme-600 hover:bg-theme-700 shadow-md hover:shadow-lg transition-all text-white">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Citas Próximas" value={stats.upcoming} description="Reservas confirmadas" icon={Calendar} variant="green" />
          <StatsCard title="Citas Completadas" value={stats.completed} description="Historial de citas" icon={CheckCircle} variant="blue" />
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
                    <div className="flex items-center text-gray-600 dark:text-gray-400"><Calendar className="w-4 h-4 mr-3 text-theme-500"/>{formatDate(apt.appointment_date)}</div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400"><Clock className="w-4 h-4 mr-3 text-theme-500"/>{apt.start_time.slice(0,5)}</div>
                    {apt.employee && <div className="flex items-center text-gray-600 dark:text-gray-400"><User className="w-4 h-4 mr-3 text-theme-500"/>{apt.employee.first_name} {apt.employee.last_name}</div>}
                    {apt.business?.address && <div className="flex items-center text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 mr-3 text-theme-500"/>{apt.business.address}</div>}
                  </CardContent>
                  <div className="p-6 pt-3 flex items-center justify-between">
                     <span className="text-2xl font-bold text-theme-600">{formatPrice(apt.total_price)}</span>
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
                  <div className="w-20 h-20 bg-theme-100 dark:bg-theme-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Calendar className="w-10 h-10 text-theme-600 dark:text-theme-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50 mb-2">Tu agenda está libre</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                    Explora miles de servicios y encuentra el perfecto para ti.
                  </p>
                   <Button asChild className="bg-theme-600 hover:bg-theme-700 shadow-md hover:shadow-lg transition-all text-white">
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
    </div>
  )
}
