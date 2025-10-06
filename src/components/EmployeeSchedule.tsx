'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Clock, Save, AlertCircle, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'

interface EmployeeScheduleProps {
  employeeId: string
  onSave?: () => void
}

interface ScheduleDay {
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

const daysOfWeek = [
  { value: 0, label: 'Domingo', short: 'Dom' },
  { value: 1, label: 'Lunes', short: 'Lun' },
  { value: 2, label: 'Martes', short: 'Mar' },
  { value: 3, label: 'Miércoles', short: 'Mié' },
  { value: 4, label: 'Jueves', short: 'Jue' },
  { value: 5, label: 'Viernes', short: 'Vie' },
  { value: 6, label: 'Sábado', short: 'Sáb' }
]

export default function EmployeeSchedule({ employeeId, onSave }: EmployeeScheduleProps) {
  const [schedules, setSchedules] = useState<ScheduleDay[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Inicializar horarios por defecto
  const initializeDefaultSchedules = () => {
    return daysOfWeek.map(day => ({
      day_of_week: day.value,
      start_time: '09:00',
      end_time: '17:00',
      is_available: day.value >= 1 && day.value <= 5 // Lunes a Viernes por defecto
    }))
  }

  useEffect(() => {
    if (employeeId) {
      fetchSchedules()
    }
  }, [employeeId])

  const fetchSchedules = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week')

      if (error) {
        console.error('Error fetching schedules:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudieron cargar los horarios'
        })
        return
      }

      if (data && data.length > 0) {
        // Mapear los datos existentes
        const scheduleMap = new Map(data.map(schedule => [schedule.day_of_week, schedule]))

        const completeSchedules = daysOfWeek.map(day => {
          const existing = scheduleMap.get(day.value)
          return existing ? {
            day_of_week: existing.day_of_week,
            start_time: existing.start_time,
            end_time: existing.end_time,
            is_available: existing.is_available
          } : {
            day_of_week: day.value,
            start_time: '09:00',
            end_time: '17:00',
            is_available: false
          }
        })

        setSchedules(completeSchedules)
      } else {
        // Si no hay horarios, usar valores por defecto
        setSchedules(initializeDefaultSchedules())
      }
    } catch (error) {
      console.error('Error fetching schedules:', error)
      setSchedules(initializeDefaultSchedules())
    } finally {
      setLoading(false)
    }
  }

  const updateSchedule = (dayOfWeek: number, field: keyof ScheduleDay, value: string | boolean) => {
    setSchedules(prev => prev.map(schedule =>
      schedule.day_of_week === dayOfWeek
        ? { ...schedule, [field]: value }
        : schedule
    ))
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Primero eliminar horarios existentes
      await supabase
        .from('employee_schedules')
        .delete()
        .eq('employee_id', employeeId)

      // Insertar solo los días disponibles
      const activeSchedules = schedules
        .filter(schedule => schedule.is_available)
        .map(schedule => ({
          employee_id: employeeId,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          is_available: schedule.is_available
        }))

      if (activeSchedules.length > 0) {
        const { error } = await supabase
          .from('employee_schedules')
          .insert(activeSchedules)

        if (error) {
          console.error('Error saving schedules:', error)
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudieron guardar los horarios'
          })
          return
        }
      }

      toast({
        title: 'Éxito',
        description: 'Horarios guardados correctamente'
      })
      onSave?.()

    } catch (error) {
      console.error('Error saving schedules:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al guardar los horarios'
      })
    } finally {
      setSaving(false)
    }
  }

  const validateTime = (startTime: string, endTime: string): boolean => {
    return startTime < endTime
  }

  const copyToAllDays = (sourceDay: ScheduleDay) => {
    setSchedules(prev => prev.map(schedule => ({
      ...schedule,
      start_time: sourceDay.start_time,
      end_time: sourceDay.end_time
    })))
    toast({
      title: 'Horarios copiados',
      description: 'Los horarios se copiaron a todos los días'
    })
  }

  if (loading) {
    return (
      <Card className="border-t-4 border-t-orange-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full mr-3"></div>
            <span className="text-gray-600">Cargando horarios...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-t-4 border-t-orange-500 hover:shadow-lg transition-shadow">
      <CardHeader className="border-b bg-white">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <span>Horarios de Trabajo</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="text-sm text-gray-700 bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-900 mb-1">Configuración de disponibilidad</p>
              <p className="text-orange-800">Configura los días y horarios en que este empleado estará disponible para atender citas.</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {daysOfWeek.map((day) => {
            const schedule = schedules.find(s => s.day_of_week === day.value)
            if (!schedule) return null

            const timeError = schedule.is_available && !validateTime(schedule.start_time, schedule.end_time)

            return (
              <div
                key={day.value}
                className={`border-2 rounded-lg p-4 transition-all ${
                  schedule.is_available
                    ? 'border-orange-200 bg-orange-50/30'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={schedule.is_available}
                      onCheckedChange={(checked) =>
                        updateSchedule(day.value, 'is_available', checked)
                      }
                      className="data-[state=checked]:bg-orange-600"
                    />
                    <Label className="text-base font-medium cursor-pointer min-w-[80px] sm:min-w-[100px]">
                      <span className="hidden sm:inline">{day.label}</span>
                      <span className="sm:hidden">{day.short}</span>
                    </Label>
                  </div>

                  {schedule.is_available && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToAllDays(schedule)}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700 text-xs sm:text-sm w-full sm:w-auto"
                    >
                      <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Copiar a todos</span>
                      <span className="sm:hidden">Copiar</span>
                    </Button>
                  )}
                </div>

                {schedule.is_available && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm text-gray-600 mb-1.5 block">
                        Hora de inicio
                      </Label>
                      <Input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) =>
                          updateSchedule(day.value, 'start_time', e.target.value)
                        }
                        className={`text-sm ${timeError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-orange-500'}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm text-gray-600 mb-1.5 block">
                        Hora de fin
                      </Label>
                      <Input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) =>
                          updateSchedule(day.value, 'end_time', e.target.value)
                        }
                        className={`text-sm ${timeError ? 'border-red-500 focus:ring-red-500' : 'focus:ring-orange-500'}`}
                      />
                    </div>
                    {timeError && (
                      <div className="col-span-2 text-xs sm:text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                        ⚠️ La hora de inicio debe ser menor que la hora de fin
                      </div>
                    )}
                  </div>
                )}

                {!schedule.is_available && (
                  <div className="text-sm text-gray-500 italic text-center py-2">
                    No disponible este día
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving || schedules.some(s =>
              s.is_available && !validateTime(s.start_time, s.end_time)
            )}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
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
      </CardContent>
    </Card>
  )
}
