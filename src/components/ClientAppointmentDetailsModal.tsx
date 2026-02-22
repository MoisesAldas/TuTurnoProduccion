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
    const baseClass = "transition-all duration-300 pointer-events-none border-0 font-black uppercase text-[10px] tracking-tight"
    switch (status) {
      case 'pending': return { label: 'Pendiente', color: `${baseClass} bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400`, icon: AlertTriangle }
      case 'confirmed': return { label: 'Confirmada', color: `${baseClass} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400`, icon: CheckCircle }
      case 'in_progress': return { label: 'En progreso', color: `${baseClass} bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400`, icon: Clock }
      case 'completed': return { label: 'Completada', color: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`, icon: CheckCircle }
      case 'cancelled': return { label: 'Cancelada', color: `${baseClass} bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400`, icon: XCircle }
      case 'no_show': return { label: 'No asistió', color: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`, icon: XCircle }
      default: return { label: status, color: `${baseClass} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`, icon: AlertTriangle }
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
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[92vh] overflow-y-auto p-0 border-0 rounded-[2.5rem] shadow-3xl bg-slate-50 overflow-hidden">
        {/* Header with Business Info */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 z-20">
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Business Photo */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm border border-slate-200/50">
                  {appointment.business?.cover_photo_url ? (
                    <img
                      src={appointment.business.cover_photo_url}
                      alt={appointment.business.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store className="w-7 h-7 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-slate-400 px-1 py-0 border-0">Detalle</Badge>
                   </div>
                  <h2 className="text-xl font-black text-slate-900 truncate tracking-tight">
                    {appointment.business?.name || 'Negocio'}
                  </h2>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="flex-shrink-0 -mr-2 rounded-xl text-slate-400 hover:bg-slate-50"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            {/* Status Badge */}
            <Badge variant="outline" className={`${statusInfo.color} text-[10px] px-4 py-2.5 font-black uppercase tracking-[0.15em] rounded-2xl w-full justify-center shadow-sm`}>
              {React.createElement(statusInfo.icon, { className: 'w-4 h-4 mr-2' })}
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Date & Time Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden group">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                </div>
                <p className="text-[15px] font-black text-slate-900 capitalize px-1">
                  {formatDateShort(appointment.appointment_date)}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden group">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</p>
                </div>
                <p className="text-[15px] font-black text-slate-900 px-1 flex items-baseline gap-1.5">
                  {appointment.start_time.slice(0, 5)}
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{getDuration(appointment.start_time, appointment.end_time)}</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Review Section (Conditional) */}
          {appointment.status === 'completed' && !appointment.has_review && onReview && (
            <Card className="bg-amber-500 border-0 shadow-xl shadow-amber-500/20 rounded-3xl overflow-hidden group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-black text-white mb-0.5 tracking-tight group-hover:scale-[1.02] transition-transform origin-left">¡Califica tu experiencia!</p>
                    <p className="text-xs text-white/80 font-bold uppercase tracking-widest">Cuéntanos qué tal te fue</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={onReview}
                    className="bg-white hover:bg-white/90 text-amber-600 font-black rounded-xl h-10 px-5 shadow-lg"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Valorar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {canModify() && (
              <Button
                asChild
                className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-2xl font-black text-base shadow-xl shadow-slate-900/10 transition-all active:scale-95"
                onClick={onClose}
              >
                <Link href={`/dashboard/client/appointments/${appointment.id}`}>
                  <Edit className="w-5 h-5 mr-3" />
                  Gestionar cita
                </Link>
              </Button>
            )}
            
            <div className="grid grid-cols-2 gap-3">
               <Button
                asChild
                variant="outline"
                className="bg-white border-slate-200 h-13 rounded-2xl font-black text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all active:scale-95"
                onClick={onClose}
              >
                <Link href={`/business/${appointment.business?.id}/book`}>
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Repetir
                </Link>
              </Button>
              {appointment.business?.phone && (
                 <Button
                    asChild
                    variant="outline"
                    className="bg-blue-50 border-blue-100 h-13 rounded-2xl font-black text-blue-600 hover:bg-blue-100 transition-all active:scale-95 px-2"
                  >
                    <a href={`tel:${appointment.business.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      Llamar
                    </a>
                  </Button>
              )}
            </div>
          </div>

          {/* Services Summary */}
          <Card className="border-0 shadow-sm rounded-3xl bg-white overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-50">
                <h3 className="text-[15px] font-black text-slate-900 flex items-center gap-2">
                   <div className="p-1.5 bg-slate-100 rounded-lg">
                    <Receipt className="w-4 h-4 text-slate-900" />
                  </div>
                  Resumen de Pago
                </h3>
              </div>
              <div className="space-y-4">
                {appointment.appointment_services.map((service, index) => (
                  <div key={index} className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex-1 pr-4">
                      <p className="text-[13px] font-bold text-slate-700">
                        {service.service?.name || 'Servicio'}
                      </p>
                    </div>
                    <p className="text-[13px] font-black text-slate-900">
                      {formatPrice(service.price)}
                    </p>
                  </div>
                ))}
                
                <div className="pt-4 mt-2">
                  <div className="flex justify-between items-center bg-slate-900 px-5 py-4 rounded-2xl shadow-lg shadow-slate-900/10">
                    <p className="text-sm font-black text-white uppercase tracking-widest">Total</p>
                    <p className="text-xl font-black text-white tracking-tighter tabular-nums">
                      {formatPrice(appointment.total_price)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Information Sections */}
          <div className="space-y-4">
            {/* Professional Info */}
            {appointment.employee && (
               <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden p-4">
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-900">
                        {appointment.employee.first_name[0]}{appointment.employee.last_name[0]}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Profesional</p>
                        <p className="text-sm font-black text-slate-900">{appointment.employee.first_name} {appointment.employee.last_name}</p>
                        {appointment.employee.position && (
                           <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{appointment.employee.position}</p>
                        )}
                     </div>
                  </div>
               </Card>
            )}

            {/* Business Location */}
            {appointment.business?.address && (
               <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden p-4">
                  <div className="flex gap-4">
                     <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
                        <MapPin className="w-6 h-6" />
                     </div>
                     <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Ubicación</p>
                        <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                          {appointment.business.address}
                        </p>
                     </div>
                  </div>
               </Card>
            )}

            {/* Client Notes */}
            {appointment.client_notes && (
              <Card className="border-0 bg-blue-50/50 shadow-sm rounded-2xl p-4 ring-1 ring-blue-100">
                 <div className="flex gap-4">
                    <div className="w-6 h-6 text-blue-600 flex-shrink-0">
                       <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                       <h3 className="text-[10px] font-black text-blue-900 mb-1.5 uppercase tracking-widest">
                        Tus notas
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-blue-200 pl-3">
                        "{appointment.client_notes}"
                      </p>
                    </div>
                 </div>
              </Card>
            )}
            
            <div className="pb-8"></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
