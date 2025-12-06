/**
 * Utilidades para el componente CalendarView
 * Funciones puras extraídas para mejor mantenibilidad
 */

// Configuración del calendario (constantes)
export const CALENDAR_CONFIG = {
  HOUR_HEIGHT: 60, // px por hora
  START_HOUR: 8,   // 8:00 AM
  END_HOUR: 20     // 8:00 PM
} as const

export const HOURS = Array.from(
  { length: CALENDAR_CONFIG.END_HOUR - CALENDAR_CONFIG.START_HOUR + 1 }, 
  (_, i) => CALENDAR_CONFIG.START_HOUR + i
)

// Funciones puras de cálculo de tiempo
export const getTimePosition = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  const totalMinutes = (hours - CALENDAR_CONFIG.START_HOUR) * 60 + minutes
  return (totalMinutes / 60) * CALENDAR_CONFIG.HOUR_HEIGHT
}

export const getAppointmentHeight = (startTime: string, endTime: string) => {
  const start = getTimePosition(startTime)
  const end = getTimePosition(endTime)
  return end - start
}

export const formatDuration = (startTime: string, endTime: string) => {
  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)
  const totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}min`
  } else if (hours > 0) {
    return `${hours}h`
  } else {
    return `${minutes}min`
  }
}

// Funciones de utilidad para clientes
export const getClientName = (appointment: any) => {
  if (appointment.users) {
    return `${appointment.users.first_name} ${appointment.users.last_name}`
  }
  return appointment.walk_in_client_name || 'Cliente'
}

export const getClientPhone = (appointment: any) => {
  return appointment.users?.phone || appointment.walk_in_client_phone
}

// Funciones de utilidad para UI
export const getInitials = (firstName: string, lastName: string) => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 border-yellow-400 text-yellow-800',
    confirmed: 'bg-green-100 border-green-400 text-green-800',
    in_progress: 'bg-blue-100 border-blue-400 text-blue-800',
    completed: 'bg-gray-100 border-gray-400 text-gray-600',
    cancelled: 'bg-red-100 border-red-400 text-red-800',
    no_show: 'bg-orange-100 border-orange-400 text-orange-800'
  }
  return colors[status as keyof typeof colors] || colors.pending
}

// Funciones de formato
export const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD'
  }).format(price)
}

// Tipos para las ausencias de empleados
export interface EmployeeAbsence {
  id: string
  employee_id: string
  absence_date: string
  reason: string
  is_full_day: boolean
  start_time?: string
  end_time?: string
  notes?: string
}

// Función para calcular fechas de la semana
export const getWeekDates = (selectedDate: Date) => {
  const dates: Date[] = []
  const current = new Date(selectedDate)
  
  // Get Monday of week
  const day = current.getDay()
  const diff = current.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  const monday = new Date(current.setDate(diff))

  // Get all 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }
  
  return dates
}