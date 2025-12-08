'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics'
import { StatsCard } from '@/components/StatsCard'
import {
  DashboardFilters,
  TopServicesChart,
  EmployeeRankingChart,
  TimeSlotChart,
  MonthlyAppointmentsChart,
} from '@/components/analytics'
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Star,
  AlertCircle,
} from 'lucide-react'
import { startOfMonth, endOfMonth } from 'date-fns'
import type { DashboardFilters as FiltersType } from '@/types/analytics'
import { createClient } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function BusinessDashboard() {
  const { authState } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Business ID state
  const [businessId, setBusinessId] = useState<string>('')
  const [businessName, setBusinessName] = useState<string>('')
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
          .select('id, name')
          .eq('owner_id', authState.user.id)
          .single()

        if (error) {
          console.error('Error fetching business:', error)
          router.push('/business/setup')
          return
        }

        setBusinessId(data.id)
        setBusinessName(data.name)
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

  // Helper function to convert day abbreviations to full names
  const getDayFullName = (abbr: string): string => {
    const dayMap: Record<string, string> = {
      'Dom': 'Domingo',
      'Lun': 'Lunes',
      'Mar': 'Martes',
      'Mié': 'Miércoles',
      'Jue': 'Jueves',
      'Vie': 'Viernes',
      'Sáb': 'Sábado',
    }
    return dayMap[abbr] || abbr
  }

  // Calculate derived metrics
  const maxWeekday = useMemo(() => {
    if (!data?.appointmentsByWeekday || data.appointmentsByWeekday.length === 0) {
      return { day_name: 'N/A', appointment_count: 0 }
    }
    return data.appointmentsByWeekday.reduce((max, curr) =>
      curr.appointment_count > max.appointment_count ? curr : max
    )
  }, [data?.appointmentsByWeekday])

  const minWeekday = useMemo(() => {
    if (!data?.appointmentsByWeekday || data.appointmentsByWeekday.length === 0) {
      return { day_name: 'N/A', appointment_count: 0 }
    }
    return data.appointmentsByWeekday.reduce((min, curr) =>
      curr.appointment_count < min.appointment_count ? curr : min
    )
  }, [data?.appointmentsByWeekday])

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
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header and Filters - Same Level */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Title */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50 mt-3">
            Dashboard de Análisis
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{businessName}</p>
        </div>

        {/* Filtros con botón de actualizar integrado */}
        <div className="flex-1 lg:max-w-5xl">
          <DashboardFilters
            filters={filters}
            onFiltersChange={setFilters}
            onRefresh={refetch}
            loading={loading}
          />
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Clientes"
          value={data?.uniqueClients?.total_unique_clients?.toString() || '0'}
          description="Clientes únicos en período"
          icon={Users}
          variant="orange"
        />
        <StatsCard
          title="Total Citas"
          value={totalAppointments.toString()}
          description="Citas en período seleccionado"
          icon={Calendar}
          variant="green"
        />
        <StatsCard
          title="Día con Más Citas"
          value={getDayFullName(maxWeekday.day_name)}
          description={`${maxWeekday.appointment_count} citas`}
          icon={TrendingUp}
          variant="blue"
        />
        <StatsCard
          title="Día con Menos Citas"
          value={getDayFullName(minWeekday.day_name)}
          description={`${minWeekday.appointment_count} citas`}
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
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopServicesChart data={data?.topServices || []} loading={loading} />
        <EmployeeRankingChart data={data?.employeeRanking || []} loading={loading} />
      </div>

      {/* Monthly Appointments Chart - Full Width */}
      <MonthlyAppointmentsChart data={data?.appointmentsByMonth || []} loading={loading} />

      {/* Time Slot Chart - Full Width */}
      <TimeSlotChart data={data?.timeSlots || []} loading={loading} />
    </div>
  )
}
