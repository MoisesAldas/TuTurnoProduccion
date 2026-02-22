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
    <div className="h-full flex flex-col bg-transparent">
      {/* Calendario Grid - Premium & Responsive */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="max-w-[100%] mx-auto bg-white rounded-3xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-gray-100/50 overflow-hidden">
          {/* Días de la semana - Estilo Premium */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
            {weekDays.map(day => (
              <div
                key={day}
                className="py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-px bg-gray-100">
            {monthDays.map((day, idx) => {
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
                    min-h-[100px] sm:min-h-[140px] bg-white p-2.5 cursor-pointer transition-all hover:bg-orange-50/30 relative group
                    ${!isCurrentMonth ? 'bg-gray-50/50 text-gray-300' : ''}
                    ${isSelected ? 'bg-orange-50/50' : ''}
                  `}
                >
                  {/* Número del día con Estilo Premium */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`
                        text-xs font-black flex items-center justify-center w-7 h-7 rounded-xl transition-all
                        ${isTodayDate ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : ''}
                        ${isSelected && !isTodayDate ? 'bg-gray-900 text-white' : ''}
                        ${!isTodayDate && !isSelected ? 'text-gray-900' : ''}
                        ${!isCurrentMonth ? 'opacity-40' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Contador de citas Compacto */}
                    {dayData && dayData.count > 0 && (
                      <div className="flex -space-x-1">
                         {dayData.hasConfirmed && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 border border-white" />}
                         {dayData.hasPending && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 border border-white" />}
                      </div>
                    )}
                  </div>

                  {/* Citas del día - Minimalistas */}
                  <div className="space-y-1.5">
                    {dayData && dayData.count > 0 && (
                      <>
                        {dayData.appointments.slice(0, 3).map((apt) => (
                          <div
                            key={apt.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (onAppointmentClick) {
                                onAppointmentClick(apt)
                              }
                            }}
                            className={`
                              group/apt text-[9px] px-2 py-1 rounded-lg border-l-2 truncate transition-all flex items-center gap-1
                              ${apt.status === 'confirmed' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' :
                                apt.status === 'pending' ? 'bg-amber-50 border-amber-400 text-amber-800' :
                                apt.status === 'cancelled' ? 'bg-red-50 border-red-400 text-red-800' :
                                'bg-gray-50 border-gray-300 text-gray-600'}
                              hover:translate-x-0.5
                            `}
                          >
                            <span className="font-black opacity-60 flex-shrink-0">
                              {apt.start_time.substring(0, 5)}
                            </span>
                            <span className="font-bold truncate">
                              {apt.users
                                ? `${apt.users.first_name} ${apt.users.last_name || ''}`
                                : apt.business_clients
                                ? `${apt.business_clients.first_name} ${apt.business_clients.last_name || ''}`
                                : apt.walk_in_client_name || 'C'}
                            </span>
                          </div>
                        ))}

                        {dayData.count > 3 && (
                          <div className="text-[9px] font-black text-gray-400 px-2 uppercase tracking-tighter">
                            + {dayData.count - 3} más
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Hover Accent */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-orange-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
