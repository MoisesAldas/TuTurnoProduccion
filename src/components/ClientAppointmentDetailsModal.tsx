'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Calendar as CalendarIcon, Clock, MapPin, Phone,
  User, Star, Edit, X, CheckCircle,
  XCircle, AlertTriangle, Store, Receipt
} from 'lucide-react'
import Link from 'next/link'

interface Appointment {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  total_price: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  client_notes?: string
  business?: {
    id: string
    name: string
    address?: string
    phone?: string
    cover_photo_url?: string
  } | null
  appointment_services: {
    service?: {
      id: string
      name: string
      description?: string
    } | null
    price: number
  }[]
  employee?: {
    id: string
    first_name: string
    last_name: string
    position?: string
    avatar_url?: string
  } | null
  has_review?: boolean
}

interface ClientAppointmentDetailsModalProps {
  appointment: Appointment | null
  isOpen: boolean
  onClose: () => void
  onReview?: () => void
}

export default function ClientAppointmentDetailsModal({
  appointment,
  isOpen,
  onClose,
  onReview
}: ClientAppointmentDetailsModalProps) {
  if (!appointment) return null

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle }
      case 'confirmed': return { label: 'Confirmada', color: 'bg-green-100 text-green-800', icon: CheckCircle }
      case 'in_progress': return { label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock }
      case 'completed': return { label: 'Completada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle }
      case 'cancelled': return { label: 'Cancelada', color: 'bg-red-100 text-red-800', icon: XCircle }
      case 'no_show': return { label: 'No asistió', color: 'bg-gray-100 text-gray-800', icon: XCircle }
      default: return { label: status, color: 'bg-gray-100 text-gray-800', icon: AlertTriangle }
    }
  }

  const formatDateShort = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  const getDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    const totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    if (hours > 0 && minutes > 0) return `${hours} h ${minutes} min`
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`
    return `${minutes} min`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(price)
  }

  const isUpcoming = () => {
    const now = new Date()
    const aptDate = new Date(`${appointment.appointment_date}T${appointment.start_time}`)
    return aptDate > now && ['pending', 'confirmed'].includes(appointment.status)
  }

  const canModify = () => {
    return isUpcoming() && appointment.status !== 'cancelled'
  }

  const statusInfo = getStatusInfo(appointment.status)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header with Business Info */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Business Photo */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                  {appointment.business?.cover_photo_url ? (
                    <img
                      src={appointment.business.cover_photo_url}
                      alt={appointment.business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">
                    {appointment.business?.name || 'Negocio'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    ID: #{appointment.id.slice(0, 8)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex-shrink-0 -mr-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Status Badge */}
            <Badge className={`${statusInfo.color} text-sm px-3 py-1.5 font-medium rounded-full w-full justify-center`}>
              {React.createElement(statusInfo.icon, { className: 'w-4 h-4 mr-1.5 inline' })}
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-700" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Fecha</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {formatDateShort(appointment.appointment_date)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Hora</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {appointment.start_time.slice(0, 5)} • {getDuration(appointment.start_time, appointment.end_time)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Review Section */}
          {appointment.status === 'completed' && !appointment.has_review && onReview && (
            <Card className="bg-amber-50 border-amber-200 shadow-sm">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-0.5">¿Cómo fue tu experiencia?</p>
                    <p className="text-xs text-gray-600">Califica este servicio</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={onReview}
                    className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
                  >
                    <Star className="w-4 h-4 mr-1.5" />
                    Calificar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {canModify() && (
              <Button
                asChild
                className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                onClick={onClose}
              >
                <Link href={`/dashboard/client/appointments/${appointment.id}`}>
                  <Edit className="w-4 h-4 mr-2" />
                  Gestionar cita
                </Link>
              </Button>
            )}
            {appointment.status === 'completed' && (
              <Button
                asChild
                variant="outline"
                className="w-full"
                onClick={onClose}
              >
                <Link href={`/business/${appointment.business?.id}/book`}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Reservar otra vez
                </Link>
              </Button>
            )}
          </div>

          {/* Services Summary */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-slate-700" />
                Servicios
              </h3>
              <div className="space-y-2">
                {appointment.appointment_services.map((service, index) => (
                  <div key={index} className="flex justify-between items-start pb-2 border-b border-gray-100 last:border-0">
                    <div className="flex-1 pr-2">
                      <p className="text-sm font-medium text-gray-900">
                        {service.service?.name || 'Servicio'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                ))}
                <div className="pt-2 mt-1">
                  <div className="flex justify-between items-center bg-slate-100 px-3 py-2 rounded-lg">
                    <p className="text-base font-bold text-gray-900">Total</p>
                    <p className="text-base font-bold text-slate-900">
                      {formatPrice(appointment.total_price)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Info */}
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Store className="w-5 h-5 text-slate-700" />
                Información del Negocio
              </h3>
              <div className="space-y-3">
                {appointment.business?.address && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dirección</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {appointment.business.address}
                    </p>
                  </div>
                )}
                {appointment.business?.phone && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Teléfono</p>
                    <a
                      href={`tel:${appointment.business.phone}`}
                      className="text-sm text-slate-700 font-medium hover:text-slate-900 hover:underline"
                    >
                      {appointment.business.phone}
                    </a>
                  </div>
                )}
                {appointment.employee && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Profesional</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {appointment.employee.first_name} {appointment.employee.last_name}
                    </p>
                    {appointment.employee.position && (
                      <p className="text-xs text-gray-500">{appointment.employee.position}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Notes */}
          {appointment.client_notes && (
            <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                  Notas de la Cita
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {appointment.client_notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
