import React from 'react'
import { Clock, UserCircle, UserCheck, ClipboardList, CircleDollarSign, Phone, CalendarClock } from 'lucide-react'
import type { Appointment } from '@/types/database'

interface AppointmentTooltipProps {
  appointment: Appointment
  position: { x: number; y: number }
  clientName: string
  employees?: Array<{
    id: string
    first_name: string
    last_name: string
  }>
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
  employees = []
}: AppointmentTooltipProps) {
  // Group services by employee
  const servicesByEmployee = appointment.appointment_services?.reduce((acc, as) => {
    const empId = as.employee_id || appointment.employee_id;
    if (!acc[empId]) acc[empId] = [];
    if (as.services?.name) acc[empId].push(as.services.name);
    return acc;
  }, {} as Record<string, string[]>) || {};

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
      <div className="bg-white dark:bg-gray-950/95 rounded-3xl shadow-2xl border border-gray-100/50 dark:border-gray-800 overflow-hidden w-64 backdrop-blur-md">
        {/* Header Premium Solid Color (Primary) */}
        <div className="bg-primary px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/90" />
              <span className="text-sm font-black tracking-tight">
                {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-xl">
              <CalendarClock className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] font-black uppercase tracking-wider">{durationText}</span>
            </div>
          </div>
        </div>

        {/* Content Refinado */}
        <div className="px-4 py-4 space-y-3.5">
          {/* Cliente */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary/20">
              <UserCircle className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest block mb-0.5 opacity-80">
                Cliente
              </span>
              <p className="font-black text-gray-900 dark:text-white text-sm truncate leading-none">{clientName}</p>
              {!appointment.client_id && (
                <span className="inline-block mt-1 text-[8px] font-black px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg uppercase tracking-widest">
                  Sin registrar
                </span>
              )}
            </div>
          </div>

          {/* Profesionales y Servicios agrupados */}
          {Object.entries(servicesByEmployee).map(([empId, empServices]) => {
            const empInfo = employees.find(e => e.id === empId);
            return (
              <div key={empId} className="space-y-2 pb-2 last:pb-0 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-50 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-gray-700">
                    <UserCheck className="w-4 h-4 text-slate-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-slate-500 dark:text-gray-500 uppercase tracking-widest block mb-0.5 opacity-80">
                      Profesional
                    </span>
                    <p className="text-gray-900 dark:text-gray-200 text-xs font-bold truncate leading-none">
                      {empInfo ? `${empInfo.first_name} ${empInfo.last_name}` : 'Desconocido'}
                    </p>
                  </div>
                </div>
                
                {empServices.length > 0 && (
                  <div className="flex items-start gap-3 ml-2">
                    <div className="w-4 h-4 mt-0.5 flex items-center justify-center">
                      <ClipboardList className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1">
                        {empServices.map((service, idx) => (
                          <p key={idx} className="text-gray-700 dark:text-gray-400 text-[11px] font-medium truncate leading-tight italic">
                            {service}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Teléfono */}
          {clientPhone && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs font-bold text-gray-900 dark:text-gray-200 tracking-tight">{clientPhone}</span>
            </div>
          )}

          {/* Footer Final */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 ${status.color} rounded-full shadow-sm ring-2 ring-white dark:ring-gray-950`} />
              <span className="text-[10px] text-gray-600 dark:text-gray-400 font-black uppercase tracking-wider">{status.label}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <CircleDollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                ${appointment.total_price || '0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Flecha */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full">
        <div 
          className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-950"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
        />
      </div>
    </div>
  )
}
