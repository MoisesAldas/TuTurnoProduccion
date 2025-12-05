'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Calendar, Trash2, Edit, X } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

interface SpecialHour {
  id: string
  special_date: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  reason: string
  description: string | null
}

interface SpecialHoursManagerProps {
  businessId: string
  specialHours: SpecialHour[]
  onUpdate: () => void
}

const specialHourSchema = z.object({
  special_date: z.string().min(1, 'La fecha es requerida'),
  is_closed: z.boolean(),
  open_time: z.string().optional(),
  close_time: z.string().optional(),
  reason: z.enum(['holiday', 'special_event', 'maintenance', 'custom']),
  description: z.string().max(200).optional(),
}).refine((data) => {
  if (!data.is_closed) {
    return !!data.open_time && !!data.close_time
  }
  return true
}, {
  message: 'Debes especificar horarios si no está cerrado',
  path: ['open_time'],
})

type SpecialHourFormData = z.infer<typeof specialHourSchema>

const reasonLabels: Record<string, string> = {
  holiday: 'Feriado',
  special_event: 'Evento Especial',
  maintenance: 'Mantenimiento',
  custom: 'Personalizado',
}

const reasonColors: Record<string, string> = {
  holiday: 'bg-red-100 text-red-700 border-red-200',
  special_event: 'bg-purple-100 text-purple-700 border-purple-200',
  maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  custom: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function SpecialHoursManager({
  businessId,
  specialHours,
  onUpdate,
}: SpecialHoursManagerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isClosedDay, setIsClosedDay] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm<SpecialHourFormData>({
    resolver: zodResolver(specialHourSchema),
    defaultValues: {
      is_closed: true,
      reason: 'holiday',
    }
  })

  const selectedReason = watch('reason')

  const openDialog = (hour?: SpecialHour) => {
    if (hour) {
      setEditingId(hour.id)
      reset({
        special_date: hour.special_date,
        is_closed: hour.is_closed,
        open_time: hour.open_time || '',
        close_time: hour.close_time || '',
        reason: hour.reason as any,
        description: hour.description || '',
      })
      setIsClosedDay(hour.is_closed)
    } else {
      setEditingId(null)
      reset({
        is_closed: true,
        reason: 'holiday',
      })
      setIsClosedDay(true)
    }
    setIsOpen(true)
  }

  const closeDialog = () => {
    setIsOpen(false)
    setEditingId(null)
    reset()
  }

  const onSubmit = async (data: SpecialHourFormData) => {
    try {
      setSubmitting(true)

      const payload = {
        business_id: businessId,
        special_date: data.special_date,
        is_closed: data.is_closed,
        open_time: data.is_closed ? null : data.open_time,
        close_time: data.is_closed ? null : data.close_time,
        reason: data.reason,
        description: data.description || null,
      }

      if (editingId) {
        // Update existing
        const { error } = await supabase
          .from('business_special_hours')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('business_special_hours')
          .insert(payload)

        if (error) throw error
      }

      toast({
        title: editingId ? '¡Horario especial actualizado!' : '¡Horario especial creado!',
        description: `La configuración para ${data.special_date} ha sido guardada.`,
      })
      closeDialog()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving special hour:', error)
      if (error.code === '23505') {
        toast({
          variant: 'destructive',
          title: 'Fecha duplicada',
          description: 'Ya existe un horario especial para esta fecha.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al guardar',
          description: 'No se pudo guardar el horario especial. Intenta de nuevo.',
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const deleteSpecialHour = async (id: string, date: string) => {
    try {
      const { error } = await supabase
        .from('business_special_hours')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Horario especial eliminado',
        description: `La configuración para ${date} ha sido eliminada.`,
      })
      onUpdate()
    } catch (error) {
      console.error('Error deleting special hour:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el horario especial. Intenta de nuevo.',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Lista de horarios especiales */}
      {specialHours.length > 0 && (
        <div className="space-y-3">
          {specialHours.map((hour) => {
            const date = new Date(hour.special_date + 'T00:00:00')

            const currentReasonColors = reasonColors[hour.reason].split(' ').map(cls => {
                if (cls.startsWith('bg-')) return cls.replace('bg-', 'dark:bg-') + '/20'
                if (cls.startsWith('text-')) return cls.replace('text-', 'dark:text-') + '/400'
                if (cls.startsWith('border-')) return cls.replace('border-', 'dark:border-') + '-700'
                return cls
            }).join(' ')

            return (
              <div
                key={hour.id}
                className="border dark:border-gray-700 rounded-lg p-4 flex items-start justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-medium text-gray-900 dark:text-gray-50">
                      {format(date, 'PPP', { locale: es })}
                    </p>
                    <Badge className={currentReasonColors}>
                      {reasonLabels[hour.reason]}
                    </Badge>
                    {hour.is_closed && (
                      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                        Cerrado
                      </Badge>
                    )}
                  </div>
                  {!hour.is_closed && hour.open_time && hour.close_time && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Horario: {hour.open_time.substring(0, 5)} - {hour.close_time.substring(0, 5)}
                    </p>
                  )}
                  {hour.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{hour.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(hour)}
                    className="hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 dark:hover:bg-orange-900/50 dark:hover:text-orange-400 dark:hover:border-orange-700"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => deleteSpecialHour(hour.id, format(date, 'PPP', { locale: es }))}
                    className="hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:hover:bg-red-900/50 dark:hover:text-red-400 dark:hover:border-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Botón para agregar */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            onClick={() => openDialog()}
            className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Horario Especial
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[500px] dark:bg-gray-900">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="dark:text-gray-50">
                {editingId ? 'Editar Horario Especial' : 'Nuevo Horario Especial'}
              </DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Configura horarios especiales, feriados o días cerrados
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Fecha */}
              <div className="space-y-2">
                <Label htmlFor="special_date" className="dark:text-gray-300">Fecha *</Label>
                <Input
                  id="special_date"
                  type="date"
                  {...register('special_date')}
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.special_date && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.special_date.message}</p>
                )}
              </div>

              {/* Tipo de razón */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="dark:text-gray-300">Tipo *</Label>
                <Select
                  value={selectedReason}
                  onValueChange={(value) => setValue('reason', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="holiday">Feriado</SelectItem>
                    <SelectItem value="special_event">Evento Especial</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estado: Cerrado o con horario */}
              <div className="space-y-2">
                <Label className="dark:text-gray-300">Estado</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsClosedDay(true)
                      setValue('is_closed', true)
                    }}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-all ${
                      isClosedDay
                        ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-900/20 dark:text-orange-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    <X className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-sm font-medium dark:text-gray-50">Cerrado</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsClosedDay(false)
                      setValue('is_closed', false)
                    }}
                    className={`flex-1 px-4 py-3 border-2 rounded-lg transition-all ${
                      !isClosedDay
                        ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-900/20 dark:text-orange-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    <Calendar className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-sm font-medium dark:text-gray-50">Horario Especial</p>
                  </button>
                </div>
              </div>

              {/* Horarios (solo si no está cerrado) */}
              {!isClosedDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="open_time" className="dark:text-gray-300">Hora de apertura *</Label>
                    <Input
                      id="open_time"
                      type="time"
                      {...register('open_time')}
                    />
                    {errors.open_time && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.open_time.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="close_time" className="dark:text-gray-300">Hora de cierre *</Label>
                    <Input
                      id="close_time"
                      type="time"
                      {...register('close_time')}
                    />
                    {errors.close_time && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.close_time.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description" className="dark:text-gray-300">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={2}
                  placeholder="Ej: Día de la Independencia, Mantenimiento de equipos..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={submitting}
                className="hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>Guardar</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
