'use client'

import React from 'react'
import { Clock, Calendar as CalendarIcon, User, CheckCircle, Loader2, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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

interface DetailsStepProps {
  business: any
  selectedServices: Service[]
  serviceEmployeeAssignments: Record<string, Employee | null>
  selectedDate: Date | undefined
  selectedTime: string
  totalDuration: number
  totalPrice: number
  clientNotes: string
  setClientNotes: (notes: string) => void
  handleBookingSubmit: () => void
  goBackToDateTime: () => void
  submitting: boolean
  isBlocked?: boolean
}

export function DetailsStep({
  business,
  selectedServices,
  serviceEmployeeAssignments,
  selectedDate,
  selectedTime,
  totalDuration,
  totalPrice,
  clientNotes,
  setClientNotes,
  handleBookingSubmit,
  goBackToDateTime,
  submitting,
  isBlocked
}: DetailsStepProps) {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBackToDateTime}
          className="gap-2 h-10 px-4 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Volver a Fecha y Hora</span>
        </Button>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div className="space-y-6">
          {/* Booking Summary Card */}
          <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-lg font-black tracking-tight text-slate-950">Resumen de tu cita</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Services */}
              <div className="space-y-3">
                {selectedServices.map((service) => (
                  <div key={service.id} className="flex justify-between items-start pb-3 border-b border-slate-50 last:border-none last:pb-0">
                    <div className="flex-1">
                      <p className="font-black text-slate-950 text-base tracking-tight">{service.name}</p>
                      <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                    </div>
                    <p className="font-black text-slate-950 text-base">{formatPrice(service.price)}</p>
                  </div>
                ))}
              </div>

              {/* Professional and Time */}
              <div className="grid grid-cols-2 gap-4 py-4 border-t border-slate-100">
                <div className="space-y-1">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Profesionales</span>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex -space-x-2">
                      {Object.values(serviceEmployeeAssignments).filter(Boolean).map((emp, i) => (
                        <div key={emp!.id + i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 overflow-hidden shadow-sm">
                          {emp!.avatar_url ? (
                            <img src={emp!.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-full h-full p-1 text-slate-400" />
                          )}
                        </div>
                      ))}
                    </div>
                     <p className="font-black text-slate-950 text-xs tracking-tight truncate ml-1">
                      {Object.values(serviceEmployeeAssignments).filter(Boolean).length} seleccionados
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horario</span>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-600">
                      <Clock className="w-4 h-4" />
                    </div>
                     <p className="font-black text-slate-950 text-base tracking-tight">{selectedTime}</p>
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="flex justify-between items-center py-4 border-t border-slate-100">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
                <div className="flex items-center gap-2 text-slate-950">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                   <p className="font-black text-base tracking-tight">{selectedDate ? formatDate(selectedDate) : ''}</p>
                </div>
              </div>

              {/* Total Container */}
              <div className="p-5 bg-slate-950 text-white rounded-2xl flex justify-between items-center shadow-lg relative overflow-hidden group">
                <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total a pagar</p>
                  <p className="text-xs font-medium text-slate-400">Duración estimada: {formatDuration(totalDuration)}</p>
                </div>
                <p className="text-2xl font-black tracking-tighter">{formatPrice(totalPrice)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Additional Notes Card */}
          <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Notas adicionales (opcional)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Textarea
                placeholder="¿Tienes alguna preferencia especial o algo que el profesional deba saber?"
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={4}
                className="resize-none rounded-xl border-slate-200 focus:border-slate-950 focus:ring-slate-950/10 placeholder:text-slate-300 text-sm font-medium transition-all"
              />
            </CardContent>
          </Card>

          {/* Policy Card */}
          {business?.cancellation_policy_text && (
            <Card className="bg-slate-50 border-none shadow-sm rounded-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Política de cancelación</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium text-slate-600 leading-relaxed">{business.cancellation_policy_text}</p>
              </CardContent>
            </Card>
          )}

          {/* Confirm Button */}
          <div className="pt-4">
            <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
              <Button
                onClick={handleBookingSubmit}
                disabled={submitting || isBlocked}
                className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>Confirmar</span>
              </Button>
            </div>

            <Button
              onClick={handleBookingSubmit}
              size="lg"
              disabled={submitting || isBlocked}
              className="w-full px-12 h-14 bg-slate-950 hover:bg-slate-900 text-white rounded-2xl font-black tracking-tight text-lg shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 hidden lg:inline-flex"
            >
              {submitting ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Confirmando Reserva...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirmar Reserva</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
