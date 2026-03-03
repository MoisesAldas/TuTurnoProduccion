'use client'

import React from 'react'
import { Calendar as CalendarIcon, Clock, AlertCircle, Info, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { formatDate } from '@/lib/booking/bookingUtils'

interface TimeSlot {
  time: string
  available: boolean
}

interface SpecialHour {
  is_closed: boolean
  description: string | null
  open_time: string | null
  close_time: string | null
}

interface DateTimeStepProps {
  selectedDate: Date | undefined
  setSelectedDate: (date: Date | undefined) => void
  selectedTime: string
  setSelectedTime: (time: string) => void
  availableSlots: TimeSlot[]
  minDate: Date
  maxDate: Date
  specialHourForDate: SpecialHour | null
  handleDateTimeConfirm: () => void
  goBackToEmployee: () => void
}

export function DateTimeStep({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  availableSlots,
  minDate,
  maxDate,
  specialHourForDate,
  handleDateTimeConfirm,
  goBackToEmployee
}: DateTimeStepProps) {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Back Button */}
      <div className="flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBackToEmployee}
          className="gap-2 h-10 px-4 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900">Volver a Empleados</span>
        </Button>
      </div>

      {/* Continue Button - Floating at bottom on mobile */}
      {selectedDate && selectedTime && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
          <Button
            onClick={handleDateTimeConfirm}
            className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 flex items-center gap-2"
          >
            <span>Siguiente</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* Calendar and Time Slots - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar Card */}
        <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
          <CardHeader className="hidden lg:block border-b border-slate-50">
            <CardTitle className="text-lg font-black tracking-tight text-slate-950">Selecciona una fecha</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6 sm:p-8">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              defaultMonth={new Date()}
              locale={{
                localize: {
                  month: (n: number) => ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][n],
                  day: (n: number) => ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][n],
                },
                formatLong: {
                  date: () => 'dd/MM/yyyy',
                },
              } as any}
              disabled={(date) => {
                const today = new Date()
                const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
                const checkingDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
                const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())

                if (checkingDateOnly < minDateOnly) return true
                if (checkingDateOnly > maxDateOnly) return true
                return false
              }}
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 5}
              captionLayout="buttons"
            />
          </CardContent>
        </Card>

        {/* Time Slots Card */}
        <Card className="border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] bg-white overflow-hidden">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-lg font-black tracking-tight text-slate-950 flex flex-col gap-1">
              {selectedDate ? (
                <>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{formatDate(selectedDate)}</span>
                  <span>Horarios Disponibles</span>
                </>
              ) : (
                'Horarios'
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {!selectedDate ? (
              <div className="text-center py-4 px-4 group">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500">
                  <CalendarIcon className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selecciona una fecha primero</p>
              </div>
            ) : (
              <>
                {/* Special Hours Alerts */}
                {specialHourForDate && specialHourForDate.is_closed && (
                  <Alert className="bg-red-50/50 border-red-100 mb-6 rounded-2xl p-4">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div className="ml-3">
                      <AlertTitle className="text-red-950 font-black text-xs uppercase tracking-widest mb-1">Negocio cerrado</AlertTitle>
                      <AlertDescription className="text-red-800 text-sm font-medium leading-relaxed">
                        {specialHourForDate.description || `El negocio estará cerrado este día.`}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {specialHourForDate && !specialHourForDate.is_closed && specialHourForDate.open_time && specialHourForDate.close_time && (
                  <Alert className="bg-blue-50/50 border-blue-100 mb-6 rounded-2xl p-4">
                    <Info className="h-5 w-5 text-blue-500" />
                    <div className="ml-3">
                      <AlertTitle className="text-blue-950 font-black text-xs uppercase tracking-widest mb-1">Horario especial</AlertTitle>
                      <AlertDescription className="text-blue-800 text-sm font-medium leading-relaxed">
                        {specialHourForDate.description}
                        <div className="mt-2 text-[10px] font-black uppercase text-blue-600 bg-blue-100/50 w-fit px-2 py-0.5 rounded-full">
                          Atención: {specialHourForDate.open_time.substring(0, 5)} - {specialHourForDate.close_time.substring(0, 5)}
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                )}

                {/* Time Slots Grid or Empty State */}
                {!specialHourForDate?.is_closed && availableSlots.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableSlots.map((slot) => {
                      const isSelected = selectedTime === slot.time
                      return (
                        <Button
                          key={slot.time}
                          variant="ghost"
                          disabled={!slot.available}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`h-12 rounded-xl transition-all duration-300 font-black tracking-tight ${
                            isSelected 
                              ? 'bg-slate-950 text-white shadow-lg scale-105 hover:bg-slate-900 border-none' 
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950 ring-1 ring-slate-200/50 border-none'
                          } disabled:opacity-30`}
                        >
                          {slot.time}
                        </Button>
                      )
                    })}
                  </div>
                ) : !specialHourForDate?.is_closed && (
                  <Alert className="bg-amber-50/50 border-amber-100 rounded-2xl p-4">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <div className="ml-3">
                      <AlertTitle className="text-amber-950 font-black text-xs uppercase tracking-widest mb-1">Sin horarios disponibles</AlertTitle>
                      <AlertDescription className="text-amber-800 text-sm font-medium leading-relaxed">
                        El profesional no tiene disponibilidad en esta fecha. Intenta con otro día.
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
