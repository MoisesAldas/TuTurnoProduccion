'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, DollarSign, Clock, AlertCircle, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { serviceFormSchema, type ServiceFormData } from '@/lib/validation'
import type { Service } from '@/types/database'

const durationOptions = [
  { value: '15', label: '15 minutos' },
  { value: '30', label: '30 minutos' },
  { value: '45', label: '45 minutos' },
  { value: '60', label: '1 hora' },
  { value: '90', label: '1 hora 30 minutos' },
  { value: '120', label: '2 horas' },
  { value: '150', label: '2 horas 30 minutos' },
  { value: '180', label: '3 horas' },
  { value: '240', label: '4 horas' },
  { value: '300', label: '5 horas' },
  { value: '360', label: '6 horas' },
  { value: '480', label: '8 horas' }
]

interface EditServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  onSuccess: () => void
}

export default function EditServiceModal({
  open,
  onOpenChange,
  service,
  onSuccess
}: EditServiceModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      duration_minutes: '',
      is_active: true
    },
    mode: 'onChange'
  })

  const isActive = watch('is_active')
  const durationMinutesValue = watch('duration_minutes')

  // Reset form when service changes
  useEffect(() => {
    if (service) {
      reset({
        name: service.name,
        description: service.description || '',
        price: service.price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        is_active: service.is_active
      })
    }
  }, [service, reset])

  const onSubmit = async (formData: ServiceFormData) => {
    if (!service) return

    try {
      setSubmitting(true)

      const price = parseFloat(formData.price)
      const duration = parseInt(formData.duration_minutes)

      if (isNaN(price) || price < 0) {
        toast({
          title: 'Error',
          description: 'El precio debe ser un número válido mayor o igual a 0',
          variant: 'destructive'
        })
        return
      }

      if (isNaN(duration) || duration < 15) {
        toast({
          title: 'Error',
          description: 'La duración debe ser un número válido mayor o igual a 15 minutos',
          variant: 'destructive'
        })
        return
      }

      const { error } = await supabase
        .from('services')
        .update({
          name: formData.name,
          description: formData.description || null,
          price: price,
          duration_minutes: duration,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) {
        console.error('Error updating service:', error)
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el servicio',
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Servicio actualizado',
          description: 'El servicio fue actualizado correctamente'
        })
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('Error updating service:', error)
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el servicio',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!service) return

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id)

      if (error) {
        console.error('Error deleting service:', error)
        toast({
          title: 'Error',
          description: 'No se pudo eliminar el servicio',
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Servicio eliminado',
          description: 'El servicio fue eliminado correctamente'
        })
        setDeleteDialogOpen(false)
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el servicio',
        variant: 'destructive'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!service) return null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden">
        <div className="px-6 py-8 sm:px-8">
          <DialogHeader className="mb-6">
            <div className="flex flex-col gap-0.5 relative pl-5">
              <div className="absolute left-0 w-1 h-6 bg-primary rounded-full mt-0.5" />
              <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary">Editar Servicio</span>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white italic">
                {service.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium text-gray-500 dark:text-gray-400 pl-5">
              Modifica la información o el estado de venta del servicio
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
            {/* Nombre del servicio */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">
                Nombre del Servicio *
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ej: Corte de cabello, Manicura..."
                className={`h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary ${errors.name ? 'border-red-500' : ''}`}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">
                Descripción
              </Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe brevemente el servicio..."
                rows={2}
                className="rounded-2xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary text-sm min-h-[80px] resize-none"
              />
            </div>

            {/* Precio y duración */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Precio */}
              <div className="space-y-2">
                <Label htmlFor="price" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">
                  Precio Sugerido *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register('price')}
                    className={`pl-11 h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary ${errors.price ? 'border-red-500' : ''}`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Duración */}
              <div className="space-y-2">
                <Label htmlFor="duration_minutes" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">
                  Duración Estimada *
                </Label>
                <Select
                  value={durationMinutesValue}
                  onValueChange={(value) => setValue('duration_minutes', value, { shouldValidate: true })}
                >
                  <SelectTrigger className="h-12 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 rounded-xl focus:ring-primary font-bold text-gray-900 dark:text-white">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-3 text-gray-400" />
                      <SelectValue placeholder="Selecciona" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-gray-100 dark:border-gray-800 dark:bg-gray-900 shadow-2xl font-bold">
                    {durationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estado del servicio */}
            <div className="p-5 bg-orange-50/30 dark:bg-orange-950/10 border-2 border-orange-100 dark:border-orange-900/30 rounded-[2rem] flex items-center justify-between group/status">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Estado de Venta
                </Label>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">
                  {isActive ? '✓ Disponible' : '⚠ Inactivo'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Service Info */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Actualizado el {new Date(service.updated_at).toLocaleDateString('es-ES')}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleting || submitting}
                className="w-full sm:w-auto h-12 rounded-xl text-red-600 dark:text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950 font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto h-12 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                disabled={submitting || deleting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto h-12 px-10 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
                disabled={!isValid || submitting || deleting}
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Guardando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4 mr-2" />
                    <span className="text-[11px] font-black uppercase tracking-widest">Guardar Cambios</span>
                  </div>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="dark:bg-gray-900 border-none rounded-[2rem]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
            </div>
            <AlertDialogTitle className="dark:text-white">
              ¿Estás seguro?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="dark:text-gray-400">
            Esta acción eliminará permanentemente este servicio. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 shadow-red-600/20 rounded-xl"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
