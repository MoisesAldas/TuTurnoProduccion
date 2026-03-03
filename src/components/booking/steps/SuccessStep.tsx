'use client'

import React from 'react'
import Link from 'next/link'
import { CheckCircle, Clock, User, Calendar as CalendarIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDuration, formatDate } from '@/lib/booking/bookingUtils'

interface Service {
  id: string
  name: string
  price: number
  duration_minutes: number
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  avatar_url?: string
}

interface SuccessStepProps {
  selectedServices: Service[]
  leadEmployee: Employee | null
  selectedDate: Date | undefined
  selectedTime: string
  totalPrice: number
}

export function SuccessStep({
  selectedServices,
  leadEmployee,
  selectedDate,
  selectedTime,
  totalPrice
}: SuccessStepProps) {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="text-center w-full max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
        {/* Success Icon with Animation */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-slate-950/5 rounded-full animate-ping duration-[3s]" />
          <div className="relative w-24 h-24 bg-slate-950 rounded-full flex items-center justify-center shadow-2xl animate-in zoom-in duration-500 delay-300">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
          <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-950 leading-tight">
            ¡Reserva Confirmada!
          </h3>
          <p className="text-slate-500 font-medium text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Tu cita ha sido agendada con éxito. Te enviamos los detalles a tu correo electrónico.
          </p>
        </div>

        {/* Details Card */}
        <Card className="border-none shadow-[0_8px_30px_rgba(0,0,0,0.06)] bg-white overflow-hidden text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detalles de la Cita</h4>
            <div className="px-2.5 py-1 bg-white rounded-full text-[10px] font-black text-slate-950 shadow-sm border border-slate-100">
              ID: #{Math.random().toString(36).substr(2, 6).toUpperCase()}
            </div>
          </div>
          <CardContent className="p-6 space-y-6">
            {/* Services Summary */}
            <div className="space-y-3">
              {selectedServices.map((service) => (
                <div key={service.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100/50 group hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-black text-slate-950 text-sm leading-tight">{service.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDuration(service.duration_minutes)}</p>
                    </div>
                  </div>
                  <p className="font-black text-slate-950">{formatPrice(service.price)}</p>
                </div>
              ))}
            </div>

            {/* Professional & Time Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Atendido por</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm">
                    {leadEmployee?.avatar_url ? (
                      <img src={leadEmployee.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-slate-950 text-sm">{leadEmployee?.first_name} {leadEmployee?.last_name}</p>
                </div>
              </div>

              {/* Date & Time */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fecha y Hora</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                    <CalendarIcon className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-black text-slate-950 text-sm">{selectedDate ? formatDate(selectedDate) : ''}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{selectedTime}hs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Container */}
            <div className="p-4 bg-slate-950 text-white rounded-2xl flex justify-between items-center shadow-lg">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Pagado / A pagar</p>
                <p className="text-xs font-medium text-slate-500">Incluye impuestos</p>
              </div>
              <p className="text-2xl font-black tracking-tighter">{formatPrice(totalPrice)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1000">
          <Link href="/dashboard/client" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 font-black tracking-tight transition-all"
            >
              Ver mis citas
            </Button>
          </Link>
          <Link href="/marketplace" className="flex-1">
            <Button className="w-full h-14 bg-slate-950 hover:bg-slate-900 text-white shadow-xl hover:shadow-2xl transition-all rounded-2xl font-black tracking-tight">
              Explorar más negocios
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
