'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Users,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  CheckCircle,
  XCircle,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'

interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: string
  is_active: boolean
}

interface EmployeeAvailability {
  employee: Employee
  todayStatus: 'available' | 'absent' | 'partial' | 'not_scheduled'
  weeklyHours: number
  scheduledHours: number
  utilizationRate: number
  absences: Absence[]
  todaySchedule?: {
    start_time: string
    end_time: string
  }
}

interface Absence {
  id: string
  absence_date: string
  reason: string
  is_full_day: boolean
  start_time?: string
  end_time?: string
  notes?: string
}

const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function EmployeeMetricsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [employees, setEmployees] = useState<EmployeeAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (authState.user) {
      fetchData()
    }
  }, [authState.user, selectedDate])

  const fetchData = async () => {
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
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)

      // Obtener empleados activos
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessData.id)
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) {
        console.error('Error fetching employees:', employeesError)
        return
      }

      // Para cada empleado, obtener su disponibilidad
      const employeeAvailability = await Promise.all(
        (employeesData || []).map(async (employee) => {
          return await getEmployeeAvailability(employee, new Date(selectedDate))
        })
      )

      setEmployees(employeeAvailability)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEmployeeAvailability = async (employee: Employee, date: Date): Promise<EmployeeAvailability> => {
    const dayOfWeek = date.getDay()
    const dateStr = date.toISOString().split('T')[0]

    // Obtener horario del día
    const { data: scheduleData } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('day_of_week', dayOfWeek)
      .single()

    // Obtener ausencias del día
    const { data: absenceData } = await supabase
      .from('employee_absences')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('absence_date', dateStr)

    // Obtener ausencias de la semana
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const { data: weeklyAbsences } = await supabase
      .from('employee_absences')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('absence_date', startOfWeek.toISOString().split('T')[0])
      .lte('absence_date', endOfWeek.toISOString().split('T')[0])

    // Obtener estadísticas de citas (último mes)
    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('appointment_date', lastMonth.toISOString().split('T')[0])
      .in('status', ['completed', 'confirmed', 'in_progress'])

    // Calcular estado del día
    let todayStatus: 'available' | 'absent' | 'partial' | 'not_scheduled' = 'not_scheduled'

    if (scheduleData && scheduleData.is_available) {
      if (absenceData && absenceData.length > 0) {
        const absence = absenceData[0]
        todayStatus = absence.is_full_day ? 'absent' : 'partial'
      } else {
        todayStatus = 'available'
      }
    }

    // Calcular horas semanales programadas
    const { data: weeklySchedule } = await supabase
      .from('employee_schedules')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('is_available', true)

    const scheduledHours = (weeklySchedule || []).reduce((total, schedule) => {
      const start = new Date(`2024-01-01 ${schedule.start_time}`)
      const end = new Date(`2024-01-01 ${schedule.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return total + hours
    }, 0)

    // Calcular horas trabajadas (basado en citas completadas)
    const weeklyHours = (appointmentsData || []).reduce((total, appointment) => {
      const start = new Date(`2024-01-01 ${appointment.start_time}`)
      const end = new Date(`2024-01-01 ${appointment.end_time}`)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      return total + hours
    }, 0)

    const utilizationRate = scheduledHours > 0 ? (weeklyHours / scheduledHours) * 100 : 0

    return {
      employee,
      todayStatus,
      weeklyHours,
      scheduledHours,
      utilizationRate,
      absences: weeklyAbsences || [],
      todaySchedule: scheduleData ? {
        start_time: scheduleData.start_time,
        end_time: scheduleData.end_time
      } : undefined
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'not_scheduled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Disponible'
      case 'absent': return 'Ausente'
      case 'partial': return 'Ausencia parcial'
      case 'not_scheduled': return 'No programado'
      default: return 'Desconocido'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />
      case 'absent': return <XCircle className="w-4 h-4" />
      case 'partial': return <AlertTriangle className="w-4 h-4" />
      case 'not_scheduled': return <Clock className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const getReasonLabel = (reason: string) => {
    const reasons = {
      'enfermedad': 'Enfermedad',
      'vacaciones': 'Vacaciones',
      'personal': 'Personal',
      'emergencia': 'Emergencia',
      'otro': 'Otro'
    }
    return reasons[reason as keyof typeof reasons] || reason
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  const availableEmployees = employees.filter(e => e.todayStatus === 'available').length
  const absentEmployees = employees.filter(e => e.todayStatus === 'absent').length
  const partialAbsences = employees.filter(e => e.todayStatus === 'partial').length
  const avgUtilization = employees.length > 0
    ? employees.reduce((sum, e) => sum + e.utilizationRate, 0) / employees.length
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header centrado */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/dashboard/business/employees">
            <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-700 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Métricas de Empleados</h1>
            <p className="text-lg text-gray-600">Monitorea disponibilidad y rendimiento del equipo</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 hidden sm:block">Fecha:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-2 border-orange-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-colors w-full sm:w-auto"
            />
          </div>
        </div>
      </div>

      {/* Resumen general */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{availableEmployees}</p>
                  <p className="text-sm text-gray-600">Disponibles hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{absentEmployees}</p>
                  <p className="text-sm text-gray-600">Ausentes hoy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{partialAbsences}</p>
                  <p className="text-sm text-gray-600">Ausencias parciales</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{avgUtilization.toFixed(1)}%</p>
                  <p className="text-sm text-gray-600">Utilización promedio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detalle por empleado */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="border-b bg-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg sm:text-xl mb-1">Estado de Empleados</CardTitle>
                <p className="text-sm text-gray-600 font-normal">
                  {new Date(selectedDate).toLocaleDateString('es-EC', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {employees.map((emp) => (
              <div key={emp.employee.id} className="border-2 border-orange-100 rounded-xl p-4 hover:shadow-md transition-all duration-300 hover:border-orange-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center border-2 border-orange-200">
                      <User className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {emp.employee.first_name} {emp.employee.last_name}
                      </h3>
                      {emp.employee.position && (
                        <p className="text-sm text-orange-600 font-medium">{emp.employee.position}</p>
                      )}
                    </div>
                  </div>

                  <Badge className={`${getStatusColor(emp.todayStatus)} border flex items-center gap-1 whitespace-nowrap`}>
                    {getStatusIcon(emp.todayStatus)}
                    <span>{getStatusLabel(emp.todayStatus)}</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Horario hoy:</span>
                      <p className="font-medium">
                        {emp.todaySchedule
                          ? `${emp.todaySchedule.start_time} - ${emp.todaySchedule.end_time}`
                          : 'No programado'
                        }
                      </p>
                    </div>

                    <div>
                      <span className="text-gray-600">Horas semanales:</span>
                      <p className="font-medium">{emp.scheduledHours.toFixed(1)}h programadas</p>
                    </div>

                    <div>
                      <span className="text-gray-600">Utilización:</span>
                      <p className="font-medium">{emp.utilizationRate.toFixed(1)}%</p>
                    </div>

                    <div>
                      <span className="text-gray-600">Ausencias esta semana:</span>
                      <p className="font-medium">{emp.absences.length}</p>
                    </div>
                  </div>

                {/* Mostrar ausencias si las hay */}
                {emp.absences.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-orange-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Ausencias esta semana:</p>
                    <div className="space-y-2">
                      {emp.absences.map((absence) => (
                        <div key={absence.id} className="text-sm bg-orange-50 rounded-lg p-2 border border-orange-100">
                          <span className="font-medium text-gray-900">
                            {new Date(absence.absence_date).toLocaleDateString('es-EC')}
                          </span>
                          {' - '}
                          <span className="text-orange-700">{getReasonLabel(absence.reason)}</span>
                          {!absence.is_full_day && absence.start_time && absence.end_time && (
                            <span className="text-gray-600"> ({absence.start_time} - {absence.end_time})</span>
                          )}
                          {absence.notes && (
                            <p className="text-gray-500 text-xs mt-1">{absence.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {employees.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <p className="text-gray-600">No hay empleados activos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}