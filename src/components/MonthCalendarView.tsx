'use client'

import { useState, useMemo, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toDateString } from '@/lib/dateUtils'
import type { Appointment, Employee } from '@/types/database'

// Tipo simplificado para empleados (compatible con CalendarEmployee de appointments page)
type SimpleEmployee = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>

interface MonthCalendarViewProps {
  selectedDate: Date
  appointments: Appointment[]
  employees: SimpleEmployee[]
  onDateSelect: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onMonthChange?: (date: Date) => void
}

interface DayAppointment {
  date: Date
  appointments: Appointment[]
  count: number
  hasConfirmed: boolean
  hasPending: boolean
  hasCompleted: boolean
}

export default function MonthCalendarView({
  selectedDate,
  appointments,
  employees,
  onDateSelect,
  onAppointmentClick,
  onMonthChange
}: MonthCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)

  // Sincronizar currentMonth con selectedDate cuando cambia externamente
  useEffect(() => {
    setCurrentMonth(selectedDate)
  }, [selectedDate])

  // Calcular días del mes
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)

    // Obtener todos los días del mes
    const days = eachDayOfInterval({ start, end })

    // Calcular días del mes anterior para llenar la primera semana
    const firstDayOfWeek = start.getDay()
    const daysToAdd = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Lunes como primer día

    const previousMonthDays: Date[] = []
    for (let i = daysToAdd; i > 0; i--) {
      const day = new Date(start)
      day.setDate(start.getDate() - i)
      previousMonthDays.push(day)
    }

    // Calcular días del mes siguiente para completar la última semana
    const lastDayOfWeek = end.getDay()
    const daysToAddEnd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek

    const nextMonthDays: Date[] = []
    for (let i = 1; i <= daysToAddEnd; i++) {
      const day = new Date(end)
      day.setDate(end.getDate() + i)
      nextMonthDays.push(day)
    }

    return [...previousMonthDays, ...days, ...nextMonthDays]
  }, [currentMonth])

  // Agrupar citas por día
  const appointmentsByDay = useMemo(() => {
    const grouped = new Map<string, DayAppointment>()

    monthDays.forEach(day => {
      const dateStr = toDateString(day)
      const dayAppointments = appointments.filter(apt => apt.appointment_date === dateStr)

      grouped.set(dateStr, {
        date: day,
        appointments: dayAppointments,
        count: dayAppointments.length,
        hasConfirmed: dayAppointments.some(apt => apt.status === 'confirmed'),
        hasPending: dayAppointments.some(apt => apt.status === 'pending'),
        hasCompleted: dayAppointments.some(apt => apt.status === 'completed')
      })
    })

    return grouped
  }, [monthDays, appointments])

  // Navegación de meses
  const handlePreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    if (onMonthChange) {
      onMonthChange(newMonth)
    }
  }

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    if (onMonthChange) {
      onMonthChange(newMonth)
    }
  }

  const handleToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    if (onMonthChange) {
      onMonthChange(today)
    }
  }

  // Días de la semana
  const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Navegación de mes */}
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
                onClick={handlePreviousMonth}
                className="hover:bg-gray-100"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <h2 className="min-w-[200px] text-center text-xl font-bold text-gray-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h2>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Leyenda */}
          <div className="hidden lg:flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Confirmada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
              <span className="text-gray-600">Completada</span>
            </div>
             <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Cancelada</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-lg overflow-hidden mb-px">
            {weekDays.map(day => (
              <div
                key={day}
                className="bg-gray-50 py-3 text-center text-sm font-semibold text-gray-700"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-lg overflow-hidden">
            {monthDays.map(day => {
              const dateStr = toDateString(day)
              const dayData = appointmentsByDay.get(dateStr)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDateSelect(day)}
                  className={`
                    min-h-[100px] sm:min-h-[120px] bg-white p-2 cursor-pointer transition-all hover:bg-orange-50 relative
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${isSelected ? 'ring-2 ring-orange-500 ring-inset z-10' : ''}
                    ${isTodayDate && !isSelected ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  `}
                >
                  {/* Número del día */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full
                        ${isTodayDate ? 'bg-blue-600 text-white' : ''}
                        ${isSelected && !isTodayDate ? 'bg-orange-600 text-white' : ''}
                        ${!isTodayDate && !isSelected ? 'text-gray-900' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Contador de citas */}
                    {dayData && dayData.count > 0 && (
                      <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                        {dayData.count}
                      </span>
                    )}
                  </div>

                  {/* Indicadores de citas */}
                  {dayData && dayData.count > 0 && (
                    <div className="space-y-1 mt-2">
                      {/* Mostrar hasta 3 citas como pequeños bloques */}
                      {dayData.appointments.slice(0, 3).map((apt, idx) => {
                        const statusColors = {
                          pending: 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200',
                          confirmed: 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200',
                          in_progress: 'bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200',
                          completed: 'bg-gray-100 border-gray-400 text-gray-600 hover:bg-gray-200',
                          cancelled: 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200',
                          no_show: 'bg-orange-100 border-orange-400 text-orange-800 hover:bg-orange-200'
                        }

                        return (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onAppointmentClick) {
                                onAppointmentClick(apt)
                              }
                            }}
                            className={`text-xs px-2 py-1 rounded border-l-2 truncate cursor-pointer transition-colors ${
                              statusColors[apt.status as keyof typeof statusColors]
                            }`}
                          >
                            <span className="font-semibold">
                              {apt.start_time.substring(0, 5)}
                            </span>
                            {' '}
                            <span className="font-normal">
                              {apt.users
                                ? `${apt.users.first_name} ${apt.users.last_name}`
                                : apt.business_clients
                                ? `${apt.business_clients.first_name} ${apt.business_clients.last_name || ''}`
                                : apt.walk_in_client_name || 'Cliente'}
                            </span>
                          </div>
                        )
                      })}

                      {/* Indicador si hay más de 3 */}
                      {dayData.count > 3 && (
                        <div className="text-xs text-gray-500 font-medium px-2">
                          +{dayData.count - 3} más
                        </div>
                      )}
                    </div>
                  )}

                  {/* Indicadores de estado (si no hay citas visibles) */}
                  {dayData && dayData.count > 0 && dayData.count <= 3 && (
                    <div className="absolute bottom-2 left-2 flex gap-1">
                      {dayData.hasConfirmed && (
                        <div className="w-2 h-2 bg-green-500 rounded-full" title="Tiene citas confirmadas" />
                      )}
                      {dayData.hasPending && (
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Tiene citas pendientes" />
                      )}
                      {dayData.hasCompleted && (
                        <div className="w-2 h-2 bg-gray-500 rounded-full" title="Tiene citas completadas" />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Leyenda móvil */}
      <div className="lg:hidden border-t border-gray-200 px-6 py-4">
        <div className="flex items-center justify-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Confirmada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-600">Pendiente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span className="text-gray-600">Completada</span>
          </div>
        </div>
      </div>
    </div>
  )
}
