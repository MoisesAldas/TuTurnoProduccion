'use client'

import React from 'react'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar, Clock, MapPin, User, Star,
  Plus, CheckCircle, XCircle, AlertCircle, History, Edit, MoreVertical
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
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

  const recentActivity = appointments.slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tu dashboard...</p>
        </div>
      </div>
    )
  }

  function handleReviewSubmitted(): void {
    throw new Error('Function not implemented.')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">¡Hola, {authState.user?.first_name || 'Cliente'}! 👋</h1>
        <p className="text-lg text-gray-600 mt-1">Aquí tienes un resumen de tu actividad en TuTurno.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Calendar} title="Próximas Citas" value={stats.upcoming} color="blue" />
        <StatCard icon={CheckCircle} title="Citas Completadas" value={stats.completed} color="green" />
        <StatCard icon={History} title="Total Gastado" value={formatPrice(stats.totalSpent)} color="purple" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Next Appointment */}
          {nextAppointment ? (
            <Card className="border-t-4 border-t-emerald-500 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Tu Próxima Cita</span>
                  <Badge className={getStatusInfo(nextAppointment.status).color}>{getStatusInfo(nextAppointment.status).label}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="text-xl font-bold text-emerald-700">{nextAppointment.business?.name}</h3>
                  <p className="text-md text-gray-600">{nextAppointment.appointment_services.map(s => s.service?.name).join(', ')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-gray-400" /> {formatDate(nextAppointment.appointment_date)}</div>
                  <div className="flex items-center"><Clock className="w-4 h-4 mr-2 text-gray-400" /> {nextAppointment.start_time.slice(0,5)}</div>
                  <div className="flex items-center"><User className="w-4 h-4 mr-2 text-gray-400" /> {nextAppointment.employee?.first_name} {nextAppointment.employee?.last_name}</div>
                  <div className="flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400" /> {nextAppointment.business?.address}</div>
                </div>
                <Button asChild variant="outline" className="w-full md:w-auto">
                  <Link href={`/dashboard/client/appointments/${nextAppointment.id}`}><Edit className="w-4 h-4 mr-2"/>Gestionar Cita</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
             <Card className="border-t-4 border-t-emerald-500 shadow-lg">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes citas próximas</h3>
                  <p className="text-gray-500 mb-6">Es un buen momento para reservar tu próximo servicio.</p>
                  <Button asChild><Link href="/marketplace"><Plus className="w-4 h-4 mr-2" />Reservar una Cita</Link></Button>
                </CardContent>
              </Card>
          )}

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? recentActivity.map(apt => (
                  <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusInfo(apt.status).color}`}>
                        {React.createElement(getStatusInfo(apt.status).icon, { className: 'w-5 h-5' })}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{apt.business?.name}</p>
                        <p className="text-sm text-gray-500">{formatDate(apt.appointment_date)} - {apt.start_time.slice(0,5)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        <p className="font-semibold text-gray-800">{formatPrice(apt.total_price)}</p>
                        <Badge variant="secondary" className={getStatusInfo(apt.status).color}>{getStatusInfo(apt.status).label}</Badge>
                    </div>
                  </div>
                )) : <p className="text-gray-500 text-center py-4">No hay actividad reciente.</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <Card className="bg-gradient-to-br from-emerald-600 to-teal-500 text-white">
            <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">¿Listo para tu próxima cita?</h3>
                <p className="opacity-90 mb-6">Explora miles de servicios y reserva en tu lugar favorito.</p>
                <Button asChild size="lg" variant="secondary" className="bg-white text-emerald-700 hover:bg-gray-100">
                    <Link href="/marketplace">Explorar Marketplace</Link>
                </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Mis Reseñas</CardTitle>
            </CardHeader>
            <CardContent>
                <Button variant="outline" className="w-full" onClick={() => alert('Próximamente')}><Star className="w-4 h-4 mr-2"/>Ver mis reseñas</Button>
            </CardContent>
          </Card>
        </div>
      </div>

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
    <Card className="hover:shadow-lg transition-shadow transform hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
