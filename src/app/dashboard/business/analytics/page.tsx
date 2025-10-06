'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { ExportButton } from '@/components/analytics/ExportButton'
import { AnalyticsExportData } from '@/lib/export/types'
import {
  DollarSign,
  Calendar as CalendarIcon,
  Users,
  TrendingUp,
  TrendingDown,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Star,
  CreditCard,
  Banknote,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DateRange {
  from: Date
  to: Date
}

interface SalesReport {
  total_revenue: number
  total_appointments: number
  completed_appointments: number
  cancelled_appointments: number
  total_paid_invoices: number
  total_pending_invoices: number
  average_ticket: number
  total_cash_payments: number
  total_transfer_payments: number
}

interface SalesComparison {
  current_revenue: number
  previous_revenue: number
  revenue_change_percentage: number
  current_appointments: number
  previous_appointments: number
  appointments_change_percentage: number
  current_avg_ticket: number
  previous_avg_ticket: number
  avg_ticket_change_percentage: number
}

interface DailyRevenue {
  date: string
  revenue: number
  appointments_count: number
}

interface EmployeePerformance {
  employee_id: string
  employee_name: string
  total_appointments: number
  completed_appointments: number
  total_revenue: number
  average_ticket: number
  completion_rate: number
}

interface TopService {
  service_id: string
  service_name: string
  times_sold: number
  total_revenue: number
  average_price: number
}

interface PaymentDistribution {
  payment_method: string
  total_amount: number
  transaction_count: number
  percentage: number
}

interface ClientMetrics {
  total_unique_clients: number
  new_clients: number
  returning_clients: number
  walk_in_clients: number
}

const PAYMENT_COLORS = {
  cash: '#ea580c',
  transfer: '#16a34a',
}

export default function AnalyticsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('Mi Negocio')
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  // Data states
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
  const [salesComparison, setSalesComparison] = useState<SalesComparison | null>(null)
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [employeePerformance, setEmployeePerformance] = useState<EmployeePerformance[]>([])
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [paymentDistribution, setPaymentDistribution] = useState<PaymentDistribution[]>([])
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(null)
  const [cancellationRate, setCancellationRate] = useState<number>(0)

  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchBusinessId()
  }, [])

  useEffect(() => {
    if (businessId) {
      fetchAnalyticsData()
    }
  }, [businessId, dateRange])

  const fetchBusinessId = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: business } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()

      if (business) {
        setBusinessId(business.id)
        setBusinessName(business.name || 'Mi Negocio')
      }
    } catch (error) {
      console.error('Error fetching business:', error)
    }
  }

  const fetchAnalyticsData = async () => {
    if (!businessId) return

    try {
      setLoading(true)

      const startDate = format(dateRange.from, 'yyyy-MM-dd')
      const endDate = format(dateRange.to, 'yyyy-MM-dd')

      // Calcular período anterior (mismo número de días)
      const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
      const previousStart = subDays(dateRange.from, daysDiff)
      const previousEnd = subDays(dateRange.to, daysDiff)
      const previousStartDate = format(previousStart, 'yyyy-MM-dd')
      const previousEndDate = format(previousEnd, 'yyyy-MM-dd')

      // Sales Report
      const { data: salesData } = await supabase.rpc('get_business_sales_report', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (salesData && salesData.length > 0) {
        setSalesReport(salesData[0])

        // Calcular tasa de cancelación
        const total = salesData[0].total_appointments || 1
        const cancelled = salesData[0].cancelled_appointments || 0
        setCancellationRate((cancelled / total) * 100)
      }

      // Sales Comparison (período actual vs anterior)
      const { data: previousSalesData } = await supabase.rpc('get_business_sales_report', {
        p_business_id: businessId,
        p_start_date: previousStartDate,
        p_end_date: previousEndDate,
      })

      if (salesData && salesData.length > 0 && previousSalesData && previousSalesData.length > 0) {
        const current = salesData[0]
        const previous = previousSalesData[0]

        const revenueChange = previous.total_revenue > 0
          ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100
          : 0

        const appointmentsChange = previous.total_appointments > 0
          ? ((current.total_appointments - previous.total_appointments) / previous.total_appointments) * 100
          : 0

        const avgTicketChange = previous.average_ticket > 0
          ? ((current.average_ticket - previous.average_ticket) / previous.average_ticket) * 100
          : 0

        setSalesComparison({
          current_revenue: current.total_revenue,
          previous_revenue: previous.total_revenue,
          revenue_change_percentage: revenueChange,
          current_appointments: current.total_appointments,
          previous_appointments: previous.total_appointments,
          appointments_change_percentage: appointmentsChange,
          current_avg_ticket: current.average_ticket,
          previous_avg_ticket: previous.average_ticket,
          avg_ticket_change_percentage: avgTicketChange,
        })
      }

      // Daily Revenue
      const { data: dailyData } = await supabase.rpc('get_daily_revenue', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (dailyData) {
        setDailyRevenue(dailyData)
      }

      // Employee Performance
      const { data: employeeData } = await supabase.rpc('get_employee_performance', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (employeeData) {
        setEmployeePerformance(employeeData)
      }

      // Top Services
      const { data: servicesData } = await supabase.rpc('get_top_services', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_limit: 5,
      })
      if (servicesData) {
        setTopServices(servicesData)
      }

      // Payment Distribution
      const { data: paymentData } = await supabase.rpc('get_payment_methods_distribution', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (paymentData) {
        setPaymentDistribution(paymentData)
      }

      // Client Metrics
      const { data: clientData } = await supabase.rpc('get_client_metrics', {
        p_business_id: businessId,
        p_start_date: startDate,
        p_end_date: endDate,
      })
      if (clientData && clientData.length > 0) {
        setClientMetrics(clientData[0])
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast({
        variant: 'destructive',
        title: 'Error al cargar analytics',
        description: 'No se pudieron cargar los datos analíticos.',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const setQuickRange = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    })
  }

  // Prepare export data in a memoized format
  const exportData: AnalyticsExportData = useMemo(() => ({
    businessName,
    reportPeriod: `${format(dateRange.from, 'dd MMM yyyy', { locale: es })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: es })}`,
    generatedDate: format(new Date(), "dd 'de' MMMM yyyy 'a las' HH:mm", { locale: es }),
    summary: {
      totalRevenue: salesReport?.total_revenue || 0,
      totalAppointments: salesReport?.total_appointments || 0,
      completedAppointments: salesReport?.completed_appointments || 0,
      cancelledAppointments: salesReport?.cancelled_appointments || 0,
      averageTicket: salesReport?.average_ticket || 0,
      uniqueClients: clientMetrics?.total_unique_clients || 0,
      completionRate: salesReport?.total_appointments
        ? `${((salesReport.completed_appointments / salesReport.total_appointments) * 100).toFixed(1)}%`
        : '0%'
    },
    dailyRevenue: dailyRevenue.map(d => ({
      date: format(new Date(d.date), 'dd/MM/yyyy', { locale: es }),
      revenue: d.revenue,
      appointments_count: d.appointments_count
    })),
    employees: employeePerformance,
    services: topServices,
    payments: paymentDistribution
  }), [
    businessName,
    dateRange,
    salesReport,
    clientMetrics,
    dailyRevenue,
    employeePerformance,
    topServices,
    paymentDistribution
  ])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading && !salesReport) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    )
  }

  const completionRate = salesReport?.total_appointments
    ? ((salesReport.completed_appointments / salesReport.total_appointments) * 100).toFixed(1)
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in slide-in-from-top-4 duration-700">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600">
            {format(dateRange.from, 'dd MMM', { locale: es })} - {format(dateRange.to, 'dd MMM yyyy', { locale: es })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(7)}
            className="transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            7 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickRange(30)}
            className="transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            30 días
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDateRange({
                from: startOfMonth(new Date()),
                to: endOfMonth(new Date()),
              })
            }
            className="transition-all duration-300 hover:scale-105 hover:shadow-md"
          >
            Este mes
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="transition-all duration-300 hover:scale-105 hover:shadow-md">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 animate-in zoom-in-95 duration-200" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to })
                  }
                }}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <ExportButton
            data={exportData}
            filename={`analytics-${format(new Date(), 'yyyy-MM-dd')}`}
            variant="default"
            size="sm"
            disabled={loading || !salesReport}
            className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Revenue Card */}
        <Card className="relative overflow-hidden border hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-100 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-150" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              {salesComparison && (
                <Badge className={`transition-all duration-300 group-hover:scale-110 ${
                  salesComparison.revenue_change_percentage >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {salesComparison.revenue_change_percentage >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(salesComparison.revenue_change_percentage).toFixed(1)}%
                </Badge>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 transition-all duration-300 group-hover:text-green-600">
              {formatCurrency(salesReport?.total_revenue || 0)}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {salesReport?.total_paid_invoices || 0} facturas pagadas
            </p>
            {salesComparison && (
              <p className="text-xs text-gray-500 mt-1">
                vs {formatCurrency(salesComparison.previous_revenue)} período anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* Appointments Card */}
        <Card className="relative overflow-hidden border hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-150" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              {salesComparison && (
                <Badge className={`transition-all duration-300 group-hover:scale-110 ${
                  salesComparison.appointments_change_percentage >= 0
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {salesComparison.appointments_change_percentage >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(salesComparison.appointments_change_percentage).toFixed(1)}%
                </Badge>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 transition-all duration-300 group-hover:text-blue-600">
              {salesReport?.total_appointments || 0}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {salesReport?.completed_appointments || 0} completadas · {salesReport?.cancelled_appointments || 0} canceladas
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                cancellationRate < 10 ? 'bg-green-100 text-green-700' :
                cancellationRate < 20 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {cancellationRate < 20 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                <span className="font-medium">{cancellationRate.toFixed(1)}% cancelación</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Ticket Card */}
        <Card className="relative overflow-hidden border hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-150" />
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              {salesComparison && (
                <Badge className={`transition-all duration-300 group-hover:scale-110 ${
                  salesComparison.avg_ticket_change_percentage >= 0
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {salesComparison.avg_ticket_change_percentage >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(salesComparison.avg_ticket_change_percentage).toFixed(1)}%
                </Badge>
              )}
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 transition-all duration-300 group-hover:text-orange-600">
              {formatCurrency(salesReport?.average_ticket || 0)}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Ticket promedio por cita
            </p>
            {salesComparison && (
              <p className="text-xs text-gray-500 mt-1">
                vs {formatCurrency(salesComparison.previous_avg_ticket)} período anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* Clients Card */}
        <Card className="relative overflow-hidden border hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-400 group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -mr-16 -mt-16 transition-all duration-500 group-hover:scale-150" />
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Users className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 transition-all duration-300 group-hover:scale-110">
                Únicos
              </Badge>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 transition-all duration-300 group-hover:text-purple-600">
              {clientMetrics?.total_unique_clients || 0}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {clientMetrics?.new_clients || 0} nuevos este período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Revenue Trend */}
        <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-in slide-in-from-left-8 fade-in duration-700 delay-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold transition-colors duration-300 group-hover:text-orange-600">Tendencia de Ingresos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Evolución diaria en el período</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-6">
            {dailyRevenue.length > 0 ? (
              <div className="animate-in fade-in duration-1000 delay-700">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyRevenue.map(d => ({
                    fecha: format(new Date(d.date), 'dd MMM', { locale: es }),
                    Ingresos: d.revenue,
                    Citas: d.appointments_count,
                  }))}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'Ingresos') return formatCurrency(Number(value))
                        return value
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '13px' }} />
                    <Line
                      type="monotone"
                      dataKey="Ingresos"
                      stroke="#ea580c"
                      strokeWidth={3}
                      dot={{ fill: '#ea580c', r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="Ingresos (US$)"
                      animationDuration={1500}
                    />
                    <Line
                      type="monotone"
                      dataKey="Citas"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={{ fill: '#16a34a', r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="Citas"
                      animationDuration={1500}
                      animationBegin={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">No hay datos de ingresos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-in slide-in-from-right-8 fade-in duration-700 delay-500 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold transition-colors duration-300 group-hover:text-orange-600">Métodos de Pago</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Distribución de ingresos</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent className="px-2 sm:px-6 pb-6">
            {paymentDistribution.length > 0 ? (
              <div className="animate-in fade-in duration-1000 delay-700">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ payment_method, percentage }) => {
                        return `${percentage.toFixed(0)}%`
                      }}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="total_amount"
                      animationDuration={1500}
                      animationBegin={500}
                    >
                      {paymentDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.payment_method === 'cash' ? PAYMENT_COLORS.cash : PAYMENT_COLORS.transfer}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: string, props: any) => {
                        const methodLabel = props.payload.payment_method === 'cash' ? 'Efectivo' : 'Transferencia'
                        return [formatCurrency(Number(value)), methodLabel]
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Leyenda personalizada */}
                <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-600"></div>
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Efectivo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-600"></div>
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Transferencia</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">No hay datos de pagos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Employees */}
        <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-in slide-in-from-left-8 fade-in duration-700 delay-600 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold transition-colors duration-300 group-hover:text-orange-600">Top Empleados</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Ranking por ingresos generados</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent>
            {employeePerformance.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {employeePerformance.slice(0, 5).map((emp, index) => (
                  <div
                    key={emp.employee_id}
                    className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105 animate-in slide-in-from-left-4 fade-in duration-500"
                    style={{ animationDelay: `${800 + index * 100}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        index === 0 ? 'bg-yellow-100 hover:bg-yellow-200' : index === 1 ? 'bg-gray-100 hover:bg-gray-200' : index === 2 ? 'bg-orange-100 hover:bg-orange-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        {index === 0 ? (
                          <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                        ) : (
                          <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
                        )}
                      </div>
                      <Avatar className="w-8 h-8 sm:w-10 sm:h-10 transition-all duration-300 hover:scale-110">
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs sm:text-sm font-medium">
                          {getInitials(emp.employee_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{emp.employee_name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {emp.completed_appointments} citas · {emp.completion_rate.toFixed(1)}% completadas
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-gray-900">{formatCurrency(emp.total_revenue)}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{formatCurrency(emp.average_ticket)} prom.</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">No hay datos de empleados</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 animate-in slide-in-from-right-8 fade-in duration-700 delay-600 group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-semibold transition-colors duration-300 group-hover:text-orange-600">Servicios Estrella</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Más vendidos del período</CardDescription>
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 hover:scale-110">
              <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </button>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {topServices.map((service, index) => (
                  <div
                    key={service.service_id}
                    className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 transition-all duration-300 hover:scale-105 animate-in slide-in-from-right-4 fade-in duration-500"
                    style={{ animationDelay: `${800 + index * 100}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        index === 0 ? 'bg-orange-100 hover:bg-orange-200' : 'bg-gray-50 hover:bg-gray-100'
                      }`}>
                        {index === 0 ? (
                          <Star className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600" />
                        ) : (
                          <span className="text-xs font-bold text-gray-600">#{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-gray-900 truncate">{service.service_name}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                          {service.times_sold} veces · {formatCurrency(service.average_price)} promedio
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-xs sm:text-sm text-gray-900">{formatCurrency(service.total_revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">No hay datos de servicios</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
