import React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, Info } from 'lucide-react'

interface DateTimeStepProps {
  appointmentDate: string
  setAppointmentDate: (date: string) => void
  startTime: string
  setStartTime: (time: string) => void
  endTime: string
  duration: number
}

export function DateTimeStep({
  appointmentDate, setAppointmentDate,
  startTime, setStartTime,
  endTime, duration
}: DateTimeStepProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
            <Calendar className="w-4 h-4 text-primary" />
            Fecha de la Cita *
          </Label>
          <div className="relative group">
            <Input
              id="date"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 focus-visible:ring-primary shadow-sm text-sm font-bold dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4 text-primary" />
            Hora de Inicio *
          </Label>
          <div className="relative group">
            <Input
              id="time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 focus-visible:ring-primary shadow-sm text-sm font-bold dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-primary/5 to-amber-50/50 dark:from-primary/10 dark:to-orange-950/10 border-2 border-primary/10 dark:border-primary/20 rounded-2xl p-4 relative overflow-hidden group">
        <div className="absolute -right-4 -bottom-4 p-4 opacity-5 rotate-12 transition-transform group-hover:rotate-0 duration-700">
          <Clock className="w-40 h-40 text-primary" />
        </div>
        
        <div className="relative z-10 space-y-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-primary/80 dark:text-primary">Cálculo de Horario</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-3 border border-white/50 dark:border-gray-800 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Duración Total</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">{duration} <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase ml-1">min</span></span>
            </div>
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-3 border border-white/50 dark:border-gray-800 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block mb-1">Hora Término</span>
              <span className="text-lg font-black text-gray-900 dark:text-white">{endTime} <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase ml-1">aprox.</span></span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-[10px] text-primary/70 dark:text-primary font-bold uppercase tracking-tight">
            <Info className="w-3.5 h-3.5" />
            <span>El sistema bloquea la agenda basándose en este rango de tiempo.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
