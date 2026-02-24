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
  const [businessStartHour, setBusinessStartHour] = useState(7) // Default 7 AM
  const [businessEndHour, setBusinessEndHour] = useState(21) // Default 9 PM (21)
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

  // ========================================
  // FAIL-SAFE: Restaurar interactividad si Radix falla al limpiar el body
  // ========================================
  useEffect(() => {
    // Si no hay ningún modal principal abierto, forzar limpieza del body
    if (!showCreateModal && !editingAppointment && !showAppointmentModal && !showSettingsModal) {
      const timer = setTimeout(() => {
        if (document.body.style.pointerEvents === 'none') {
          console.log('🔄 [FAIL-SAFE] Restaurando pointer-events: auto');
          document.body.style.pointerEvents = 'auto';
        }
        if (document.body.style.overflow === 'hidden') {
          console.log('🔄 [FAIL-SAFE] Restaurando overflow: auto');
          document.body.style.overflow = 'auto';
        }
      }, 200); // Pequeño margen para permitir que las animaciones terminen
      return () => clearTimeout(timer);
    }
  }, [showCreateModal, editingAppointment, showAppointmentModal, showSettingsModal]);

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

      // Obtener business_hours para calcular inicio/fin dinámico del calendario
      const { data: hoursData, error: hoursError } = await supabase
        .from('business_hours')
        .select('open_time, close_time, is_closed')
        .eq('business_id', businessData.id)

      if (!hoursError && hoursData && hoursData.length > 0) {
        // Filtrar días abiertos y extraer horas
        const openDays = hoursData.filter(h => !h.is_closed)
        if (openDays.length > 0) {
          const openTimes = openDays.map(h => parseInt(h.open_time.split(':')[0]))
          const closeTimes = openDays.map(h => parseInt(h.close_time.split(':')[0]))
          
          // Restar 1 hora al inicio y sumar 1 al final para mejor visibilidad
          const minOpen = Math.min(...openTimes)
          const maxClose = Math.max(...closeTimes)
          
          setBusinessStartHour(Math.max(0, minOpen - 1)) // No ir antes de las 0:00
          setBusinessEndHour(Math.min(23, maxClose + 1)) // No pasar de las 23:00
        }
      }

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
      // Small delay to prevent initial flash and ensure hydration
      setTimeout(() => setLoading(false), 200)
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

  // Memoized handlers for realtime events
  const onInsert = (newAppointment: Appointment) => {
    const matchesDate = viewTypeRef.current === 'day'
      ? newAppointment.appointment_date === toDateString(selectedDateRef.current)
      : isWithinWeekRange(newAppointment.appointment_date)

    const matchesEmployee = selectedEmployeesRef.current.includes(newAppointment.employee_id)

    if (matchesDate && matchesEmployee) {
      fetchSingleAppointment(newAppointment.id)
    }
  }

  const onUpdate = (updatedAppointment: Appointment) => {
    const matchesDate = viewTypeRef.current === 'day'
      ? updatedAppointment.appointment_date === toDateString(selectedDateRef.current)
      : isWithinWeekRange(updatedAppointment.appointment_date)

    const matchesEmployee = selectedEmployeesRef.current.includes(updatedAppointment.employee_id)

    if (matchesDate && matchesEmployee) {
      fetchSingleAppointment(updatedAppointment.id)
    } else {
      setAppointments(prev => prev.filter(apt => apt.id !== updatedAppointment.id))
    }
  }

  const onDelete = (appointmentId: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
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
    onInsert,
    onUpdate,
    onDelete
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
    // Coordinated state change to prevent backdrop ghosting
    setShowAppointmentModal(false)
    setSelectedAppointment(null)
    
    // Tiny delay to allow Detail Modal to unmount
    setTimeout(() => {
      setEditingAppointment(appointment)
      setShowCreateModal(false) // Just in case
    }, 100)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentModal(true)
  }

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false)
    // Delay clearing selection to avoid glitchy transitions
    setTimeout(() => setSelectedAppointment(null), 300)
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
      {/* Header Premium Section - Adaptive Single Row Layout */}
      <div className="w-full bg-white/80 backdrop-blur-md border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-4 py-3 lg:px-6 lg:py-2.5 sticky top-0 z-30 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)]">
        {/* Left Side: Brand & Quick Navigation */}
        <div className="flex items-center justify-between lg:justify-start gap-4 lg:gap-8 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <div className="relative pl-4 py-1">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_10px_rgba(251,146,60,0.3)]" />
              <h1 className="text-lg font-black tracking-tight text-gray-900 leading-none">
                Citas
              </h1>
            </div>

            {/* Navigation Group (Adaptive) */}
            <div className="flex items-center bg-gray-100/80 rounded-xl p-1 gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousDay}
                className="h-7 w-7 p-0 rounded-lg hover:bg-white hover:shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              </Button>
              
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <button className="text-[10px] font-black text-gray-700 hover:text-orange-600 transition-colors uppercase tracking-widest px-2 whitespace-nowrap">
                    {formatDate(selectedDate)}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-2xl" align="center">
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
                    className=""
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextDay}
                className="h-7 w-7 p-0 rounded-lg hover:bg-white hover:shadow-sm"
              >
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              </Button>
            </div>
          </div>

          {/* Desktop Only: Today Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="h-8 w-8 p-0 rounded-xl border-gray-100 shadow-sm bg-white text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all active:scale-95"
          >
            Hoy
          </Button>
        </div>

        {/* Right Side: Filters, View & Actions */}
        <div className="flex items-center justify-between lg:justify-end gap-2 lg:gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-2">
            {/* View Toggles - High Polish */}
            <div className="flex bg-gray-100/80 rounded-xl p-0.5 shadow-inner">
              {['day', 'week', 'month'].map((v) => (
                <button
                  key={v}
                  onClick={() => setViewType(v as any)}
                  className={`px-3 py-1.5 lg:px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                    viewType === v
                      ? 'bg-white text-orange-600 shadow-sm scale-[1.02]' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {v === 'day' ? 'Día' : v === 'week' ? 'Sem' : 'Mes'}
                </button>
              ))}
            </div>

            {/* Team Filter - Compact */}
            <Select
              value={selectedEmployees.length === employees.length ? 'all' : selectedEmployees[0]}
              onValueChange={handleEmployeeFilter}
            >
              <SelectTrigger className="h-8 w-[100px] lg:w-[140px] rounded-xl border-gray-100 shadow-sm bg-white text-[9px] font-black text-gray-600 uppercase tracking-widest px-2.5">
                <SelectValue placeholder="EQUIPO" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-0 shadow-2xl">
                <SelectItem value="all" className="text-[9px] font-black py-2 uppercase tracking-widest">Todo el equipo</SelectItem>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id} className="text-[9px] font-bold py-2 uppercase">
                    {employee.first_name} {employee.last_name}
                  </SelectItem>
                ))}

              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettingsModal(true)}
              className="h-8 w-8 p-0 rounded-xl border-gray-100 shadow-sm bg-white text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              disabled={refreshing}
              className="h-8 w-8 p-0 rounded-xl border-gray-100 shadow-sm bg-white text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button
              onClick={() => handleCreateAppointment()}
              className="h-8 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[9px] font-black uppercase tracking-widest shadow-[0_4px_12px_rgba(234,88,12,0.2)] transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Añadir</span>
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
            businessStartHour={businessStartHour}
            businessEndHour={businessEndHour}
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
