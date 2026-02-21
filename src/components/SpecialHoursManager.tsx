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

      // NUEVO: Si es un día cerrado, marcar citas como pending
      let affectedCount = 0
      if (data.is_closed) {
        affectedCount = await markAffectedAppointmentsAsPending(data.special_date)
      }

      // Toast con información completa
      if (data.is_closed && affectedCount > 0) {
        toast({
          title: editingId ? '¡Horario especial actualizado!' : '¡Horario especial creado!',
          description: `${affectedCount} cita(s) requieren reprogramación. Los clientes serán notificados por email.`,
        })
      } else {
        toast({
          title: editingId ? '¡Horario especial actualizado!' : '¡Horario especial creado!',
          description: `La configuración para ${data.special_date} ha sido guardada.`,
        })
      }
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

  const markAffectedAppointmentsAsPending = async (specialDate: string): Promise<number> => {
    try {
      // 1. Obtener citas afectadas (solo confirmed)
      const { data: affectedAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          users(email, first_name, last_name),
          appointment_services(service:services(name))
        `)
        .eq('appointment_date', specialDate)
        .eq('business_id', businessId)
        .eq('status', 'confirmed')

      if (fetchError) throw fetchError
      
      if (!affectedAppointments || affectedAppointments.length === 0) {
        console.log('No hay citas confirmadas para ese día')
        return 0
      }

      // 2. Actualizar status a pending
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'pending',
          pending_reason: 'business_closed',
          updated_at: new Date().toISOString()
        })
        .eq('appointment_date', specialDate)
        .eq('business_id', businessId)
        .eq('status', 'confirmed')

      if (updateError) throw updateError

      console.log(`✅ ${affectedAppointments.length} cita(s) marcadas como pending`)

      // 3. Encolar mensajes para envío de emails (usando sistema PGMQ existente)
      for (const appointment of affectedAppointments) {
        try {
          console.log('🔍 SPECIAL HOURS DEBUG: Processing appointment:', appointment)
          
          const messageData = {
            appointment_id: appointment.id,
            type: 'reschedule_required',
            closed_date: specialDate,
            reason: 'business_closed'
          }
          console.log('🔍 SPECIAL HOURS DEBUG: messageData:', messageData)
          console.log('🔍 SPECIAL HOURS DEBUG: Calling pgmq_send with queue: email_reschedule_required')
          
          // Encolar mensaje en la cola de emails
          const { error: queueError } = await supabase.rpc('pgmq_send', {
            queue_name: 'email_reschedule_required',
            msg: messageData
          })

          if (queueError) {
            console.error(`Error encolando email para cita ${appointment.id}:`, queueError)
          } else {
            console.log(`📧 Email encolado para cita ${appointment.id}`)
          }
        } catch (emailError) {
          console.error('Error encolando email:', emailError)
          // Continuar con los demás emails aunque uno falle
        }
      }

      console.log(`✅ ${affectedAppointments.length} cita(s) marcadas como pending y notificadas`)
      return affectedAppointments.length

    } catch (error) {
      console.error('Error marking appointments as pending:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron marcar las citas para reprogramación.',
      })
      return 0
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
                className="group relative bg-white dark:bg-gray-800/40 hover:bg-orange-50/30 dark:hover:bg-orange-950/10 border-0 shadow-[0_4px_20px_rgba(0,0,0,0.02)] dark:shadow-none p-4 rounded-2xl transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0 pl-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="text-[13px] font-black text-gray-900 dark:text-gray-50 uppercase tracking-tight">
                        {format(date, 'PPP', { locale: es })}
                      </p>
                      <Badge className={`${currentReasonColors} text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-0 rounded-lg`}>
                        {reasonLabels[hour.reason]}
                      </Badge>
                      {hour.is_closed && (
                        <Badge variant="secondary" className="bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border-0 rounded-lg">
                          Cerrado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {!hour.is_closed && hour.open_time && hour.close_time && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-lg">
                          <Plus className="w-3 h-3 text-orange-600" />
                          {hour.open_time.substring(0, 5)} - {hour.close_time.substring(0, 5)}
                        </div>
                      )}
                      {hour.description && (
                        <p className="text-[11px] font-medium text-gray-400 italic truncate max-w-[200px]">{hour.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => openDialog(hour)}
                      className="w-8 h-8 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/40 text-orange-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSpecialHour(hour.id, format(date, 'PPP', { locale: es }))}
                      className="w-8 h-8 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Botón para agregar */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Button
          type="button"
          onClick={() => openDialog()}
          className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl shadow-lg shadow-orange-600/20 text-[11px] font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Agregar Horario Especial
        </Button>

        <DialogContent className="sm:max-w-[500px] dark:bg-gray-900">
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogHeader className="px-6 pt-6 pb-2">
              <div className="flex flex-col gap-0.5 relative pl-5">
                <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                  {editingId ? 'MODIFICAR' : 'CREAR NUEVO'}
                </span>
                <DialogTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                  Horario Especial
                </DialogTitle>
              </div>
              <DialogDescription className="px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">
                Ajusta la disponibilidad para fechas específicas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fecha */}
                <div className="space-y-1.5">
                  <Label htmlFor="special_date" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Fecha *</Label>
                  <Input
                    id="special_date"
                    type="date"
                    {...register('special_date')}
                    className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {errors.special_date && (
                    <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tight">{errors.special_date.message}</p>
                  )}
                </div>

                {/* Tipo de razón */}
                <div className="space-y-1.5">
                  <Label htmlFor="reason" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo *</Label>
                  <Select
                    value={selectedReason}
                    onValueChange={(value) => setValue('reason', value as any)}
                  >
                    <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm">
                      <SelectValue placeholder="Selecciona" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-0 shadow-2xl">
                      <SelectItem value="holiday" className="rounded-xl">Feriado</SelectItem>
                      <SelectItem value="special_event" className="rounded-xl">Evento Especial</SelectItem>
                      <SelectItem value="maintenance" className="rounded-xl">Mantenimiento</SelectItem>
                      <SelectItem value="custom" className="rounded-xl">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Estado: Cerrado o con horario */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Estado de Disponibilidad</Label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsClosedDay(true)
                      setValue('is_closed', true)
                    }}
                    className={`flex-1 px-4 py-3 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 border-2 ${
                      isClosedDay
                        ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500/50 dark:bg-orange-950/20 dark:text-orange-400'
                        : 'border-transparent bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <X className={`w-5 h-5 ${isClosedDay ? 'text-orange-500' : 'text-gray-300'}`} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Cerrado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsClosedDay(false)
                      setValue('is_closed', false)
                    }}
                    className={`flex-1 px-4 py-3 rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1.5 border-2 ${
                      !isClosedDay
                        ? 'border-orange-500 bg-orange-50 text-orange-700 dark:border-orange-500/50 dark:bg-orange-950/20 dark:text-orange-400'
                        : 'border-transparent bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Calendar className={`w-5 h-5 ${!isClosedDay ? 'text-orange-500' : 'text-gray-300'}`} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Abierto</span>
                  </button>
                </div>
              </div>

              {/* Horarios (solo si no está cerrado) */}
              {!isClosedDay && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <Label htmlFor="open_time" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Apertura *</Label>
                    <Input
                      id="open_time"
                      type="time"
                      {...register('open_time')}
                      className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                    />
                    {errors.open_time && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tight">{errors.open_time.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="close_time" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cierre *</Label>
                    <Input
                      id="close_time"
                      type="time"
                      {...register('close_time')}
                      className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                    />
                    {errors.close_time && (
                      <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tight">{errors.close_time.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nota Adicional (Opcional)</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  rows={2}
                  className="rounded-2xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm resize-none"
                  placeholder="Ej: Solo eventos corporativos..."
                />
              </div>
            </div>

            <DialogFooter className="px-6 pb-6 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeDialog}
                disabled={submitting}
                className="rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-8 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-orange-600/20"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>Guardar Cambios</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
