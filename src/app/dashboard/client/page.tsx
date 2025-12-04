'use client'

import React from 'react'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar, Clock, MapPin, User, Star,
  Plus, CheckCircle, XCircle, AlertCircle, History, Edit, MoreVertical
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import ReviewModal from '@/components/ReviewModal'

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
      // Fetch appointments with reviews in a single query (optimized - no N+1 problem)
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
      // Map appointments with review status (no async needed)
      const appointmentsWithReviewStatus = appointmentData.map((appointment) => ({
        ...appointment,
        has_review: !!appointment.reviews && appointment.reviews.length > 0
      }))

      setAppointments(appointmentsWithReviewStatus)

      const now = new Date()
      const upcoming = appointmentsWithReviewStatus.filter(apt => new Date(`${apt.appointment_date}T${apt.start_time}`) > now && ['pending', 'confirmed'].includes(apt.status)).length
      const completed = appointmentsWithReviewStatus.filter(apt => apt.status === 'completed').length
      const totalSpent = appointmentsWithReviewStatus
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + apt.total_price, 0)

      setStats({ upcoming, completed, totalSpent })
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
      case 'confirmed': return { label: 'Confirmada', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'completed': return { label: 'Completada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
      case 'cancelled': return { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle }
      default: return { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    }
  }

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(price)
  }

  const nextAppointment = appointments
    .filter(apt => new Date(`${apt.appointment_date}T${apt.start_time}`) > new Date() && ['pending', 'confirmed'].includes(apt.status))
    .sort((a, b) => new Date(`${a.appointment_date}T${a.start_time}`).getTime() - new Date(`${b.appointment_date}T${b.start_time}`).getTime())[0]

  const upcomingAppointments = appointments
    .filter(apt => new Date(`${apt.appointment_date}T${apt.start_time}`) > new Date() && ['pending', 'confirmed'].includes(apt.status))
    .sort((a, b) => new Date(`${a.appointment_date}T${a.start_time}`).getTime() - new Date(`${b.appointment_date}T${b.start_time}`).getTime())
    .slice(0, 3)

  const recentActivity = appointments.slice(0, 5)

  const handleReviewSubmitted = () => {
    fetchAppointments()
    toast({
      title: 'Reseña enviada',
      description: 'Gracias por compartir tu experiencia.',
    })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-8">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">¡Hola, {authState.user?.first_name || 'Cliente'}!</h1>
        <p className="text-lg text-gray-600 mt-1">Aquí tienes un resumen de tu actividad en TuTurno.</p>
      </div>

      {/* Tabs for Progressive Disclosure */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Vista General
          </TabsTrigger>
          <TabsTrigger value="stats" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
            Actividad
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview - Dashboard Rico */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Próximas</p>
                    <p className="text-3xl font-bold text-blue-700">{stats.upcoming}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Completadas</p>
                    <p className="text-3xl font-bold text-green-700">{stats.completed}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Gastado</p>
                    <p className="text-2xl font-bold text-purple-700">{formatPrice(stats.totalSpent)}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                    <History className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Próximas Citas */}
            <div className="lg:col-span-2 space-y-6">
              {/* Próximas Citas */}
              <Card className="border-t-4 border-t-emerald-500 shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Tus Próximas Citas</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                      <Link href="/dashboard/client/appointments" className="text-emerald-600 hover:text-emerald-700">
                        Ver todas
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((apt, index) => (
                        <Link
                          key={apt.id}
                          href={`/dashboard/client/appointments/${apt.id}`}
                          className="block"
                        >
                          <div className={`p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                            index === 0
                              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-300'
                              : 'bg-white border-gray-200 hover:border-emerald-200'
                          }`}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold text-lg text-gray-900">{apt.business?.name}</h4>
                                  {index === 0 && (
                                    <Badge className="bg-emerald-600 text-white">Próxima</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{apt.appointment_services.map(s => s.service?.name).join(', ')}</p>
                              </div>
                              <Badge className={getStatusInfo(apt.status).color}>
                                {getStatusInfo(apt.status).label}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex items-center text-gray-600">
                                <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                                {formatDate(apt.appointment_date)}
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Clock className="w-4 h-4 mr-2 text-emerald-600" />
                                {apt.start_time.slice(0,5)}
                              </div>
                              {apt.employee && (
                                <div className="flex items-center text-gray-600">
                                  <User className="w-4 h-4 mr-2 text-emerald-600" />
                                  {apt.employee.first_name} {apt.employee.last_name}
                                </div>
                              )}
                              {apt.business?.address && (
                                <div className="flex items-center text-gray-600">
                                  <MapPin className="w-4 h-4 mr-2 text-emerald-600" />
                                  <span className="truncate">{apt.business.address}</span>
                                </div>
                              )}
                            </div>

                            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                              <span className="text-xl font-bold text-emerald-600">{formatPrice(apt.total_price)}</span>
                              <Edit className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-10 h-10 text-emerald-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Tu agenda está libre</h3>
                      <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                        Explora miles de servicios y encuentra el perfecto para ti.
                      </p>
                      <Button asChild size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-500">
                        <Link href="/marketplace">
                          <Plus className="w-5 h-5 mr-2" />
                          Explorar Servicios
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actividad Reciente Preview */}
              {recentActivity.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Actividad Reciente</CardTitle>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="#" onClick={() => {
                          const tabs = document.querySelector('[value="activity"]') as HTMLButtonElement
                          tabs?.click()
                        }} className="text-emerald-600 hover:text-emerald-700">
                          Ver más
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivity.slice(0, 3).map(apt => (
                        <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusInfo(apt.status).color}`}>
                              {React.createElement(getStatusInfo(apt.status).icon, { className: 'w-5 h-5' })}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{apt.business?.name}</p>
                              <p className="text-sm text-gray-500">{formatDate(apt.appointment_date)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-emerald-600">{formatPrice(apt.total_price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Quick Actions + CTA */}
            <div className="space-y-6">
              {/* CTA Principal */}
              <Card className="bg-gradient-to-br from-emerald-600 to-teal-500 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nueva Reserva</h3>
                  <p className="opacity-90 mb-4 text-sm">
                    Descubre y reserva servicios increíbles en tu zona
                  </p>
                  <Button asChild size="lg" variant="secondary" className="w-full bg-white text-emerald-700 hover:bg-emerald-50">
                    <Link href="/marketplace">Explorar Marketplace</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                    <Link href="/dashboard/client/appointments">
                      <Calendar className="w-4 h-4 mr-3" />
                      Ver todas mis citas
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                    <Link href="/dashboard/client/profile">
                      <User className="w-4 h-4 mr-3" />
                      Editar mi perfil
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
                    <Link href="/marketplace">
                      <MapPin className="w-4 h-4 mr-3" />
                      Explorar negocios
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Info Card */}
              {stats.completed > 0 && (
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">¡Buen trabajo!</h4>
                      <p className="text-sm text-gray-600">
                        Has completado <span className="font-bold text-blue-600">{stats.completed}</span> cita{stats.completed !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Estadísticas */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={Calendar} title="Próximas Citas" value={stats.upcoming} color="blue" />
            <StatCard icon={CheckCircle} title="Citas Completadas" value={stats.completed} color="green" />
            <StatCard icon={History} title="Total Gastado" value={formatPrice(stats.totalSpent)} color="purple" />
          </div>

          {/* Quick summary */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Has completado <span className="font-bold text-emerald-600">{stats.completed}</span> citas
                  {stats.totalSpent > 0 && <> con un gasto total de <span className="font-bold text-emerald-600">{formatPrice(stats.totalSpent)}</span></>}
                </p>
                <Button asChild variant="outline">
                  <Link href="/dashboard/client/appointments">Ver todas las citas</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Actividad Reciente */}
        <TabsContent value="activity" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle>Actividad Reciente</CardTitle>
                <Button asChild variant="ghost" size="sm" className="hover:bg-emerald-50">
                  <Link href="/dashboard/client/appointments" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                    Ver historial completo
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.length > 0 ? recentActivity.map(apt => (
                  <Link
                    key={apt.id}
                    href={`/dashboard/client/appointments/${apt.id}`}
                    className="block"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg hover:bg-emerald-50 transition-all duration-200 border border-transparent hover:border-emerald-200 hover:shadow-md">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusInfo(apt.status).color} transition-transform duration-200 hover:scale-110`}>
                          {React.createElement(getStatusInfo(apt.status).icon, { className: 'w-6 h-6' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900 truncate">{apt.business?.name}</p>
                            <Badge variant="secondary" className={`${getStatusInfo(apt.status).color} flex-shrink-0 text-xs`}>
                              {getStatusInfo(apt.status).label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 truncate">
                            {apt.appointment_services.map(s => s.service?.name).join(', ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(apt.appointment_date)} • {apt.start_time.slice(0,5)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                        <p className="font-bold text-lg text-emerald-600">{formatPrice(apt.total_price)}</p>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <History className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay actividad aún</h3>
                    <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                      Reserva tu primera cita y comienza a disfrutar de nuestros servicios
                    </p>
                    <Button asChild size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-500">
                      <Link href="/marketplace">
                        <Plus className="w-5 h-5 mr-2" />
                        Explorar Servicios
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

const StatCard = ({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border-l-4 border-transparent hover:border-l-emerald-500">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colors[color]} transition-transform duration-300 hover:scale-110`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 transition-colors">{value}</p>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
