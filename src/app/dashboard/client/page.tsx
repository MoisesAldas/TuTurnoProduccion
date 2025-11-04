'use client'
import Logo from '@/components/logo'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Calendar, Clock, MapPin, Phone, User, Star,
  Plus, Search, Filter, MoreVertical, CheckCircle,
  XCircle, AlertCircle, History, Edit, Trash2, CalendarIcon,
  Settings, LogOut, UserCircle, Bell, ChevronDown,
  Home, BookOpen, CreditCard, Menu, X, ChevronRight
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import ReviewModal from '@/components/ReviewModal'

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
  const [stats, setStats] = useState<QuickStats>({
    upcoming: 0,
    completed: 0,
    cancelled: 0,
    totalSpent: 0
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const { authState, signOut } = useAuth()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

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
          )
        `)
        .eq('client_id', authState.user.id)
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: false })

      if (error) {
        console.error('Error fetching appointments:', error)
        return
      }

      const appointmentData = data || []

      // Check if each appointment has a review
      const appointmentsWithReviewStatus = await Promise.all(
        appointmentData.map(async (appointment) => {
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('id')
            .eq('appointment_id', appointment.id)
            .maybeSingle()

          return {
            ...appointment,
            has_review: !!reviewData
          }
        })
      )

      setAppointments(appointmentsWithReviewStatus)

      // Calculate stats in LOCAL timezone to avoid UTC date shifting
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      const today = `${y}-${m}-${d}`
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const currentTime = `${hh}:${mm}`

      const upcoming = appointmentsWithReviewStatus.filter(apt => {
        const aptDate = apt.appointment_date
        const aptTime = apt.start_time
        return (aptDate > today || (aptDate === today && aptTime > currentTime)) &&
               ['pending', 'confirmed'].includes(apt.status)
      }).length

      const completed = appointmentsWithReviewStatus.filter(apt => apt.status === 'completed').length
      const cancelled = appointmentsWithReviewStatus.filter(apt => ['cancelled', 'no_show'].includes(apt.status)).length
      const totalSpent = appointmentsWithReviewStatus
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + apt.total_price, 0)

      setStats({ upcoming, completed, cancelled, totalSpent })

    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }


  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
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
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    }
  }

  const formatDate = (dateString: string) => {
    // Interpret 'YYYY-MM-DD' as LOCAL date to avoid UTC shift
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, (month || 1) - 1, day || 1)
    return date.toLocaleDateString('es-EC', {
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

  const handleOpenReviewModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setReviewModalOpen(true)
  }

  const handleCloseReviewModal = () => {
    setReviewModalOpen(false)
    setSelectedAppointment(null)
  }

  const handleReviewSubmitted = () => {
    // Refresh appointments to update review status
    fetchAppointments()
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

  const filteredAppointments = appointments.filter(appointment => {
    switch (filter) {
      case 'upcoming':
        return isUpcoming(appointment)
      case 'past':
        return isPast(appointment)
      default:
        return true
    }
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tu dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Minimal Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
             <Logo />

            <div className="flex items-center space-x-3">
              <Link href="/marketplace" className="hidden sm:block">
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Reserva
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Menu Button */}
      <div className="fixed right-6 top-6 z-50">
        <Button
          onClick={() => setSidebarOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110"
        >
          <Menu className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-500 ease-out flex flex-col ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {/* Sidebar Header - More Compact */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold">Navegación</h2>
            <Button
              onClick={() => setSidebarOpen(false)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* User Profile in Sidebar - More Compact */}
          <div className="flex items-center space-x-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarImage
                src={authState.user?.avatar_url}
                alt={authState.user?.first_name || authState.user?.email || 'Usuario'}
              />
              <AvatarFallback className="bg-white/20 text-white font-medium">
                {(authState.user?.first_name || authState.user?.email)?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {authState.user?.first_name ?
                  `${authState.user.first_name} ${authState.user.last_name || ''}`.trim() :
                  'Mi Perfil'
                }
              </p>
              <p className="text-xs text-white/80 truncate">
                {authState.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Content - More Compact */}
        <div className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Dashboard Section */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              Panel Principal
            </h3>
            <Link
              href="/dashboard/client"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">Dashboard</p>
                <p className="text-xs text-gray-500 truncate">Vista general y estadísticas</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
            </Link>
          </div>

          {/* Appointments Section */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              Gestión de Citas
            </h3>
            <div className="space-y-1">
              <Link
                href="/marketplace"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Nueva Reserva</p>
                  <p className="text-xs text-gray-500 truncate">Explorar y reservar servicios</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </Link>

              <Link
                href="/dashboard/client/appointments"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Mis Citas</p>
                  <p className="text-xs text-gray-500 truncate">Gestionar reservas existentes</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </Link>
            </div>
          </div>

          {/* Account Section */}
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
              Mi Cuenta
            </h3>
            <div className="space-y-1">
              <Link
                href="/dashboard/client/profile"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <UserCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Mi Perfil</p>
                  <p className="text-xs text-gray-500 truncate">Información personal</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </Link>

              <Link
                href="/dashboard/client/ajustes"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Notificaciones</p>
                  <p className="text-xs text-gray-500 truncate">Configurar alertas</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </Link>

              <Link
                href="/dashboard/client/settings"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 group cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-slate-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Configuración</p>
                  <p className="text-xs text-gray-500 truncate">Ajustes generales</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
              </Link>
            </div>
          </div>

          {/* Logout Section */}
          <div className="border-t pt-3 mt-4">
            <button
              onClick={() => {
                handleSignOut()
                setSidebarOpen(false)
              }}
              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-red-50 transition-all duration-200 group cursor-pointer w-full text-left"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <LogOut className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-red-600 text-sm">Cerrar Sesión</p>
                <p className="text-xs text-red-400 truncate">Salir de tu cuenta</p>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Hola, {authState.user?.first_name || authState.user?.email?.split('@')[0] || 'Cliente'}! 👋
          </h2>
          <p className="text-gray-600">
            Aquí puedes gestionar todas tus citas y explorar nuevos servicios.
          </p>
        </div>

        {/* Quick Stats with Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.upcoming}</p>
                  <p className="text-sm text-gray-600">Próximas Citas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                  <p className="text-sm text-gray-600">Completadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalSpent)}</p>
                  <p className="text-sm text-gray-600">Total Gastado</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <History className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                  <p className="text-sm text-gray-600">Historial</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Appointments Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Mis Citas</CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  Todas
                </Button>
                <Button
                  variant={filter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('upcoming')}
                >
                  Próximas
                </Button>
                <Button
                  variant={filter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('past')}
                >
                  Historial
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'upcoming' ? 'No tienes citas próximas' :
                   filter === 'past' ? 'No tienes historial de citas' :
                   'No tienes citas registradas'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'upcoming' ? 'Reserva tu próxima cita para cuidarte.' :
                   filter === 'past' ? 'Tus citas pasadas aparecerán aquí.' :
                   'Comienza reservando tu primera cita en tu salón favorito.'}
                </p>
                <Link href="/marketplace">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Explorar Servicios
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAppointments.map((appointment) => {
                  const statusInfo = getStatusInfo(appointment.status)
                  const StatusIcon = statusInfo.icon

                  return (
                    <div
                      key={appointment.id}
                      className="border rounded-lg p-6 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {appointment.business?.name || 'Negocio'}
                            </h3>
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              {/* Services List */}
                              <div>
                                <p className="text-xs font-medium text-gray-500 mb-1">Servicios:</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {appointment.appointment_services.map((appService, index) => (
                                    <Badge
                                      key={index}
                                      className="bg-green-100 text-green-700 hover:bg-green-200 text-xs"
                                    >
                                      {appService.service?.name || 'Servicio'}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              {/* Employee */}
                              <div className="flex items-center text-gray-600">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center overflow-hidden mr-2 border">
                                  {appointment.employee?.avatar_url ? (
                                    <img
                                      src={appointment.employee.avatar_url}
                                      alt={`${appointment.employee?.first_name || ''} ${appointment.employee?.last_name || ''}`}
                                      className="w-full h-full rounded-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-3 h-3 text-green-600" />
                                  )}
                                </div>
                                <span className="text-sm">
                                  {appointment.employee ? `${appointment.employee.first_name} ${appointment.employee.last_name}` : 'Sin empleado'}
                                </span>
                              </div>

                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span className="text-sm">
                                  {formatDate(appointment.appointment_date)}
                                </span>
                              </div>

                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2" />
                                <span className="text-sm">
                                  {appointment.start_time} - {appointment.end_time}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {appointment.business?.address && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span className="text-sm">{appointment.business.address}</span>
                                </div>
                              )}

                              {appointment.business?.phone && (
                                <div className="flex items-center text-gray-600">
                                  <Phone className="w-4 h-4 mr-2" />
                                  <span className="text-sm">{appointment.business.phone}</span>
                                </div>
                              )}

                              <div className="text-lg font-semibold text-green-600">
                                {formatPrice(appointment.total_price)}
                              </div>
                            </div>
                          </div>

                          {appointment.client_notes && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                <strong>Notas:</strong> {appointment.client_notes}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {isUpcoming(appointment) && (
                            <Link href={`/dashboard/client/appointments/${appointment.id}`}>
                              <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4 mr-1" />
                                Gestionar
                              </Button>
                            </Link>
                          )}

                          {appointment.status === 'completed' && !appointment.has_review && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReviewModal(appointment)}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Dejar Reseña
                            </Button>
                          )}

                          {appointment.status === 'completed' && appointment.has_review && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-300 text-green-700 cursor-default"
                              disabled
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Reseña Enviada
                            </Button>
                          )}

                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/marketplace" className="group">
              <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Plus className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Nueva Reserva</h4>
                  <p className="text-sm text-gray-600">Explora y reserva en nuevos lugares</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/dashboard/client/profile" className="group">
              <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Mi Perfil</h4>
                  <p className="text-sm text-gray-600">Actualiza tu información personal</p>
                </CardContent>
              </Card>
            </Link>

            <Card className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Mis Favoritos</h4>
                <p className="text-sm text-gray-600">Lugares y servicios que te gustan</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {selectedAppointment && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={handleCloseReviewModal}
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