'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Save, Clock, Info, CheckCircle2, AlertCircle, Copy
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

      // Obtener business ID
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError || !businessData) {
        console.error('Error fetching business:', businessError)
        router.push('/business/setup')
        return
      }

      setBusinessId(businessData.id)

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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando horarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
              Horarios de Atención
            </h1>
            <p className="text-lg text-gray-600">
              Configura los horarios de atención de tu negocio
            </p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 w-fit px-4 py-2">
            <Clock className="w-4 h-4 mr-2" />
            Horarios
          </Badge>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              Estos horarios se mostrarán a tus clientes y determinarán la disponibilidad para reservas.
              Los horarios especiales (feriados, eventos) se configuran en <Link href="/dashboard/business/settings/advanced" className="underline font-medium">Ajustes Avanzados</Link>.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Días de la semana */}
        <div className="space-y-4">
          {daysOfWeek.map(day => {
            const schedule = schedules.find(s => s.day_of_week === day.value)
            if (!schedule) return null

            return (
              <Card
                key={day.value}
                className={`hover:shadow-lg transition-shadow border-t-4 ${
                  schedule.is_closed
                    ? 'border-t-gray-400 bg-gray-50'
                    : 'border-t-orange-500'
                }`}
              >
                <CardHeader className="border-b bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        schedule.is_closed
                          ? 'bg-gray-100'
                          : 'bg-orange-100'
                      }`}>
                        <Clock className={`w-5 h-5 ${
                          schedule.is_closed ? 'text-gray-600' : 'text-orange-600'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {day.label}
                        </CardTitle>
                        <CardDescription>
                          {schedule.is_closed ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-700 mt-1">
                              Cerrado
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-600 mt-1 inline-block">
                              {schedule.open_time} - {schedule.close_time}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Toggle Cerrado/Abierto */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateSchedule(day.value, 'is_closed', !schedule.is_closed)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          schedule.is_closed ? 'bg-gray-300' : 'bg-orange-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            schedule.is_closed ? 'translate-x-1' : 'translate-x-6'
                          }`}
                        />
                      </button>
                      <span className="text-sm font-medium text-gray-700">
                        {schedule.is_closed ? 'Cerrado' : 'Abierto'}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {!schedule.is_closed && (
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Horarios */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`open-${day.value}`}>Hora de apertura</Label>
                          <Input
                            id={`open-${day.value}`}
                            type="time"
                            value={schedule.open_time}
                            onChange={(e) => updateSchedule(day.value, 'open_time', e.target.value)}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`close-${day.value}`}>Hora de cierre</Label>
                          <Input
                            id={`close-${day.value}`}
                            type="time"
                            value={schedule.close_time}
                            onChange={(e) => updateSchedule(day.value, 'close_time', e.target.value)}
                            className="font-mono"
                          />
                        </div>
                      </div>

                      {/* Copiar a todos los días */}
                      <div className="pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToAllDays(day.value)}
                          className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar horarios a todos los días
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm py-4 border-t mt-6">
          <Link href="/dashboard/business" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto hover:bg-gray-100 transition-colors">
              Cancelar
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            disabled={submitting || !hasChanges}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Resumen visual */}
        {hasChanges && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-900">
                  Tienes cambios sin guardar
                </p>
                <p className="text-sm text-yellow-800 mt-1">
                  Recuerda hacer clic en "Guardar Horarios" para aplicar los cambios.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
