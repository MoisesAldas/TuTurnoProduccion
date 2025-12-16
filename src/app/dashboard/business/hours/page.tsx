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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando horarios</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Obteniendo configuración de tu negocio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">Horarios de Atención</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configura los horarios de atención de tu negocio
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {businessName && (
                <Badge className="hidden sm:flex bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
                  <Building className="w-4 h-4 mr-2" />
                  {businessName}
                </Badge>
              )}
              <Button
                onClick={handleSave}
                disabled={submitting || !hasChanges}
                className="w-full sm:w-auto  bg-orange-600 hover:bg-orange-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Horarios
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
              {/* Info Alert */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 dark:text-blue-200">
                    Estos horarios se mostrarán a tus clientes y determinarán la disponibilidad para reservas.
                    Los horarios especiales (feriados, eventos) se configuran en <Link href="/dashboard/business/settings/advanced" className="underline font-medium">Ajustes Avanzados</Link>.
                  </p>
                </div>
              </div>        {/* Días de la semana - Vista Compacta */}
        <Card className="overflow-hidden shadow-md border-gray-200 dark:border-gray-700">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border-b-2 border-orange-200 dark:border-orange-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-gray-50">Día</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-50">Estado</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-gray-50">Apertura</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-gray-50">Cierre</th>
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-50">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {daysOfWeek.map(day => {
                  const schedule = schedules.find(s => s.day_of_week === day.value)
                  if (!schedule) return null

                  return (
                    <tr
                      key={day.value}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                        schedule.is_closed ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''
                      }`}
                    >
                      {/* Día */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`
                            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                            ${schedule.is_closed
                              ? 'bg-gray-100 dark:bg-gray-700'
                              : 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900'
                            }
                          `}>
                            <Clock className={`w-5 h-5 ${
                              schedule.is_closed ? 'text-gray-600 dark:text-gray-400' : 'text-orange-600 dark:text-orange-400'
                            }`} />
                          </div>
                          <span className="font-semibold text-gray-900 dark:text-gray-50">{day.label}</span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <div className="flex items-center gap-2 bg-orange-50/50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 rounded-lg px-3 py-1.5">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {schedule.is_closed ? 'Cerrado' : 'Abierto'}
                            </span>
                            <Switch
                              checked={!schedule.is_closed}
                              onCheckedChange={(checked) => updateSchedule(day.value, 'is_closed', !checked)}
                              className="data-[state=checked]:bg-orange-600"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Apertura */}
                      <td className="px-4 py-3">
                        <Input
                          type="time"
                          value={schedule.open_time}
                          onChange={(e) => updateSchedule(day.value, 'open_time', e.target.value)}
                          disabled={schedule.is_closed}
                          className="h-9 w-32 font-mono focus:border-orange-500 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Cierre */}
                      <td className="px-4 py-3">
                        <Input
                          type="time"
                          value={schedule.close_time}
                          onChange={(e) => updateSchedule(day.value, 'close_time', e.target.value)}
                          disabled={schedule.is_closed}
                          className="h-9 w-32 font-mono focus:border-orange-500 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => copyToAllDays(day.value)}
                            disabled={schedule.is_closed}
                            className="h-9 w-9 p-0 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700"
                            title="Copiar horarios a todos los días"
                          >
                            <Copy className="w-4 h-4" />
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
          <div className="lg:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {daysOfWeek.map(day => {
              const schedule = schedules.find(s => s.day_of_week === day.value)
              if (!schedule) return null

              return (
                <div
                  key={day.value}
                  className={`p-4 ${schedule.is_closed ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''}`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                        ${schedule.is_closed
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900'
                        }
                      `}>
                        <Clock className={`w-5 h-5 ${
                          schedule.is_closed ? 'text-gray-600 dark:text-gray-400' : 'text-orange-600 dark:text-orange-400'
                        }`} />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-50">{day.label}</span>
                    </div>

                    {/* Estado Toggle */}
                    <div className="flex items-center gap-2 bg-orange-50/50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {schedule.is_closed ? 'Cerrado' : 'Abierto'}
                      </span>
                      <Switch
                        checked={!schedule.is_closed}
                        onCheckedChange={(checked) => updateSchedule(day.value, 'is_closed', !checked)}
                        className="data-[state=checked]:bg-orange-600"
                      />
                    </div>
                  </div>

                  {/* Horarios */}
                  {!schedule.is_closed && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`open-${day.value}`} className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                            Apertura
                          </Label>
                          <Input
                            id={`open-${day.value}`}
                            type="time"
                            value={schedule.open_time}
                            onChange={(e) => updateSchedule(day.value, 'open_time', e.target.value)}
                            className="h-9 font-mono text-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`close-${day.value}`} className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 block">
                            Cierre
                          </Label>
                          <Input
                            id={`close-${day.value}`}
                            type="time"
                            value={schedule.close_time}
                            onChange={(e) => updateSchedule(day.value, 'close_time', e.target.value)}
                            className="h-9 font-mono text-sm focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Copy Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToAllDays(day.value)}
                        className="w-full h-9 text-xs hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copiar a todos los días
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

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
  )
}
