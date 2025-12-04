'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import type { Business } from '@/types/database'

const serviceFormSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string(),
  price: z.string()
    .min(1, 'El precio es requerido'),
  duration_minutes: z.string()
    .min(1, 'La duración es requerida'),
  is_active: z.boolean()
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

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

interface CreateServiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: Business
  onSuccess: () => void
}

export default function CreateServiceModal({
  open,
  onOpenChange,
  business,
  onSuccess
}: CreateServiceModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: '',
      duration_minutes: '',
      is_active: true
    },
    mode: 'onSubmit'
  })

  const isActive = watch('is_active')
  const durationMinutesValue = watch('duration_minutes')

  const onSubmit = async (formData: ServiceFormData) => {
    try {
      setSubmitting(true)

      const price = parseFloat(formData.price)
      const duration = parseInt(formData.duration_minutes)

      if (isNaN(price) || price < 0) {
        alert('El precio debe ser un número válido mayor o igual a 0')
        return
      }

      if (isNaN(duration) || duration < 15) {
        alert('La duración debe ser un número válido mayor o igual a 15 minutos')
        return
      }

      const { error } = await supabase
        .from('services')
        .insert([
          {
            business_id: business.id,
            name: formData.name,
            description: formData.description || null,
            price: price,
            duration_minutes: duration,
            is_active: formData.is_active
          }
        ])

      if (error) {
        console.error('Error creating service:', error)
        alert('Error al crear el servicio')
      } else {
        reset()
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating service:', error)
      alert('Error al crear el servicio')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">Nuevo Servicio</DialogTitle>
          <DialogDescription className="text-sm">
            Crea un nuevo servicio para tu negocio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 mt-4">
          {/* Nombre del servicio */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
              Nombre del Servicio <span className="text-orange-600">*</span>
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Ej: Corte de cabello, Manicura..."
              className="h-10 focus:border-orange-500 focus:ring-orange-500"
            />
            {errors.name && (
              <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{errors.name.message}</p>
              </div>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
              Descripción
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Describe brevemente el servicio (opcional)"
              rows={2}
              className="focus:border-orange-500 focus:ring-orange-500 text-sm"
            />
          </div>

          {/* Precio y duración */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Precio */}
            <div className="space-y-1.5">
              <Label htmlFor="price" className="text-sm font-semibold text-gray-700">
                Precio <span className="text-orange-600">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  max="99999.99"
                  {...register('price')}
                  className="pl-10 h-10 focus:border-orange-500 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errors.price.message}</p>
                </div>
              )}
            </div>

            {/* Duración */}
            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes" className="text-sm font-semibold text-gray-700">
                Duración <span className="text-orange-600">*</span>
              </Label>
              <Select
                value={durationMinutesValue}
                onValueChange={(value) => setValue('duration_minutes', value)}
              >
                <SelectTrigger className="w-full h-10 focus:border-orange-500 focus:ring-orange-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    <SelectValue placeholder="Selecciona" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.duration_minutes && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errors.duration_minutes.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Estado del servicio */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 bg-orange-50/50 border border-orange-200 rounded-lg">
            <div>
              <Label htmlFor="is_active" className="text-sm font-semibold text-gray-900">
                Estado del Servicio
              </Label>
              <p className="text-xs text-gray-600 mt-0.5">
                {isActive ? 'Disponible para reservas' : 'Oculto para clientes'}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              className="self-start sm:self-auto"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm hover:shadow-md transition-all"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="relative w-3.5 h-3.5 mr-2">
                    <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Crear Servicio
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
