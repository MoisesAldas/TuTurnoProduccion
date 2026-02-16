import React from 'react'
import { Clock, UserCircle, UserCheck, ClipboardList, CircleDollarSign, Phone, CalendarClock } from 'lucide-react'
import type { Appointment } from '@/types/database'

interface AppointmentTooltipProps {
  appointment: Appointment
  position: { x: number; y: number }
  clientName: string
  employee?: {
    id: string
    first_name: string
    last_name: string
  }
}

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-amber-500' },
  confirmed: { label: 'Confirmada', color: 'bg-emerald-500' },
  in_progress: { label: 'En Progreso', color: 'bg-blue-500' },
  completed: { label: 'Completada', color: 'bg-slate-500' },
  cancelled: { label: 'Cancelada', color: 'bg-rose-500' },
  no_show: { label: 'No Asistió', color: 'bg-orange-500' }
}

export default function AppointmentTooltip({
  appointment,
  position,
  clientName,
  employee
}: AppointmentTooltipProps) {
  // Obtener todos los servicios
  const services = appointment.appointment_services?.map(as => as.services?.name).filter(Boolean) || []
  const status = statusConfig[appointment.status as keyof typeof statusConfig] || statusConfig.pending
  
  // Calcular duración
  const [startH, startM] = appointment.start_time.split(':').map(Number)
  const [endH, endM] = appointment.end_time.split(':').map(Number)
  const totalMin = (endH * 60 + endM) - (startH * 60 + startM)
  const durationText = totalMin >= 60 
    ? `${Math.floor(totalMin / 60)}h ${totalMin % 60}min` 
    : `${totalMin}min`

  // Phone from various sources
  const clientPhone = appointment.users?.phone || appointment.business_clients?.phone || appointment.walk_in_client_phone

  return (
    <div
      className="fixed z-50 pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y - 10}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden w-64">
        {/* Header compacto con gradiente */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-3 py-2">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm font-semibold">
                {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
              <CalendarClock className="w-3 h-3" />
              <span className="text-xs font-medium">{durationText}</span>
            </div>
          </div>
        </div>

        {/* Content compacto */}
        <div className="px-3 py-2.5 space-y-2">
          {/* Cliente */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <UserCircle className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{clientName}</p>
              {!appointment.client_id && (
                <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
                  WALK-IN
                </span>
              )}
            </div>
          </div>

          {/* Empleado */}
          {employee && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-50 rounded-lg">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <p className="text-gray-700 text-sm truncate flex-1">
                {employee.first_name} {employee.last_name}
              </p>
            </div>
          )}

          {/* Servicios - mostrar todos */}
          {services.length > 0 && (
            <div className="flex items-start gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg flex-shrink-0">
                <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                {services.length === 1 ? (
                  <p className="text-gray-700 text-sm truncate">{services[0]}</p>
                ) : (
                  <div className="space-y-0.5">
                    {services.map((service, idx) => (
                      <p key={idx} className="text-gray-700 text-xs truncate">
                        • {service}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Phone - si existe */}
          {clientPhone && (
            <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 rounded-lg">
              <Phone className="w-3 h-3 text-slate-600" />
              <span className="text-xs font-mono text-slate-900">{clientPhone}</span>
            </div>
          )}

          {/* Footer: Estado y Precio */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 ${status.color} rounded-full`} />
              <span className="text-xs text-gray-600 font-medium">{status.label}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
              <CircleDollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-emerald-700">
                {appointment.total_price || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flecha */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
        <div 
          className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        />
      </div>
    </div>
  )
}
