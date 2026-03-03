'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar, Clock, MapPin, User, Star, Plus, CheckCircle, XCircle, AlertCircle, History, Edit, DollarSign, Users, Briefcase, MoreVertical, Eye, Trash2, Search, Receipt
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { parseDateString, formatSpanishDate } from '@/lib/dateUtils'
import Link from 'next/link'
import ReviewModal from '@/components/ReviewModal'
import { StatsCard } from '@/components/StatsCard'
import { Pagination } from '@/components/Pagination'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import NotificationBell from '@/components/NotificationBell'

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
    employee_id?: string
    employees?: {
      first_name: string
      last_name: string
      avatar_url?: string
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
  total: number
  upcoming: number
  completed: number
  cancelled: number
  totalSpent: number
}

const ITEMS_PER_PAGE = 10

export default function ClientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<QuickStats>({ total: 0, upcoming: 0, completed: 0, cancelled: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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
            employee_id,
            employees(first_name, last_name, avatar_url, position),
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
      const total = appointmentsWithReviewStatus.length
      const upcoming = appointmentsWithReviewStatus.filter(apt => {
        const aptDate = parseDateString(apt.appointment_date)
        const [hours, minutes] = apt.start_time.split(':').map(Number)
        aptDate.setHours(hours, minutes)
        return aptDate > now && ['pending', 'confirmed'].includes(apt.status)
      }).length
      const completed = appointmentsWithReviewStatus.filter(apt => apt.status === 'completed').length
      const cancelled = appointmentsWithReviewStatus.filter(apt => apt.status === 'cancelled').length
      const totalSpent = appointmentsWithReviewStatus
        .filter(apt => apt.status === 'completed') // Only completed appointments count for total spent
        .reduce((sum, apt) => sum + apt.total_price, 0)

      setStats({ total, upcoming, completed, cancelled, totalSpent })
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: Appointment['status']) => {
    const baseClass = "transition-all duration-300 pointer-events-none border-0 font-black uppercase text-[10px] tracking-tight px-2.5 py-0.5"
    switch (status) {
      case 'pending': 
        return { 
          label: 'Pendiente', 
          variant: 'outline' as const, 
          className: `${baseClass} bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30` 
        }
      case 'confirmed': 
        return { 
          label: 'Confirmada', 
          variant: 'outline' as const, 
          className: `${baseClass} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30` 
        }
      case 'in_progress': 
        return { 
          label: 'En Progreso', 
          variant: 'outline' as const, 
          className: `${baseClass} bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30` 
        }
      case 'completed': 
        return { 
          label: 'Completada', 
          variant: 'outline' as const, 
          className: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800` 
        }
      case 'cancelled': 
        return { 
          label: 'Cancelada', 
          variant: 'outline' as const, 
          className: `${baseClass} bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30` 
        }
      case 'no_show': 
        return { 
          label: 'No asistió', 
          variant: 'outline' as const, 
          className: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800` 
        }
      default: 
        return { 
          label: status, 
          variant: 'outline' as const, 
          className: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800` 
        }
    }
  }

  const formatDate = (dateString: string) => {
    return formatSpanishDate(dateString, { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatDateShort = (dateString: string) => {
    return formatSpanishDate(dateString, { day: 'numeric', month: 'short' })
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
    appointments.filter(apt => ['confirmed', 'completed', 'cancelled'].includes(apt.status)),
    [appointments]
  )

  // Filter appointments based on search
  const filteredActivity = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()
    return recentActivity.filter(apt =>
      apt.business?.name.toLowerCase().includes(searchLower) ||
      apt.appointment_services.some(s => s.service?.name.toLowerCase().includes(searchLower)) ||
      apt.employee?.first_name.toLowerCase().includes(searchLower) ||
      apt.employee?.last_name.toLowerCase().includes(searchLower) ||
      getStatusInfo(apt.status).label.toLowerCase().includes(searchLower)
    )
  }, [recentActivity, searchTerm])

  // Pagination
  const totalPages = Math.ceil(filteredActivity.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedActivity = filteredActivity.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

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

  const getStatusBadge = (status: Appointment['status']) => {
    const statusInfo = getStatusInfo(status)
    const statusIcons = {
      pending: AlertCircle,
      confirmed: CheckCircle,
      in_progress: Clock,
      completed: CheckCircle,
      cancelled: XCircle,
      no_show: XCircle
    }
    const Icon = statusIcons[status] || AlertCircle

    return (
      <Badge variant={statusInfo.variant} className={`${statusInfo.className} gap-1.5 px-3 py-1 rounded-xl shadow-sm`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando tu dashboard</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preparando tus citas y estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Premium Integrated Header */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 flex-shrink-0 sticky top-0 z-30 shadow-sm md:h-20 flex items-center">
        <div className="w-full px-6 py-4 md:py-0">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black text-slate-400 border-slate-200 px-2.5 py-0.5">
                    Resumen del Cliente
                  </Badge>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dashboard</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 flex items-center justify-center md:justify-start gap-3">
                  ¡Hola, {authState.user?.first_name || 'Cliente'}!
                 
                </h1>
              </div>
            </div>

            <div className="flex items-center justify-center w-full md:w-auto gap-4">
              <div className="hidden md:block">
                <NotificationBell userId={authState.user?.id} />
              </div>
              <Button asChild className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 shadow-xl hover:shadow-slate-900/20 transition-all duration-300 text-white font-black h-10 px-8 rounded-2xl text-xs tracking-tight">
                <Link href="/marketplace">
                  <Plus className="w-4 h-4 mr-2" />
                  NUEVA RESERVA
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatsCard title="Total de Citas" value={stats.total} description="Todas tus citas" icon={Calendar} variant="gray" />
          <StatsCard title="Citas Próximas" value={stats.upcoming} description="Reservas confirmadas" icon={Calendar} variant="green" />
          <StatsCard title="Citas Completadas" value={stats.completed} description="Historial de citas" icon={CheckCircle} variant="blue" />
          <StatsCard title="Citas Canceladas" value={stats.cancelled} description="Reservas canceladas" icon={XCircle} variant="red" />
          <StatsCard title="Gasto Total" value={formatPrice(stats.totalSpent)} description="Solo citas completadas" icon={DollarSign} variant="purple" />
        </div>

        {/* Upcoming Appointments */}
        <div>
        
          
          {upcomingAppointments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingAppointments.map((apt, index) => (
                <Card key={apt.id} className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500 group rounded-[2.5rem] overflow-hidden bg-white dark:bg-gray-900 relative">
                  {/* Premium Vertical Accent */}
                  <div className="absolute left-0 top-12 bottom-12 w-1.5 bg-slate-900 rounded-r-full group-hover:h-20 transition-all duration-500"></div>
                  
                  <CardHeader className="pb-4 pt-8 px-8">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                           <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black text-slate-500 border-slate-200 py-0 px-2">
                             Reserva
                           </Badge>
                           <span className="text-[10px] font-bold text-slate-300">#{apt.id.slice(0, 6)}</span>
                        </div>
                        <CardTitle className="text-xl font-black text-gray-900 dark:text-gray-100 truncate group-hover:text-slate-900 transition-colors">
                          {apt.business?.name}
                        </CardTitle>
                      </div>
                      <Badge variant={getStatusInfo(apt.status).variant} className={`${getStatusInfo(apt.status).className} px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tight shadow-sm`}>
                        {getStatusInfo(apt.status).label}
                      </Badge>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2">
                       <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                         <Receipt className="w-3 h-3" /> Servicios
                       </p>
                       <p className="text-sm font-bold text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed italic">
                         {apt.appointment_services.map(s => s.service?.name).join(', ')}
                       </p>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="px-8 pb-6 py-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                        <div className="flex items-center text-sm font-black text-slate-900 dark:text-gray-100">
                          <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {formatDateShort(apt.appointment_date)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</p>
                        <div className="flex items-center text-sm font-black text-slate-900 dark:text-gray-100">
                          <Clock className="w-3.5 h-3.5 mr-2 text-slate-400" />
                          {formatTime(apt.start_time)}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 dark:border-gray-800">
                      {apt.business?.address && (
                        <div className="flex items-start gap-3">
                          <div className="mt-1 w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 leading-snug line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                            {apt.business.address}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>

                  <div className="px-8 pb-8 pt-2 flex items-center justify-between gap-4">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                          {formatPrice(apt.total_price)}
                        </span>
                     </div>
                     <Button asChild className="bg-slate-900 hover:bg-slate-800 shadow-lg hover:shadow-slate-900/20 transition-all text-white font-black rounded-2xl h-12 px-6">
                       <Link href={`/dashboard/client/appointments/${apt.id}`}>
                         Ver Detalles
                       </Link>
                     </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
             <Card className="border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-[3rem] bg-white/30 backdrop-blur-sm">
                <CardContent className="text-center py-20 px-6">
                  <div className="relative inline-block mb-8">
                    <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center rotate-6 shadow-2xl">
                      <Calendar className="w-12 h-12 text-white -rotate-6" />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white shadow-xl rounded-2xl flex items-center justify-center">
                       <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-gray-50 mb-3 tracking-tight">Tu agenda está libre</h3>
                  <p className="text-slate-500 dark:text-gray-400 mb-10 max-w-sm mx-auto font-bold leading-relaxed">
                    Descubre nuevos negocios y reserva servicios que se adapten a tu estilo de vida.
                  </p>
                   <Button asChild size="lg" className="bg-slate-900 hover:bg-slate-800 shadow-2xl hover:scale-105 transition-all text-white font-black px-10 rounded-2xl h-14">
                        <Link href="/marketplace">
                          <Plus className="w-5 h-5 mr-3" />
                          Explorar el Marketplace
                        </Link>
                   </Button>
                </CardContent>
             </Card>
          )}
        </div>

        {/* Recent Activity with DataTable */}
        {recentActivity.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-slate-900 rounded-full"></div>
                <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50">Actividad Reciente</h2>
              </div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-lg">
                {filteredActivity.length} Registros
              </Badge>
            </div>

            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden rounded-[2rem]">
              <CardContent className="p-0">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  <div className="relative group max-w-md">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 transition-colors group-focus-within:text-slate-900" />
                    <Input
                      type="text"
                      placeholder="Buscar por negocio, servicio, profesional o estado..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-11 h-12 bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700 rounded-2xl focus:ring-slate-900/10 focus:border-slate-900 transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-gray-50/50 dark:bg-gray-800/50">
                      <TableRow className="hover:bg-transparent border-b border-gray-100 dark:border-gray-800">
                        <TableHead className="font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider">Fecha y Hora</TableHead>
                        <TableHead className="font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider">Negocio</TableHead>
                        <TableHead className="font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider hidden md:table-cell">Servicios</TableHead>
                        <TableHead className="font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider hidden lg:table-cell">Profesional</TableHead>
                        <TableHead className="font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider">Estado</TableHead>
                        <TableHead className="font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider">Total</TableHead>
                        <TableHead className="text-right font-bold text-slate-500 py-5 px-6 text-[11px] uppercase tracking-wider">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedActivity.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-20 text-gray-500">
                            No se encontraron citas
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedActivity.map((appointment) => {
                          const canCancel = ['pending', 'confirmed'].includes(appointment.status)
                          const canReview = appointment.status === 'completed' && !appointment.has_review

                          return (
                            <TableRow key={appointment.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 group">
                              <TableCell className="py-4 px-6 whitespace-nowrap min-w-[180px]">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-gray-100">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 transition-colors" />
                                    {formatDate(appointment.appointment_date)}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                                    <Clock className="h-3 w-3" />
                                    {formatTime(appointment.start_time)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6 min-w-[100px] max-w-[120px]">
                                <div className="font-black text-gray-900 dark:text-gray-100 truncate">{appointment.business?.name}</div>
                                {appointment.business?.address && (
                                  <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400 mt-1 line-clamp-1">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{appointment.business.address}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-4 px-6 hidden md:table-cell min-w-[140px]">
                                <div className="max-w-[180px]">
                                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 line-clamp-1">
                                    {appointment.appointment_services.map(s => s.service?.name).join(', ')}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase block mt-0.5">
                                    {appointment.appointment_services.length} Servicio{appointment.appointment_services.length > 1 ? 's' : ''}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6 text-sm min-w-[140px]">
                                <div className="flex flex-col gap-2">
                                  {/* Mostrar todos los profesionales de la cita */}
                                  {Array.from(new Set([
                                    appointment.employee?.id,
                                    ...(appointment.appointment_services?.map(as => as.employee_id).filter(Boolean) || [])
                                  ])).map((empId, idx) => {
                                    if (!empId) return null;
                                    const as = appointment.appointment_services?.find(s => s.employee_id === empId);
                                    const empInfo = empId === appointment.employee?.id
                                      ? appointment.employee
                                      : as?.employees;

                                    if (!empInfo) return null;

                                    return (
                                      <div key={empId || idx} className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6 border border-gray-200">
                                          <AvatarImage src={empInfo.avatar_url} />
                                          <AvatarFallback className="bg-slate-900 text-white text-[8px]">
                                            {empInfo.first_name[0]}{empInfo.last_name[0]}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                                          {empInfo.first_name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {(!appointment.employee && (!appointment.appointment_services || appointment.appointment_services.every(as => !as.employee_id))) && (
                                    <Badge variant="outline" className="text-[10px] font-bold text-slate-400 border-slate-200">Sin asignar</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                {getStatusBadge(appointment.status)}
                              </TableCell>
                              <TableCell className="py-4 px-6">
                                <div className="font-black text-slate-900 dark:text-slate-100 text-base">
                                  {formatPrice(appointment.total_price)}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 px-6 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 rounded-2xl p-1.5 shadow-xl border-gray-200">
                                    <DropdownMenuItem asChild className="rounded-xl focus:bg-slate-50 cursor-pointer">
                                      <Link href={`/dashboard/client/appointments/${appointment.id}`}>
                                        <Eye className="mr-2 h-4 w-4 text-slate-600" />
                                        <span className="font-bold">Ver Detalles</span>
                                      </Link>
                                    </DropdownMenuItem>
                                    {canReview && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedAppointment(appointment)
                                          setReviewModalOpen(true)
                                        }}
                                        className="rounded-xl focus:bg-amber-50 cursor-pointer text-amber-700"
                                      >
                                        <Star className="mr-2 h-4 w-4" />
                                        <span className="font-bold">Escribir Reseña</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canCancel && (
                                      <>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedAppointment(appointment)
                                            setShowCancelDialog(true)
                                          }}
                                          className="rounded-xl focus:bg-red-50 cursor-pointer text-red-600"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          <span className="font-bold">Cancelar Cita</span>
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="p-6 bg-gray-50/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </CardContent>
            </Card>
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
