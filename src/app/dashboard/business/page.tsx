'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics'
import { useScrollPosition } from '@/hooks/useScrollPosition'
import { StatsCard } from '@/components/StatsCard'
import {
  CompactFilters,
  TopServicesChart,
  EmployeeRankingChart,
  TimeSlotChart,
  MonthlyAppointmentsChart,
  WeekdayAppointmentsChart,
  // Revenue charts (NEW)
  PaymentMethodsPieChart,
  DailyRevenueLineChart,
  MonthlyRevenueBarChart,
  EmployeeRevenueBarChart,
  formatCurrency,
  // Export functionality
  ExportButton,
} from '@/components/analytics'
import { DataProcessor } from '@/lib/export/core/DataProcessor'
import type { BusinessInfo } from '@/lib/export/types'
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Star,
  AlertCircle,
  DollarSign,
  Receipt,
  BarChart3,
} from 'lucide-react'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type { DashboardFilters as FiltersType } from '@/types/analytics'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { translateDateLabel } from '@/lib/dateUtils'
import { cn } from '@/lib/utils'

export default function BusinessDashboard() {
  const { authState } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Business ID state
  const [businessId, setBusinessId] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null)
  const [loadingBusiness, setLoadingBusiness] = useState(true)

  // Default filters: Este mes completo
  const [filters, setFilters] = useState<FiltersType>({
    period: 'month',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  })

  // Fetch business data
  useEffect(() => {
    const fetchBusiness = async () => {
      if (!authState.user) return

      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('id, name, logo_url, address, phone, email')
          .eq('owner_id', authState.user.id)
          .single()

        if (error) {
          console.error('Error fetching business:', error)
          router.push('/business/setup')
          return
        }

        setBusinessId(data.id)
        setBusinessName(data.name)

        // Preparar BusinessInfo para exportación
        const userName = (authState.user as any).user_metadata?.full_name || authState.user.email || 'Propietario'
        setBusinessInfo({
          id: data.id,
          name: data.name,
          category: 'Servicios Profesionales', // Default category
          logoUrl: data.logo_url || null,
          ownerName: userName,
          address: data.address || undefined,
          phone: data.phone || undefined,
          email: data.email || undefined,
        })
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoadingBusiness(false)
      }
    }

    fetchBusiness()
  }, [authState.user, supabase, router])

  // Fetch analytics data
  const { data, loading, error, refetch } = useDashboardAnalytics(businessId, filters)

  // Calculate derived metrics - Daily stats (specific calendar days)
  const maxDay = useMemo(() => {
    if (!data?.dailyStats || data.dailyStats.length === 0) {
      return { date_label: 'N/A', appointment_count: 0 }
    }
    // dailyStats is already sorted DESC by appointment_count, so first item is max
    return data.dailyStats[0]
  }, [data?.dailyStats])

  const minDay = useMemo(() => {
    if (!data?.dailyStats || data.dailyStats.length === 0) {
      return { date_label: 'N/A', appointment_count: 0 }
    }
    // Last item in the sorted array is min
    return data.dailyStats[data.dailyStats.length - 1]
  }, [data?.dailyStats])

  const maxMonth = useMemo(() => {
    if (!data?.appointmentsByMonth || data.appointmentsByMonth.length === 0) {
      return { month_label: 'N/A', appointment_count: 0 }
    }
    return data.appointmentsByMonth.reduce((max, curr) =>
      curr.appointment_count > max.appointment_count ? curr : max
    )
  }, [data?.appointmentsByMonth])

  const totalAppointments = useMemo(() => {
    return data?.kpis?.total_appointments || 0
  }, [data?.kpis])

  // Preparar datos para exportación
  const exportData = useMemo(() => {
    if (!data || !businessInfo) return null

    return DataProcessor.process({
      dashboardData: data,
      businessInfo: businessInfo,
      startDate: filters.startDate,
      endDate: filters.endDate,
    })
  }, [data, businessInfo, filters.startDate, filters.endDate])

  // Use scroll position for sticky header (MUST be before any conditional returns)
  const scrolled = useScrollPosition(80)

  // Loading state
  if (loadingBusiness || (loading && !data)) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto dark:border-orange-900 dark:border-t-orange-500"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando analytics...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Card className="dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="font-medium">Error al cargar datos</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {error.message || 'Ocurrió un error al cargar los datos del dashboard'}
                </p>
              </div>
            </div>
            <Button onClick={refetch} className="mt-4" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sticky Header */}
      <div className={cn(
        "sticky top-0 z-50 transition-all duration-300 ease-in-out",
        scrolled 
          ? "bg-gray-900 shadow-lg py-2" 
          : "bg-white dark:bg-gray-900 py-4 shadow-sm"
      )}>
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title (hidden when scrolled on mobile) */}
            <div className={cn(
              "transition-all duration-300",
              scrolled ? "hidden sm:block" : "block"
            )}>
              <h1 className={cn(
                "font-bold transition-all duration-300",
                scrolled 
                  ? "text-lg text-white" 
                  : "text-2xl sm:text-3xl text-gray-900 dark:text-gray-50"
              )}>
                {scrolled ? "Dashboard" : "Dashboard de análisis"}
              </h1>
              {!scrolled && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{businessName}</p>
              )}
            </div>

            {/* Center/Right: Filters */}
            <div className="flex items-center gap-2 flex-1 justify-end">
              <CompactFilters
                filters={filters}
                onFiltersChange={setFilters}
                onRefresh={refetch}
                loading={loading}
                compact={scrolled}
              />
              
              {/* Export Button */}
              {exportData && (
                <ExportButton
                  data={exportData}
                  filename={`reporte-${businessName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`}
                  variant="outline"
                  size={scrolled ? "icon" : "default"}
                  className={cn(
                    "transition-all",
                    scrolled 
                      ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700" 
                      : "hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:hover:bg-orange-900/50"
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-6">
        {/* 5-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT AREA: Charts (4/5 width on desktop) */}
          <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">
            
            {/* ========================================
                ANÁLISIS DE INGRESOS
                ======================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Análisis de Ingresos
                </h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <DailyRevenueLineChart 
                  data={data?.dailyRevenue || []} 
                  loading={loading} 
                  error={error}
                />
                <PaymentMethodsPieChart 
                  data={data?.paymentMethods || []} 
                  loading={loading} 
                  error={error}
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <MonthlyRevenueBarChart 
                  data={data?.monthlyRevenue || []} 
                  loading={loading} 
                  error={error}
                />
                <TopServicesChart 
                  data={data?.topServices || []} 
                  loading={loading} 
                  error={error}
                />
              </div>
            </div>

            {/* ========================================
                RENDIMIENTO DE SERVICIOS Y EQUIPO
                ======================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <Users className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Servicios y Equipo
                </h2>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <EmployeeRankingChart 
                  data={data?.employeeRanking || []} 
                  loading={loading} 
                  error={error} 
                />
                <EmployeeRevenueBarChart 
                  data={data?.employeeRevenue || []} 
                  loading={loading} 
                  error={error}
                />
              </div>
            </div>

            {/* ========================================
                DISTRIBUCIÓN TEMPORAL
                ======================================== */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Distribución Temporal
                </h2>
              </div>

              {/* Weekday and Timeslot side by side */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <WeekdayAppointmentsChart 
                  data={data?.appointmentsByWeekday || []} 
                  loading={loading} 
                  error={error} 
                />
                <TimeSlotChart 
                  data={data?.timeSlots || []} 
                  loading={loading} 
                  error={error} 
                />
              </div>

              <MonthlyAppointmentsChart 
                data={data?.monthlyRevenue || []} 
                loading={loading} 
                error={error} 
              />
            </div>
          </div>

          {/* RIGHT SIDEBAR: KPIs (1/3 width on desktop) */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Section Header */}
              <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                  Indicadores Clave
                </h2>
              </div>

              {/* KPIs Stack */}
              <div className="space-y-3">
                {/* Métricas Generales */}
                <StatsCard
                  title="Total Clientes"
                  value={data?.uniqueClients?.total_unique_clients?.toString() || '0'}
                  description="Únicos en período"
                  icon={Users}
                  variant="orange"
                />
                <StatsCard
                  title="Total Citas"
                  value={totalAppointments.toString()}
                  description="En período"
                  icon={Calendar}
                  variant="green"
                />
                <StatsCard
                  title="Tasa de Completitud"
                  value={`${data?.kpis?.completion_rate?.toFixed(1) || '0'}%`}
                  description="Citas completadas"
                  icon={TrendingUp}
                  variant="blue"
                />
                <StatsCard
                  title="Ingresos Totales"
                  value={formatCurrency(data?.revenueAnalytics?.total_revenue || 0)}
                  description="Facturado"
                  icon={DollarSign}
                  variant="purple"
                />
                <StatsCard
                  title="Ticket Promedio"
                  value={formatCurrency(data?.revenueAnalytics?.average_ticket || 0)}
                  description={`${data?.revenueAnalytics?.total_invoices || 0} facturas`}
                  icon={Receipt}
                  variant="orange"
                />

                {/* Divider */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

                {/* Mejores Períodos */}
                <StatsCard
                  title="Día con Más Citas"
                  value={maxDay.date_label}
                  description={`${maxDay.appointment_count} citas`}
                  icon={TrendingUp}
                  variant="green"
                />
                <StatsCard
                  title="Día con Menos Citas"
                  value={minDay.date_label}
                  description={`${minDay.appointment_count} citas`}
                  icon={TrendingDown}
                  variant="red"
                />
                <StatsCard
                  title="Mes con Más Citas"
                  value={maxMonth.month_label}
                  description={`${maxMonth.appointment_count} citas`}
                  icon={Star}
                  variant="orange"
                />
                <StatsCard
                  title="Día con Más Ventas"
                  value={translateDateLabel(data?.revenueAnalytics?.best_day_label || 'N/A')}
                  description={formatCurrency(data?.revenueAnalytics?.best_day_revenue || 0)}
                  icon={DollarSign}
                  variant="blue"
                />
                <StatsCard
                  title="Mes con Más Ventas"
                  value={translateDateLabel(data?.revenueAnalytics?.best_month_label || 'N/A')}
                  description={formatCurrency(data?.revenueAnalytics?.best_month_revenue || 0)}
                  icon={Calendar}
                  variant="purple"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
