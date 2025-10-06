'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, DollarSign, TrendingUp, BarChart3, MoreVertical, AlertCircle, FileText, Bell, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
}

interface AppointmentWithDetails {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  total_price: number
  users?: {
    first_name: string
    last_name: string
    phone?: string
  }
  employees?: {
    first_name: string
    last_name: string
  }
  appointment_services?: Array<{
    services?: {
      name: string
    }
  }>
}

interface SalesData {
  date: string
  ventas: number
  citas: number
}

interface TopService {
  name: string
  count: number
  revenue: number
}

interface PendingAction {
  id: string
  type: 'appointment' | 'invoice' | 'notification'
  title: string
  description: string
  date?: string
  priority: 'high' | 'medium' | 'low'
}

export default function BusinessDashboard() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithDetails[]>([])
  const [todayAppointments, setTodayAppointments] = useState<AppointmentWithDetails[]>([])
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [salesStats, setSalesStats] = useState({ total: 0, count: 0, average: 0 })
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const { authState } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      fetchDashboardData()
    }
  }, [authState.user])

  const fetchDashboardData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener información del negocio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        window.location.href = '/auth/business/setup'
        return
      }

      setBusiness(businessData)

      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      // Obtener ventas reales de payments (últimos 7 días)
      const { data: recentPayments, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          invoices!inner (
            appointment_id,
            appointments!inner (
              appointment_date,
              business_id
            )
          )
        `)
        .eq('invoices.appointments.business_id', businessData.id)
        .gte('payment_date', sevenDaysAgoStr + 'T00:00:00')
        .lte('payment_date', today + 'T23:59:59')
        .order('payment_date', { ascending: true })

      if (!paymentsError && recentPayments) {
        // Procesar datos para el gráfico
        const salesByDate: Record<string, { ventas: number; citas: number }> = {}
        const processedAppointments = new Set()

        recentPayments.forEach((payment: any) => {
          const paymentDate = new Date(payment.payment_date).toISOString().split('T')[0]
          const appointmentId = payment.invoices?.appointment_id

          if (!salesByDate[paymentDate]) {
            salesByDate[paymentDate] = { ventas: 0, citas: 0 }
          }

          salesByDate[paymentDate].ventas += payment.amount || 0

          // Contar solo una vez por appointment
          if (appointmentId && !processedAppointments.has(appointmentId)) {
            salesByDate[paymentDate].citas += 1
            processedAppointments.add(appointmentId)
          }
        })

        // Convertir a array y ordenar
        const chartData: SalesData[] = Object.keys(salesByDate)
          .sort()
          .map((date) => ({
            date: new Date(date).toLocaleDateString('es-EC', { month: 'short', day: 'numeric' }),
            ventas: salesByDate[date].ventas,
            citas: salesByDate[date].citas,
          }))

        setSalesData(chartData)

        // Calcular estadísticas de ventas
        const totalSales = recentPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)
        const totalCount = processedAppointments.size
        const avgSale = totalCount > 0 ? totalSales / totalCount : 0

        setSalesStats({
          total: totalSales,
          count: totalCount,
          average: avgSale,
        })
      }

      // Obtener servicios más solicitados (últimos 30 días)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: serviceStats, error: servicesError } = await supabase
        .from('appointment_services')
        .select(`
          price,
          service_id,
          services!inner (
            name
          ),
          appointments!inner (
            business_id,
            appointment_date,
            status
          )
        `)
        .eq('appointments.business_id', businessData.id)
        .gte('appointments.appointment_date', thirtyDaysAgoStr)
        .in('appointments.status', ['confirmed', 'completed'])

      if (!servicesError && serviceStats) {
        // Agrupar por servicio
        const servicesMap: Record<string, { count: number; revenue: number }> = {}

        serviceStats.forEach((item: any) => {
          const serviceName = item.services?.name || 'Sin nombre'
          if (!servicesMap[serviceName]) {
            servicesMap[serviceName] = { count: 0, revenue: 0 }
          }
          servicesMap[serviceName].count += 1
          servicesMap[serviceName].revenue += item.price || 0
        })

        // Convertir a array y ordenar por cantidad
        const topServicesArray = Object.entries(servicesMap)
          .map(([name, stats]) => ({
            name,
            count: stats.count,
            revenue: stats.revenue
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5) // Top 5 servicios

        setTopServices(topServicesArray)
      }

      // Obtener próximas citas (próximos 7 días)
      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]

      const { data: upcomingData, error: upcomingError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          total_price,
          users (first_name, last_name, phone),
          employees (first_name, last_name),
          appointment_services (
            services (name)
          )
        `)
        .eq('business_id', businessData.id)
        .gte('appointment_date', today)
        .lte('appointment_date', sevenDaysLaterStr)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5)

      if (!upcomingError && upcomingData) {
        setUpcomingAppointments(upcomingData as any)
      }

      // Obtener citas de hoy
      const { data: todayData, error: todayError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          total_price,
          users (first_name, last_name, phone),
          employees (first_name, last_name),
          appointment_services (
            services (name)
          )
        `)
        .eq('business_id', businessData.id)
        .eq('appointment_date', today)
        .order('start_time', { ascending: true })

      if (!todayError && todayData) {
        setTodayAppointments(todayData as any)
      }

      // Obtener acciones pendientes
      const actions: PendingAction[] = []

      // 1. Citas pendientes de confirmar
      const { data: pendingAppointments } = await supabase
        .from('appointments')
        .select('id, appointment_date, start_time, users(first_name, last_name), walk_in_client_name')
        .eq('business_id', businessData.id)
        .eq('status', 'pending')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .limit(5)

      if (pendingAppointments) {
        pendingAppointments.forEach((apt: any) => {
          const clientName = apt.users
            ? `${apt.users.first_name} ${apt.users.last_name}`
            : apt.walk_in_client_name || 'Cliente'

          actions.push({
            id: apt.id,
            type: 'appointment',
            title: 'Cita pendiente de confirmar',
            description: `${clientName} - ${formatDate(apt.appointment_date)} ${apt.start_time.substring(0, 5)}`,
            date: apt.appointment_date,
            priority: 'high'
          })
        })
      }

      // 2. Facturas pendientes
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total,
          created_at,
          appointments!inner (
            business_id,
            appointment_date,
            users(first_name, last_name),
            walk_in_client_name
          )
        `)
        .eq('appointments.business_id', businessData.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

      if (pendingInvoices) {
        pendingInvoices.forEach((inv: any) => {
          const clientName = inv.appointments?.users
            ? `${inv.appointments.users.first_name} ${inv.appointments.users.last_name}`
            : inv.appointments?.walk_in_client_name || 'Cliente'

          actions.push({
            id: inv.id,
            type: 'invoice',
            title: 'Factura pendiente de pago',
            description: `${clientName} - ${inv.invoice_number} (${formatPrice(inv.total)})`,
            date: inv.created_at,
            priority: 'medium'
          })
        })
      }

      // 3. Notificaciones no leídas
      if (authState.user) {
        const { data: unreadNotifications } = await supabase
          .from('notifications')
          .select('id, title, message, created_at')
          .eq('user_id', authState.user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(3)

        if (unreadNotifications) {
          unreadNotifications.forEach((notif: any) => {
            actions.push({
              id: notif.id,
              type: 'notification',
              title: notif.title,
              description: notif.message,
              date: notif.created_at,
              priority: 'low'
            })
          })
        }
      }

      // Ordenar por prioridad
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
      setPendingActions(actions.slice(0, 8)) // Máximo 8 acciones

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('es-EC', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
    }

    const labels: Record<string, string> = {
      confirmed: 'Confirmada',
      pending: 'Pendiente',
      cancelled: 'Cancelada',
      completed: 'Completada',
    }

    return (
      <Badge className={`${colors[status] || colors.pending} border`}>
        {labels[status] || status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="w-5 h-5" />
      case 'invoice':
        return <FileText className="w-5 h-5" />
      case 'notification':
        return <Bell className="w-5 h-5" />
      default:
        return <AlertCircle className="w-5 h-5" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50/50'
      case 'medium':
        return 'border-l-orange-500 bg-orange-50/50'
      case 'low':
        return 'border-l-blue-500 bg-blue-50/50'
      default:
        return 'border-l-gray-500 bg-gray-50/50'
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Acciones Pendientes */}
      {pendingActions.length > 0 && (
        <Card className="border-t-4 border-t-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="border-b bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-semibold">Acciones Pendientes</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Requieren tu atención</CardDescription>
                </div>
              </div>
              <Badge className="bg-orange-600 text-white hover:bg-orange-700">
                {pendingActions.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingActions.map((action) => (
                <div
                  key={action.id}
                  className={`flex items-start gap-3 p-3 sm:p-4 border-l-4 rounded-lg hover:shadow-md transition-all cursor-pointer ${getPriorityColor(action.priority)}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    action.type === 'appointment' ? 'bg-blue-100 text-blue-600' :
                    action.type === 'invoice' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {getActionIcon(action.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 mb-1 truncate">{action.title}</p>
                    <p className="text-xs text-gray-600 line-clamp-2">{action.description}</p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-gray-400 hover:text-green-600 transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid 2x2 Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Ventas Recientes con Gráfico */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Ventas recientes</CardTitle>
              <CardDescription>Últimos 7 días</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">{formatPrice(salesStats.total)}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>Citas: <strong>{salesStats.count}</strong></span>
                <span>Valor promedio: <strong>{formatPrice(salesStats.average)}</strong></span>
              </div>
            </div>

            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="#9ca3af"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="#ea580c"
                    strokeWidth={2}
                    dot={{ fill: '#ea580c', r: 4 }}
                    name="Ventas (US$)"
                  />
                  <Line
                    type="monotone"
                    dataKey="citas"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: '#16a34a', r: 4 }}
                    name="Citas"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-400">No hay datos de ventas aún</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Próximas Citas */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Próximas citas</CardTitle>
              <CardDescription>Próximos 7 días</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tu calendario está vacío
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Reserva algunas citas para que aparezcan datos en el calendario
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-center min-w-[60px]">
                        <p className="text-xs font-medium text-gray-600">{formatDate(apt.appointment_date)}</p>
                        <p className="text-sm font-semibold text-gray-900">{apt.start_time.substring(0, 5)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {apt.users?.first_name} {apt.users?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {apt.appointment_services?.[0]?.services?.name || 'Sin servicio'}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(apt.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Servicios más solicitados */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Servicios más solicitados</CardTitle>
              <CardDescription>Últimos 30 días</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  Sin datos aún
                </h3>
                <p className="text-sm text-gray-500">
                  Completa algunas citas para ver estadísticas
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topServices.map((service, index) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-600 to-amber-600 text-white font-bold rounded-lg shadow-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{service.name}</p>
                        <p className="text-xs text-gray-600">
                          {service.count} {service.count === 1 ? 'cita' : 'citas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-600">{formatPrice(service.revenue)}</p>
                      <p className="text-xs text-gray-500">ingresos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Próximas citas de hoy */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-semibold">Próximas citas de hoy</CardTitle>
              <CardDescription>{new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  No hay citas hoy
                </h3>
                <p className="text-sm text-gray-500">
                  Disfruta tu día libre
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-700">{apt.start_time.substring(0, 5)}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {apt.users?.first_name} {apt.users?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {apt.appointment_services?.[0]?.services?.name || 'Sin servicio'}
                        </p>
                        <p className="text-xs text-gray-400">
                          con {apt.employees?.first_name} {apt.employees?.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(apt.status)}
                      <p className="text-xs text-gray-500 mt-1">{formatPrice(apt.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
