'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, UserCircle, CircleDollarSign, Clock, UserCheck } from 'lucide-react'
import type { Appointment, Employee } from '@/types/database'

type CalendarEmployee = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_active'>

interface OverlappingAppointmentsDialogProps {
  isOpen: boolean
  onClose: () => void
  appointments: Appointment[]
  employees: CalendarEmployee[]
  onAppointmentClick: (appointment: Appointment) => void
}

export default function OverlappingAppointmentsDialog({
  isOpen,
  onClose,
  appointments,
  employees,
  onAppointmentClick
}: OverlappingAppointmentsDialogProps) {
  const getClientName = (appointment: Appointment) => {
    if (appointment.users) {
      return `${appointment.users.first_name} ${appointment.users.last_name}`
    }
    if (appointment.business_clients) {
      const lastName = appointment.business_clients.last_name || ''
      return `${appointment.business_clients.first_name} ${lastName}`.trim()
    }
    return appointment.walk_in_client_name || 'Cliente'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500'
      case 'pending': return 'bg-yellow-500'
      case 'in_progress': return 'bg-blue-500'
      case 'completed': return 'bg-gray-500'
      case 'cancelled': return 'bg-red-500'
      case 'no_show': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    onClose()
    onAppointmentClick(appointment)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0 rounded-3xl overflow-hidden border-none shadow-2xl bg-white dark:bg-gray-900">
        <DialogHeader className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-800 dark:to-gray-900">
          <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight text-gray-900 dark:text-white">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span>{appointments.length} Citas Superpuestas</span>
          </DialogTitle>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 pl-13">
            Hay conflictos de horario detectados. Selecciona una cita para gestionarla.
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 py-6 scrollbar-thin dark:scrollbar-thumb-gray-800">
          <div className="space-y-4">
            {appointments.map((appointment, index) => {
              const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
              
              return (
                <div
                  key={appointment.id}
                  className={`group p-5 border-2 rounded-[2rem] cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] ${
                    index === 0 
                      ? 'bg-orange-50/30 dark:bg-orange-950/10 border-orange-200 dark:border-orange-900/50 shadow-orange-500/5' 
                      : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-900/50 shadow-sm'
                  }`}
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_8px_currentColor] ${getStatusColor(appointment.status)}`} />
                        <h4 className="font-black text-gray-900 dark:text-white truncate flex items-center gap-2 text-lg tracking-tight">
                          {getClientName(appointment)}
                          {!appointment.client_id && !appointment.business_client_id && (
                            <span className="text-[10px] font-black bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-lg uppercase tracking-widest">Walk-in</span>
                          )}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight truncate">{serviceName}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <div className="w-7 h-7 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                            <Clock className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-black tracking-tight">
                            {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Price */}
                    <div className="flex flex-col items-end justify-between self-stretch py-1">
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-black text-xl tracking-tighter">
                        <CircleDollarSign className="w-5 h-5" />
                        {appointment.total_price}
                      </div>
                      {index === 0 && (
                        <Badge className="bg-orange-600 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20 text-[9px] font-black uppercase tracking-widest px-3">
                          Siguiente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
