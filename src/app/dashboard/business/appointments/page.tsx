'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeAppointments } from '@/hooks/useRealtimeAppointments'
import { parseDateString, toDateString } from '@/lib/dateUtils'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Calendar, ChevronLeft, ChevronRight, Plus, Settings, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Business, Employee, Appointment } from '@/types/database'

// Lazy load modals and calendar view for better performance
const CalendarView = dynamic(() => import('@/components/CalendarView'), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando calendario...</p>
      </div>
    </div>
  )
})

const MonthCalendarView = dynamic(() => import('@/components/MonthCalendarView'), {
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando calendario...</p>
      </div>
    </div>
  )
})

const CreateAppointmentModal = dynamic(() => import('@/components/CreateAppointmentModal'), {
  loading: () => <div className="text-center p-4">Cargando...</div>
})

const AppointmentModal = dynamic(() => import('@/components/AppointmentModal'), {
  loading: () => <div className="text-center p-4">Cargando...</div>
})

// Tipo simplificado para los empleados en la vista del calendario
type CalendarEmployee = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>;

export default function AppointmentsPage() {
  const searchParams = useSearchParams()
  const [business, setBusiness] = useState<Business | null>(null)
  const [employees, setEmployees] = useState<CalendarEmployee[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewType, setViewType] = useState<'day' | 'week' | 'month'>('day')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [allowOverlapping, setAllowOverlapping] = useState(false)
  const [updatingSettings, setUpdatingSettings] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [createModalData, setCreateModalData] = useState<{
    date: Date
    time?: string
    employeeId?: string
  }>({
    date: new Date()
  })
  const { authState } = useAuth()
  const supabase = createClient()
  const { toast } = useToast()

  // ✅ Manejar parámetro 'date' de la URL (desde notificaciones)
  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      try {
        const [year, month, day] = dateParam.split('-').map(Number)
        const dateFromUrl = new Date(year, month - 1, day)
        if (!isNaN(dateFromUrl.getTime())) {
          setSelectedDate(dateFromUrl)
        }
      } catch (error) {
        console.error('Error parsing date from URL:', error)
      }
    }
  }, [searchParams])

  // ========================================
  // FIX: useRef para evitar stale closures
  // ========================================
  const selectedDateRef = useRef(selectedDate)
  const viewTypeRef = useRef(viewType)
  const selectedEmployeesRef = useRef(selectedEmployees)

  // Actualizar refs cuando cambien los estados
  useEffect(() => {
    selectedDateRef.current = selectedDate
  }, [selectedDate])

  useEffect(() => {
    viewTypeRef.current = viewType
  }, [viewType])

  useEffect(() => {
    selectedEmployeesRef.current = selectedEmployees
  }, [selectedEmployees])

  useEffect(() => {
    if (authState.user) {
      fetchBusinessData()
    }
  }, [authState.user])

  useEffect(() => {
    if (business) {
      fetchAppointments()
    }
  }, [business, selectedDate, selectedEmployees, viewType])

  const fetchBusinessData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener negocio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) throw businessError

      setBusiness(businessData)
      setAllowOverlapping(businessData.allow_overlapping_appointments || false)

      // Obtener empleados activos
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, avatar_url, is_active')
        .eq('business_id', businessData.id)
        .eq('is_active', true)
        .order('first_name')

      if (employeesError) throw employeesError

      // Asegurar que los datos coincidan con el tipo CalendarEmployee
      setEmployees((employeesData || []).map(emp => ({
        id: emp.id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        avatar_url: emp.avatar_url,
        is_active: emp.is_active
      })))

      // Seleccionar todos los empleados por defecto
      setSelectedEmployees((employeesData || []).map(e => e.id))

    } catch (error) {
      console.error('❌ [BUSINESS] Error fetching business data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAppointments = async () => {
    if (!business) return

    try {
      setRefreshing(true)

      if (viewType === 'month') {
        // Calculate month range
        const startOfMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        const endOfMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

        const startDate = toDateString(startOfMonthDate)
        const endDate = toDateString(endOfMonthDate)

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            users!appointments_client_id_fkey(first_name, last_name, phone, avatar_url, email),
            business_clients(first_name, last_name, phone, email),
            employees(first_name, last_name),
            appointment_services(
              service_id,
              price,
              services(name, duration_minutes)
            )
          `)
          .eq('business_id', business.id)
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate)
          .in('employee_id', selectedEmployees.length > 0 ? selectedEmployees : [''])
          .order('appointment_date')
          .order('start_time')

        if (error) throw error
        setAppointments((data as any) || [])
      } else if (viewType === 'week') {
        // Calculate week range
        const current = new Date(selectedDate)
        const day = current.getDay()
        const diff = current.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(current.setDate(diff))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        const startDate = toDateString(monday)
        const endDate = toDateString(sunday)

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            users!appointments_client_id_fkey(first_name, last_name, phone, avatar_url, email),
            business_clients(first_name, last_name, phone, email),
            employees(first_name, last_name),
            appointment_services(
              service_id,
              price,
              services(name, duration_minutes)
            )
          `)
          .eq('business_id', business.id)
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate)
          .in('employee_id', selectedEmployees.length > 0 ? selectedEmployees : [''])
          .order('appointment_date')
          .order('start_time')

        if (error) throw error
        setAppointments((data as any) || [])
      } else {
        // Single day view
        const dateStr = toDateString(selectedDate)

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            users!appointments_client_id_fkey(first_name, last_name, phone, avatar_url, email),
            business_clients(first_name, last_name, phone, email),
            employees(first_name, last_name),
            appointment_services(
              service_id,
              price,
              services(name, duration_minutes)
            )
          `)
          .eq('business_id', business.id)
          .eq('appointment_date', dateStr)
          .in('employee_id', selectedEmployees.length > 0 ? selectedEmployees : [''])
          .order('start_time')

        if (error) throw error
        setAppointments((data as any) || [])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // ========================================
  // REALTIME: Fetch individual appointment
  // ========================================
  const fetchSingleAppointment = async (appointmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          users!appointments_client_id_fkey(first_name, last_name, phone, avatar_url, email),
          business_clients(first_name, last_name, phone, email),
          employees(first_name, last_name),
          appointment_services(
            service_id,
            price,
            services(name, duration_minutes)
          )
        `)
        .eq('id', appointmentId)
        .single()

      if (error) {
        console.error('[fetchSingleAppointment] Error:', error)
        throw error
      }

      if (data) {
        setAppointments(prev => {
          const index = prev.findIndex(apt => apt.id === data.id)

          if (index >= 0) {
            // Actualizar existente
            const newArr = [...prev]
            newArr[index] = data as any
            return newArr
          } else {
            // Agregar nueva
            const newArray = [...prev, data as any].sort((a, b) => {
              // Ordenar por fecha y hora
              const dateCompare = a.appointment_date.localeCompare(b.appointment_date)
              if (dateCompare !== 0) return dateCompare
              return a.start_time.localeCompare(b.start_time)
            })
            return newArray
          }
        })
      }
    } catch (error) {
      console.error('[fetchSingleAppointment] Error:', error)
    }
  }

  // ========================================
  // REALTIME: Helper para verificar si está en rango de semana
  // ========================================
  const isWithinWeekRange = (dateStr: string) => {
    const current = new Date(selectedDateRef.current)
    const day = current.getDay()
    const diff = current.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(current.setDate(diff))
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const date = new Date(dateStr + 'T00:00:00')
    return date >= monday && date <= sunday
  }

  // ========================================
  // REALTIME: Suscripción a cambios en appointments
  // ========================================
  // Solo usar realtime si business está disponible
  const shouldUseRealtime = business?.id && business.id.trim() !== ''

  // Siempre ejecutar el hook, pero con businessId condicional
  // El hook maneja internamente el caso cuando businessId es undefined
  useRealtimeAppointments({
    businessId: shouldUseRealtime ? business.id : undefined,
    onInsert: (newAppointment) => {
      // Verificar si la cita es de la fecha actual (usando refs para evitar stale closures)
      const matchesDate = viewTypeRef.current === 'day'
        ? newAppointment.appointment_date === toDateString(selectedDateRef.current)
        : isWithinWeekRange(newAppointment.appointment_date)

      // Verificar si es del empleado seleccionado
      const matchesEmployee = selectedEmployeesRef.current.includes(newAppointment.employee_id)

      if (matchesDate && matchesEmployee) {
        // Fetch completo para traer relaciones (users, services, etc.)
        fetchSingleAppointment(newAppointment.id)
      }
    },
    onUpdate: (updatedAppointment) => {
      // Verificar si la cita sigue en el rango visible (usando refs para evitar stale closures)
      const matchesDate = viewTypeRef.current === 'day'
        ? updatedAppointment.appointment_date === toDateString(selectedDateRef.current)
        : isWithinWeekRange(updatedAppointment.appointment_date)

      const matchesEmployee = selectedEmployeesRef.current.includes(updatedAppointment.employee_id)

      if (matchesDate && matchesEmployee) {
        // Fetch completo para asegurar datos frescos con relaciones
        fetchSingleAppointment(updatedAppointment.id)
      } else {
        // Si ya no coincide con filtros, removerla
        setAppointments(prev => prev.filter(apt => apt.id !== updatedAppointment.id))
      }
    },
    onDelete: (appointmentId) => {
      // Remover del estado local
      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
    }
  })

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate)
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() - 7) // Previous week
    } else {
      newDate.setDate(newDate.getDate() - 1) // Previous day
    }
    setSelectedDate(newDate)
  }

  const handleNextDay = () => {
    const newDate = new Date(selectedDate)
    if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + 7) // Next week
    } else {
      newDate.setDate(newDate.getDate() + 1) // Next day
    }
    setSelectedDate(newDate)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const handleEmployeeFilter = (value: string) => {
    if (value === 'all') {
      setSelectedEmployees(employees.map(e => e.id))
    } else {
      setSelectedEmployees([value])
    }
  }

  const formatDate = (date: Date) => {
    if (viewType === 'week') {
      // Calculate week range
      const current = new Date(date)
      const day = current.getDay()
      const diff = current.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(current.setDate(diff))
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      // Format week range
      const startMonth = monday.toLocaleDateString('es-ES', { month: 'short' })
      const endMonth = sunday.toLocaleDateString('es-ES', { month: 'short' })

      if (startMonth === endMonth) {
        return `${monday.getDate()} - ${sunday.getDate()} ${endMonth}`
      } else {
        return `${monday.getDate()} ${startMonth} - ${sunday.getDate()} ${endMonth}`
      }
    }

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoy'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Mañana'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer'
    } else {
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })
    }
  }

  const handleCreateAppointment = (date?: Date, time?: string, employeeId?: string) => {
    setCreateModalData({
      date: date || selectedDate,
      time,
      employeeId
    })
    setShowCreateModal(true)
  }

  const handleCreateSuccess = () => {
    setShowCreateModal(false)
    setEditingAppointment(null)
    fetchAppointments()
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentModal(true)
  }

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false)
    setSelectedAppointment(null)
  }

  const handleUpdateOverlappingSetting = async (enabled: boolean) => {
    if (!business) return

    setUpdatingSettings(true)
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ allow_overlapping_appointments: enabled })
        .eq('id', business.id)

      if (error) throw error

      setAllowOverlapping(enabled)
      toast({
        title: enabled ? 'Citas superpuestas activadas' : 'Citas superpuestas desactivadas',
        description: enabled
          ? 'Ahora puedes crear citas en horarios superpuestos'
          : 'Se validarán conflictos de horario al crear citas'
      })
    } catch (error) {
      console.error('Error updating overlapping setting:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuración',
        variant: 'destructive'
      })
    } finally {
      setUpdatingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando calendario...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header con controles */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Navegación de fecha */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
            >
              Hoy
            </Button>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousDay}
                className="hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="min-w-[140px] text-center">
                <span className="text-lg font-semibold text-gray-900">
                  {formatDate(selectedDate)}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextDay}
                className="hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Selector de fecha con calendario */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300">
                  <Calendar className="w-4 h-4" />
                  {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date)
                      setCalendarOpen(false)
                    }
                  }}
                  captionLayout="dropdown"
                  fromYear={2020}
                  toYear={2030}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Controles de vista y filtros */}
          <div className="flex items-center gap-3">
            {/* Filtro de empleados */}
            <Select
              value={selectedEmployees.length === employees.length ? 'all' : selectedEmployees[0]}
              onValueChange={handleEmployeeFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar empleados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el equipo</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Vista Día/Semana/Mes */}
            <div className="hidden sm:flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                variant={viewType === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('day')}
                className={`rounded-none ${
                  viewType === 'day'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Día
              </Button>
              <Button
                variant={viewType === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('week')}
                className={`rounded-none ${
                  viewType === 'week'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Semana
              </Button>
              <Button
                variant={viewType === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewType('month')}
                className={`rounded-none ${
                  viewType === 'month'
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                Mes
              </Button>
            </div>

            {/* Botón refrescar */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              disabled={refreshing}
              className="hidden sm:flex"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>

            {/* Botón configuración */}
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:flex"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* Botón Añadir cita */}
            <Button
              onClick={() => handleCreateAppointment()}
              className=" bg-orange-600 hover:bg-orange-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir
            </Button>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="flex-1 overflow-hidden">
        {viewType === 'month' ? (
          <MonthCalendarView
            selectedDate={selectedDate}
            appointments={appointments}
            employees={employees.filter(e => selectedEmployees.includes(e.id))}
            onDateSelect={(date) => {
              setSelectedDate(date)
              setViewType('day')
            }}
            onAppointmentClick={handleAppointmentClick}
            onMonthChange={(date) => {
              setSelectedDate(date)
            }}
          />
        ) : (
          <CalendarView
            selectedDate={selectedDate}
            appointments={appointments}
            employees={employees.filter(e => selectedEmployees.includes(e.id))}
            viewType={viewType}
            businessId={business?.id || ''}
            onRefresh={fetchAppointments}
            onCreateAppointment={handleCreateAppointment}
            onEditAppointment={handleEditAppointment}
          />
        )}
      </div>

      {/* Modal de crear/editar cita */}
      {showCreateModal && business && (
        <CreateAppointmentModal
          businessId={business.id}
          selectedDate={createModalData.date}
          selectedTime={createModalData.time}
          selectedEmployeeId={createModalData.employeeId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Modal de editar cita */}
      {editingAppointment && business && (
        <CreateAppointmentModal
          businessId={business.id}
          selectedDate={parseDateString(editingAppointment.appointment_date)}
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Modal de detalles de cita (desde vista mensual) */}
      {showAppointmentModal && selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={handleCloseAppointmentModal}
          onUpdate={() => {
            handleCloseAppointmentModal()
            fetchAppointments()
          }}
          onEdit={() => {
            handleCloseAppointmentModal()
            handleEditAppointment(selectedAppointment)
          }}
        />
      )}

      {/* Modal de configuración */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración del Calendario</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <Label htmlFor="allow-overlapping" className="text-base font-medium">
                  Permitir citas superpuestas
                </Label>
                <p className="text-sm text-gray-500">
                  Desactiva la validación de conflictos. Útil cuando una empleada puede atender múltiples clientes durante tiempos de espera (ej: tintes).
                </p>
              </div>
              <Switch
                id="allow-overlapping"
                checked={allowOverlapping}
                onCheckedChange={handleUpdateOverlappingSetting}
                disabled={updatingSettings}
              />
            </div>
            {allowOverlapping && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  ⚠️ <strong>Atención:</strong> Con esta opción activada, podrás crear citas en horarios superpuestos. Asegúrate de gestionar correctamente los tiempos de tu equipo.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
