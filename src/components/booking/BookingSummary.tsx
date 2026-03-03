'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Calendar as CalendarIcon, User, Info, ArrowLeft } from 'lucide-react'
import { formatPrice, formatDuration } from '@/lib/booking/bookingUtils'

interface BookingSummaryProps {
  selectedServices: any[]
  serviceEmployeeAssignments: Record<string, any>
  selectedDate: Date | undefined
  selectedTime: string
  totalDuration: number
  totalPrice: number
  currentStep: string
  handleContinueToEmployee: () => void
  handleDateTimeConfirm: () => void
  business: any
}

export function BookingSummary({
  selectedServices,
  serviceEmployeeAssignments,
  selectedDate,
  selectedTime,
  totalDuration,
  totalPrice,
  currentStep,
  handleContinueToEmployee,
  handleDateTimeConfirm,
  business
}: BookingSummaryProps) {
  if (currentStep === 'confirmation') return null

  return (
    <div className="hidden lg:block h-full">
      <div className="sticky top-24">
        <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-lg font-black tracking-tight text-slate-950">Resumen de Reserva</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Services */}
            {selectedServices.length > 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <div className="w-4 h-px bg-slate-200" />
                  Servicios ({selectedServices.length})
                </h4>
                <div className="space-y-3">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between items-start group">
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-950 group-hover:text-slate-700 transition-colors line-clamp-1">{service.name}</p>
                        <p className="text-[10px] font-medium text-slate-400">{formatDuration(service.duration_minutes)}</p>
                      </div>
                      <span className="text-sm font-black text-slate-950">{formatPrice(service.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professionals */}
            {Object.keys(serviceEmployeeAssignments).length > 0 && (
              <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <div className="w-4 h-px bg-slate-200" />
                  Profesionales
                </h4>
                <div className="space-y-3">
                  {selectedServices.map(service => {
                    const assignedEmp = serviceEmployeeAssignments[service.id];
                    if (!assignedEmp) return null;
                    return (
                      <div key={`summary-${service.id}`} className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                          {assignedEmp.avatar_url ? (
                            <img src={assignedEmp.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3 h-3 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-950 tracking-tight leading-tight">
                            {assignedEmp.first_name} {assignedEmp.last_name}
                          </p>
                          <p className="text-[9px] font-medium text-slate-400 leading-tight">
                            {service.name}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Date & Time */}
            {selectedDate && selectedTime && (
              <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <div className="w-4 h-px bg-slate-200" />
                  Fecha y Hora
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-slate-950">
                    <CalendarIcon className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-black tracking-tight capitalize">
                      {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-950">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-black tracking-tight">{selectedTime}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
            {selectedServices.length > 0 && (
              <div className="pt-6">
                <div className="p-5 bg-slate-950 text-white rounded-2xl shadow-xl relative overflow-hidden group animate-in zoom-in duration-500">
                  <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                      <p className="text-[10px] font-medium text-slate-500">{formatDuration(totalDuration)} est.</p>
                    </div>
                    <span className="text-2xl font-black text-white tracking-tighter">{formatPrice(totalPrice)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            {(currentStep === 'service' || currentStep === 'datetime') && selectedServices.length > 0 && (
              <div className="pt-2">
                <Button
                  onClick={() => {
                    if (currentStep === 'service') handleContinueToEmployee()
                    else if (currentStep === 'datetime') handleDateTimeConfirm()
                  }}
                  disabled={currentStep === 'datetime' && (!selectedDate || !selectedTime)}
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white shadow-lg hover:shadow-xl h-14 rounded-2xl font-black tracking-widest uppercase text-xs transition-all duration-300 disabled:opacity-30 group"
                >
                  Continuar
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            )}

            {/* Policies */}
            {business && (business.min_booking_hours > 0 || business.max_booking_days < 365 || business.cancellation_policy_text) && (
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  Políticas
                </h4>
                <div className="space-y-2">
                  {business.min_booking_hours > 0 && (
                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                      • Requiere <strong className="text-slate-950">{business.min_booking_hours}h</strong> de anticipación
                    </p>
                  )}
                  {business.max_booking_days < 365 && (
                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                      • Reservas de hasta <strong className="text-slate-950">{business.max_booking_days} días</strong> a futuro
                    </p>
                  )}
                  {business.cancellation_policy_text && (
                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                      • {business.cancellation_policy_text}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
