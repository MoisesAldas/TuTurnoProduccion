import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'

interface EmployeeRevenue {
  name: string
  revenue: number
  appointments: number
}

interface WeeklyAppointments {
  day: string
  count: number
}

interface PaymentMethod {
  name: string
  value: number
}

interface ServiceData {
  name: string
  count: number
  percentage: number
}

interface AnalyticsData {
  totalRevenue: number
  totalAppointments: number
  completionRate: number
  revenueTrend: number
  appointmentsTrend: number
  completionTrend: number
  revenueByEmployee: EmployeeRevenue[]
  appointmentsByWeekday: WeeklyAppointments[]
  paymentMethods: PaymentMethod[]
  topServices: ServiceData[]
}

interface UseAnalyticsDataResult {
  data: AnalyticsData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch and process analytics data for business dashboard
 *
 * Fetches:
 * - Total revenue from payments (current month + previous month for trend)
 * - Total appointments (current month + previous month for trend)
 * - Completion rate from completed appointments
 * - Revenue by employee/month (last 3 months)
 * - Appointments by weekday (current week)
 * - Payment methods breakdown
 * - Top 5 services by booking count
 */
export function useAnalyticsData(businessId: string): UseAnalyticsDataResult {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const supabase = createClient()

  const fetchAnalyticsData = useCallback(async () => {
    if (!businessId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const today = new Date()
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 2, 1)
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())

      // Helper to format dates
      const toDateString = (date: Date) => date.toISOString().split('T')[0]

      // 1. Fetch current month payments
      const { data: currentPayments, error: err1 } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          payment_method,
          invoices (
            appointment_id,
            appointments (
              business_id,
              status,
              total_price
            )
          )
        `)
        .eq('invoices.appointments.business_id', businessId)
        .gte('payment_date', toDateString(currentMonth) + 'T00:00:00')
        .lte('payment_date', toDateString(today) + 'T23:59:59')

      if (err1) throw err1

      // 2. Fetch previous month payments (for trend)
      const { data: previousPayments, error: err2 } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          invoices (
            appointments (
              business_id
            )
          )
        `)
        .eq('invoices.appointments.business_id', businessId)
        .gte('payment_date', toDateString(previousMonth) + 'T00:00:00')
        .lte('payment_date', toDateString(currentMonth) + 'T00:00:00')

      if (err2) throw err2

      // 3. Fetch current month appointments
      const { data: currentAppointments, error: err3 } = await supabase
        .from('appointments')
        .select('id, status, appointment_date')
        .eq('business_id', businessId)
        .gte('appointment_date', toDateString(currentMonth))
        .lte('appointment_date', toDateString(today))

      if (err3) throw err3

      // 4. Fetch previous month appointments (for trend)
      const { data: previousAppointments, error: err4 } = await supabase
        .from('appointments')
        .select('id, status')
        .eq('business_id', businessId)
        .gte('appointment_date', toDateString(previousMonth))
        .lte('appointment_date', toDateString(currentMonth))

      if (err4) throw err4

      // 5. Fetch last 3 months data for revenue by employee
      const { data: revenueByPeriod, error: err5 } = await supabase
        .from('payments')
        .select(`
          amount,
          payment_date,
          invoices (
            appointments (
              business_id,
              appointment_date,
              employee_id,
              employees (first_name, last_name)
            )
          )
        `)
        .eq('invoices.appointments.business_id', businessId)
        .gte('payment_date', toDateString(threeMonthsAgo) + 'T00:00:00')
        .lte('payment_date', toDateString(today) + 'T23:59:59')

      if (err5) throw err5

      // 6. Fetch this week's appointments by day
      const { data: weekAppointments, error: err6 } = await supabase
        .from('appointments')
        .select('id, appointment_date')
        .eq('business_id', businessId)
        .gte('appointment_date', toDateString(weekStart))
        .lte('appointment_date', toDateString(today))

      if (err6) throw err6

      // 7. Fetch top services
      const { data: serviceBookings, error: err7 } = await supabase
        .from('appointment_services')
        .select(`
          service_id,
          services (name),
          appointments (
            business_id,
            appointment_date,
            status
          )
        `)
        .eq('appointments.business_id', businessId)
        .gte('appointments.appointment_date', toDateString(threeMonthsAgo))
        .in('appointments.status', ['confirmed', 'completed', 'in_progress'])

      if (err7) throw err7

      // Calculate metrics
      const currentRevenue = (currentPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      const previousRevenue = (previousPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      const revenueTrend = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

      const currentAppCount = currentAppointments?.length || 0
      const previousAppCount = previousAppointments?.length || 0
      const appointmentsTrend = previousAppCount > 0 ? ((currentAppCount - previousAppCount) / previousAppCount) * 100 : 0

      const completedCount = currentAppointments?.filter((a: any) => a.status === 'completed').length || 0
      const completionRate = currentAppCount > 0 ? (completedCount / currentAppCount) * 100 : 0
      const previousCompleted = previousAppointments?.filter((a: any) => a.status === 'completed').length || 0
      const previousCompletion = previousAppCount > 0 ? (previousCompleted / previousAppCount) * 100 : 0
      const completionTrend = (completionRate - previousCompletion)

      // Process revenue by month
      const revenueByMonth: Record<string, { revenue: number; appointments: number }> = {}
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

      // Initialize last 3 months
      for (let i = 2; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const monthName = monthNames[date.getMonth()]
        revenueByMonth[monthName] = { revenue: 0, appointments: 0 }
      }

      // Fill revenue data
      if (revenueByPeriod) {
        const appointmentCounts: Record<string, number> = {}

        revenueByPeriod.forEach((item: any) => {
          const date = new Date(item.payment_date)
          const monthName = monthNames[date.getMonth()]

          if (revenueByMonth[monthName]) {
            revenueByMonth[monthName].revenue += item.amount || 0

            // Count unique appointments per month
            const aptId = item.invoices?.appointments?.id
            if (aptId && !appointmentCounts[`${monthName}-${aptId}`]) {
              appointmentCounts[`${monthName}-${aptId}`] = 1
              revenueByMonth[monthName].appointments += 1
            }
          }
        })
      }

      const revenueByEmployee: EmployeeRevenue[] = Object.entries(revenueByMonth).map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue * 100) / 100,
        appointments: data.appointments,
      }))

      // Process appointments by weekday
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      const appointmentsByWeekday: Record<string, number> = {}
      dayNames.forEach(day => appointmentsByWeekday[day] = 0)

      if (weekAppointments) {
        weekAppointments.forEach((apt: any) => {
          const date = new Date(apt.appointment_date + 'T00:00:00')
          const dayIndex = date.getDay()
          appointmentsByWeekday[dayNames[dayIndex]]++
        })
      }

      const appointmentsByWeekdayData: WeeklyAppointments[] = dayNames.map(day => ({
        day,
        count: appointmentsByWeekday[day],
      }))

      // Process payment methods
      const paymentMethodCounts: Record<string, number> = {}
      paymentMethodCounts['Efectivo'] = 0
      paymentMethodCounts['Transferencia'] = 0

      if (currentPayments) {
        currentPayments.forEach((p: any) => {
          if (p.payment_method === 'cash') {
            paymentMethodCounts['Efectivo'] += p.amount || 0
          } else if (p.payment_method === 'transfer') {
            paymentMethodCounts['Transferencia'] += p.amount || 0
          }
        })
      }

      const paymentMethods: PaymentMethod[] = [
        { name: 'Efectivo', value: Math.round(paymentMethodCounts['Efectivo'] * 100) / 100 },
        { name: 'Transferencia', value: Math.round(paymentMethodCounts['Transferencia'] * 100) / 100 },
      ]

      // Process top services
      const servicesMap: Record<string, number> = {}
      if (serviceBookings) {
        serviceBookings.forEach((item: any) => {
          const serviceName = item.services?.name || 'Sin nombre'
          servicesMap[serviceName] = (servicesMap[serviceName] || 0) + 1
        })
      }

      const totalServices = Object.values(servicesMap).reduce((a, b) => a + b, 0)
      const topServices: ServiceData[] = Object.entries(servicesMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalServices > 0 ? Math.round((count / totalServices) * 100) : 0,
        }))

      setData({
        totalRevenue: currentRevenue,
        totalAppointments: currentAppCount,
        completionRate,
        revenueTrend: Math.round(revenueTrend * 10) / 10,
        appointmentsTrend: Math.round(appointmentsTrend * 10) / 10,
        completionTrend: Math.round(completionTrend * 10) / 10,
        revenueByEmployee,
        appointmentsByWeekday: appointmentsByWeekdayData,
        paymentMethods,
        topServices,
      })
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  return { data, loading, error, refetch: fetchAnalyticsData }
}
