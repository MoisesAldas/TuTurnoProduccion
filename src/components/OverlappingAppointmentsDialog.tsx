'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar, User, DollarSign } from 'lucide-react'
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
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="w-5 h-5 text-orange-600" />
            <span>{appointments.length} Citas Superpuestas</span>
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Haz clic en una cita para ver más detalles
          </p>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] px-6 py-4">
          <div className="space-y-3">
            {appointments.map((appointment, index) => {
              const serviceName = appointment.appointment_services?.[0]?.services?.name || 'Servicio'
              const employee = employees.find(e => e.id === appointment.employees?.first_name)

              return (
                <div
                  key={appointment.id}
                  className={`p-4 border-2 rounded-xl cursor-pointer hover:shadow-md transition-all duration-200 ${
                    index === 0 ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-gray-200 hover:border-orange-300'
                  }`}
                  onClick={() => handleAppointmentClick(appointment)}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left side - Client info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`} />
                        <h4 className="font-semibold text-gray-900 truncate flex items-center gap-1">
                          {getClientName(appointment)}
                          {!appointment.client_id && !appointment.business_client_id && (
                            <span className="text-orange-600">👤</span>
                          )}
                        </h4>
                      </div>

                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" />
                          {serviceName}
                        </p>

                        {appointment.employees && (
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <User className="w-3.5 h-3.5" />
                            {appointment.employees.first_name} {appointment.employees.last_name}
                          </p>
                        )}

                        <p className="text-sm font-medium text-gray-700">
                          ⏰ {appointment.start_time.substring(0, 5)} - {appointment.end_time.substring(0, 5)}
                        </p>
                      </div>
                    </div>

                    {/* Right side - Price */}
                    <div className="flex flex-col items-end justify-between">
                      <div className="flex items-center gap-1 text-orange-600 font-semibold text-lg">
                        <DollarSign className="w-4 h-4" />
                        {appointment.total_price}
                      </div>
                      {index === 0 && (
                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full mt-2">
                          Primera
                        </span>
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
