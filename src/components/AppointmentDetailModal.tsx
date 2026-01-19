'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Calendar,
  Clock,
  User,
  Briefcase,
  DollarSign,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Timer,
  Users
} from 'lucide-react'
import type { Appointment } from '@/types/database'

interface AppointmentDetailModalProps {
  appointment: Appointment | null
  clientName?: string | null
  clientPhone?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}
export default function AppointmentDetailModal({
  appointment,
  clientName,
  clientPhone,
  open,
  onOpenChange
}: AppointmentDetailModalProps) {
  if (!appointment) return null

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5)
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: {
        icon: Timer,
        label: 'Pendiente',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400'
      },
      confirmed: {
        icon: CheckCircle2,
        label: 'Confirmada',
        className: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400'
      },
      in_progress: {
        icon: Timer,
        label: 'En Progreso',
        className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400'
      },
      completed: {
        icon: CheckCircle2,
        label: 'Completada',
        className: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400'
      },
      cancelled: {
        icon: XCircle,
        label: 'Cancelada',
        className: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400'
      },
      no_show: {
        icon: AlertCircle,
        label: 'No Asistió',
        className: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400'
      }
    }
    return configs[status as keyof typeof configs] || configs.pending
  }

  const statusConfig = getStatusConfig(appointment.status)
  const StatusIcon = statusConfig.icon

  // @ts-ignore - Supabase types
  const client = appointment.users
  // @ts-ignore
  const businessClient = appointment.business_clients
  // @ts-ignore
  const employee = appointment.employees
  // @ts-ignore
  const services = appointment.appointment_services || []

  // Construct client name using same logic as RPC function
  const displayClientName = client 
    ? `${client.first_name} ${client.last_name}`
    : businessClient
    ? `${businessClient.first_name}${businessClient.last_name ? ' ' + businessClient.last_name : ''}`
    : clientName || appointment.walk_in_client_name || 'Cliente Walk-in'

  const displayClientPhone = client?.phone || businessClient?.phone || clientPhone || appointment.walk_in_client_phone

  const totalDuration = services.reduce((sum: number, s: any) => 
    sum + (s.services?.duration_minutes || 0), 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto [&>button]:bg-gray-100 [&>button]:hover:bg-gray-200 dark:[&>button]:bg-gray-800 dark:[&>button]:hover:bg-gray-700">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Detalle de Cita
                <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                  #{appointment.id.slice(0, 8)}
                </span>
              </DialogTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(appointment.appointment_date)} • {formatTime(appointment.start_time)}
              </p>
            </div>
            <Badge className={`${statusConfig.className} border flex items-center gap-1.5 px-3 py-1.5 shrink-0`}>
              <StatusIcon className="w-4 h-4" />
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Fecha y Hora */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase">
                      Fecha
                    </p>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mt-1">
                      {formatDate(appointment.appointment_date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase">
                      Horario
                    </p>
                    <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mt-1">
                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                      {totalDuration} minutos
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cliente */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Información del Cliente
              </h3>
            </div>
            <Card>
              <CardContent className="pt-6">
                {client ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={client.avatar_url} />
                        <AvatarFallback className=" bg-orange-600 hover:bg-orange-700 to-pink-500 text-white font-semibold text-lg">
                          {client.first_name?.[0]}{client.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                         
                          {client.first_name} {client.last_name}
                        </p>
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <Mail className="w-3.5 h-3.5" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <Phone className="w-4 h-4 text-gray-500" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                ) : (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <Avatar className="w-12 h-12">
        <AvatarFallback className=" bg-orange-600 hover:bg-orange-700
 text-white font-semibold text-lg">
          {displayClientName?.[0] || 'W'}
        </AvatarFallback>
      </Avatar>
      <div>
       <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
  
  {displayClientName}
</p>
        <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
          Sin cuenta
        </Badge>
      </div>
    </div>
    {displayClientPhone && (
  <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
    <Phone className="w-4 h-4 text-gray-500" />
    {displayClientPhone}
  </div>
)}
  </div>
)}
              </CardContent>
            </Card>
          </div>

          {/* Empleado */}
          {employee && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Profesional Asignado
                </h3>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={employee.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {employee.first_name} {employee.last_name}
                      </p>
                      {employee.position && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {employee.position}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Servicios */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Servicios ({services.length})
              </h3>
            </div>
            <Card>
              <CardContent className="pt-6 space-y-3">
                {services.map((service: any, index: number) => (
                  <div key={index}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {service.services?.name || 'Servicio'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {service.services?.duration_minutes || 0} minutos
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatPrice(service.price)}
                      </p>
                    </div>
                    {index < services.length - 1 && <Separator className="mt-3" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Total */}
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Total a Pagar
                  </p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-200">
                    {formatPrice(appointment.total_price || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notas */}
          {appointment.client_notes && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Notas del Cliente
                </h3>
              </div>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {appointment.client_notes}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Creada</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {new Date(appointment.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
            {appointment.updated_at && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Actualizada</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(appointment.updated_at).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
