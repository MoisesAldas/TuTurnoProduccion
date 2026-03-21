'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Save, Clock, Info, CheckCircle2, AlertCircle, Copy, Building
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface BusinessHour {
  id: string
  business_id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

interface DaySchedule {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

const daysOfWeek = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' },
]

export default function BusinessHoursPage() {
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState<string>('')
  const [schedules, setSchedules] = useState<DaySchedule[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (authState.user) {
      fetchBusinessHours()
    }
  }, [authState.user])

  const fetchBusinessHours = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener business ID y nombre
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError || !businessData) {
        console.error('Error fetching business:', businessError)
        router.push('/business/setup')
        return
      }

      setBusinessId(businessData.id)
      setBusinessName(businessData.name || '')

      // Obtener horarios existentes
      const { data: hoursData, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessData.id)
        .order('day_of_week', { ascending: true })

      if (hoursError) {
        console.error('Error fetching hours:', hoursError)
      }

      // Inicializar todos los días (0-6)
      const initialSchedules: DaySchedule[] = daysOfWeek.map(day => {
        const existingHour = hoursData?.find(h => h.day_of_week === day.value)

        return {
          day_of_week: day.value,
          open_time: existingHour?.open_time || '09:00',
          close_time: existingHour?.close_time || '18:00',
          is_closed: existingHour?.is_closed ?? (day.value === 0), // Domingo cerrado por defecto
        }
      })

      setSchedules(initialSchedules)

    } catch (error) {
      console.error('Error fetching business hours:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSchedule = (dayOfWeek: number, field: keyof DaySchedule, value: any) => {
    setSchedules(prev => prev.map(schedule =>
      schedule.day_of_week === dayOfWeek
        ? { ...schedule, [field]: value }
        : schedule
    ))
    setHasChanges(true)
  }

  const copyToAllDays = (dayOfWeek: number) => {
    const sourceSchedule = schedules.find(s => s.day_of_week === dayOfWeek)
    if (!sourceSchedule) return

    setSchedules(prev => prev.map(schedule => ({
      ...schedule,
      open_time: sourceSchedule.open_time,
      close_time: sourceSchedule.close_time,
      // No copiar is_closed, solo horarios
    })))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!businessId) return

    try {
      setSubmitting(true)

      // Eliminar horarios existentes y crear nuevos
      const { error: deleteError } = await supabase
        .from('business_hours')
        .delete()
        .eq('business_id', businessId)

      if (deleteError) throw deleteError

      // Insertar nuevos horarios
      const hoursToInsert = schedules.map(schedule => ({
        business_id: businessId,
        day_of_week: schedule.day_of_week,
        open_time: schedule.is_closed ? '00:00' : schedule.open_time,
        close_time: schedule.is_closed ? '00:00' : schedule.close_time,
        is_closed: schedule.is_closed,
      }))

      const { error: insertError } = await supabase
        .from('business_hours')
        .insert(hoursToInsert)

      if (insertError) throw insertError

      toast({
        title: '¡Horarios guardados exitosamente!',
        description: 'Los horarios de atención de tu negocio han sido actualizados.',
      })
      setHasChanges(false)
      await fetchBusinessHours()

    } catch (error) {
      console.error('Error saving hours:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar los horarios',
        description: 'Por favor intenta de nuevo.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900/30 rounded-[2rem]"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-[2rem] animate-spin shadow-[0_0_15px_rgba(234,88,12,0.2)]"></div>
          </div>
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">
            Configurando Horarios...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="w-full space-y-8">
        {/* Premium Header - Integrated (No Blur/Sticky) */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="relative pl-6">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-0.5">
                Configuración {businessName && `• ${businessName}`}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">
                Horarios de <span className="text-orange-600">Atención</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={submitting || !hasChanges}
              className="bg-orange-600 hover:bg-orange-700 text-white rounded-2xl h-12 px-6 shadow-[0_10px_20px_rgba(234,88,12,0.15)] hover:shadow-[0_15px_30px_rgba(234,88,12,0.25)] transition-all duration-300 disabled:opacity-50 font-bold"
            >
              {submitting ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar Horarios
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="space-y-8">
        {/* Info Alert - Glass Style */}
        <div className="relative group overflow-hidden bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)]">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-50 uppercase tracking-wider mb-1">Información Importante</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Estos horarios determinan tu disponibilidad pública. Para configurar excepciones como feriados o periodos de vacaciones, visita los <Link href="/dashboard/business/settings/advanced" className="text-orange-600 font-bold hover:underline">Ajustes Avanzados</Link>.
              </p>
            </div>
          </div>
        </div>

        {/* Schedule Container - Premium Card */}
        <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] overflow-hidden border border-white dark:border-gray-800/50">
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Día de la Semana</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Horario Apertura</th>
                  <th className="px-8 py-6 text-left text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Horario Cierre</th>
                  <th className="px-8 py-6 text-center text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Sincronizar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {daysOfWeek.map(day => {
                  const schedule = schedules.find(s => s.day_of_week === day.value)
                  if (!schedule) return null

                  return (
                    <tr
                      key={day.value}
                      className={`group transition-all duration-300 ${
                        schedule.is_closed ? 'bg-gray-50/30 dark:bg-slate-900/10' : 'hover:bg-orange-50/30 dark:hover:bg-orange-900/5'
                      }`}
                    >
                      {/* Día */}
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-12 h-12 rounded-[1.25rem] flex items-center justify-center flex-shrink-0 transition-all duration-500
                            ${schedule.is_closed
                              ? 'bg-gray-100 dark:bg-gray-800 rotate-0'
                              : 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_5px_15px_rgba(234,88,12,0.2)] rotate-3 group-hover:rotate-0'
                            }
                          `}>
                            <Clock className={`w-5 h-5 ${
                              schedule.is_closed ? 'text-gray-400 dark:text-gray-500' : 'text-white'
                            }`} />
                          </div>
                          <div>
                            <span className={`text-base font-black tracking-tight leading-tight ${
                              schedule.is_closed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-50'
                            }`}>{day.label}</span>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center">
                          <div className={`
                            flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-300
                            ${schedule.is_closed 
                              ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-400' 
                              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-100 dark:border-orange-800/50 shadow-sm'
                            }
                          `}>
                            <span className="text-xs font-black uppercase tracking-widest leading-none">
                              {schedule.is_closed ? 'Cerrado' : 'Abierto'}
                            </span>
                            <Switch
                              checked={!schedule.is_closed}
                              onCheckedChange={(checked) => updateSchedule(day.value, 'is_closed', !checked)}
                              className="data-[state=checked]:bg-orange-600 scale-90"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Apertura */}
                      <td className="px-8 py-6 text-center">
                        <div className="relative group/input max-w-[140px]">
                          <Input
                            type="time"
                            value={schedule.open_time}
                            onChange={(e) => updateSchedule(day.value, 'open_time', e.target.value)}
                            disabled={schedule.is_closed}
                            className="h-12 w-full text-center font-black tracking-widest rounded-xl border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 focus:border-orange-500 focus:ring-orange-500 transition-all shadow-sm disabled:opacity-30"
                          />
                        </div>
                      </td>

                      {/* Cierre */}
                      <td className="px-8 py-6 text-center">
                        <div className="relative group/input max-w-[140px]">
                          <Input
                            type="time"
                            value={schedule.close_time}
                            onChange={(e) => updateSchedule(day.value, 'close_time', e.target.value)}
                            disabled={schedule.is_closed}
                            className="h-12 w-full text-center font-black tracking-widest rounded-xl border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 focus:border-orange-500 focus:ring-orange-500 transition-all shadow-sm disabled:opacity-30"
                          />
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-8 py-6">
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToAllDays(day.value)}
                            disabled={schedule.is_closed}
                            className="h-11 w-11 rounded-2xl hover:bg-orange-600 hover:text-white transition-all duration-300 disabled:opacity-30"
                            title="Copiar horarios a todos los días"
                          >
                            <Copy className="w-5 h-5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Compact View */}
          <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-800/50">
            {daysOfWeek.map(day => {
              const schedule = schedules.find(s => s.day_of_week === day.value)
              if (!schedule) return null

              return (
                <div
                  key={day.value}
                  className={`p-6 transition-all duration-300 ${
                    schedule.is_closed ? 'bg-gray-50/30' : 'bg-white dark:bg-gray-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`
                        w-12 h-12 rounded-[1.25rem] flex items-center justify-center flex-shrink-0
                        ${schedule.is_closed
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg text-white'
                        }
                      `}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className={`text-lg font-black tracking-tight ${
                        schedule.is_closed ? 'text-gray-300' : 'text-gray-900 dark:text-gray-50'
                      }`}>{day.label}</span>
                    </div>

                    <div className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-xl
                      ${schedule.is_closed 
                        ? 'bg-gray-100/50 dark:bg-gray-800/50 text-gray-400' 
                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 border border-orange-100 dark:border-orange-800/50'
                      }
                    `}>
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        {schedule.is_closed ? 'Cerrado' : 'Abierto'}
                      </span>
                      <Switch
                        checked={!schedule.is_closed}
                        onCheckedChange={(checked) => updateSchedule(day.value, 'is_closed', !checked)}
                        className="scale-75"
                      />
                    </div>
                  </div>

                  {!schedule.is_closed && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Apertura</Label>
                        <Input
                          type="time"
                          value={schedule.open_time}
                          onChange={(e) => updateSchedule(day.value, 'open_time', e.target.value)}
                          className="h-12 font-black tracking-widest text-center rounded-2xl bg-white/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 focus:border-orange-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cierre</Label>
                        <Input
                          type="time"
                          value={schedule.close_time}
                          onChange={(e) => updateSchedule(day.value, 'close_time', e.target.value)}
                          className="h-12 font-black tracking-widest text-center rounded-2xl bg-white/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 focus:border-orange-500"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copyToAllDays(day.value)}
                        className="col-span-2 h-12 rounded-2xl border-gray-100 dark:border-gray-800 font-bold text-xs uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Sincronizar horarios
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Resumen visual de cambios pendientes */}
        {hasChanges && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-50">
                  Tienes cambios sin guardar
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                  Haz clic en "Guardar Horarios" en la parte superior para aplicar los cambios.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
