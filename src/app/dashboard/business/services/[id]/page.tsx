'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, DollarSign, Clock, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business, Service } from '@/types/database'

// Schema de validación
const serviceSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
    .or(z.literal('')),
  price: z.coerce.number()
    .min(0, 'El precio debe ser mayor o igual a 0')
    .max(99999.99, 'El precio no puede exceder 99,999.99'),
  duration_minutes: z.coerce.number()
    .min(15, 'La duración mínima es 15 minutos')
    .max(480, 'La duración máxima es 8 horas (480 minutos)'),
  is_active: z.boolean().default(true)
})

type ServiceFormData = z.infer<typeof serviceSchema>

interface EditServicePageProps {
  params: {
    id: string
  }
}

export default function EditServicePage({ params }: EditServicePageProps) {
  const [business, setBusiness] = useState<Business | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema)
  })

  const isActive = watch('is_active')

  useEffect(() => {
    if (authState.user) {
      fetchData()
    }
  }, [authState.user, params.id])

  const fetchData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener información del negocio
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)

      // Obtener información del servicio
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('*')
        .eq('id', params.id)
        .eq('business_id', businessData.id)
        .single()

      if (serviceError) {
        console.error('Error fetching service:', serviceError)
        router.push('/dashboard/business/services')
        return
      }

      setService(serviceData)

      // Configurar valores del formulario
      reset({
        name: serviceData.name,
        description: serviceData.description || '',
        price: serviceData.price,
        duration_minutes: serviceData.duration_minutes,
        is_active: serviceData.is_active
      })

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ServiceFormData) => {
    if (!business || !service) return

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('services')
        .update({
          name: data.name,
          description: data.description || null,
          price: data.price,
          duration_minutes: data.duration_minutes,
          is_active: data.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) {
        console.error('Error updating service:', error)
        alert('Error al actualizar el servicio')
      } else {
        router.push('/dashboard/business/services')
      }
    } catch (error) {
      console.error('Error updating service:', error)
      alert('Error al actualizar el servicio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteService = async () => {
    if (!service) return

    if (!confirm('¿Estás seguro de que quieres eliminar este servicio? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', service.id)

      if (error) {
        console.error('Error deleting service:', error)
        alert('Error al eliminar el servicio')
      } else {
        router.push('/dashboard/business/services')
      }
    } catch (error) {
      console.error('Error deleting service:', error)
      alert('Error al eliminar el servicio')
    } finally {
      setDeleting(false)
    }
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) {
      return `${mins} minutos`
    } else if (mins === 0) {
      return `${hours} hora${hours > 1 ? 's' : ''}`
    } else {
      return `${hours} hora${hours > 1 ? 's' : ''} y ${mins} minutos`
    }
  }

  const durationMinutes = watch('duration_minutes')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando servicio...</p>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Servicio no encontrado</p>
          <Link href="/dashboard/business/services">
            <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white">
              Volver a Servicios
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header centrado */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link href="/dashboard/business/services">
                <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-700 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Editar Servicio</h1>
            <p className="text-lg text-gray-600">{service.name}</p>
          </div>

          <Button
            variant="outline"
            onClick={handleDeleteService}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors w-full sm:w-auto"
          >
            {deleting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full mr-2"></div>
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Servicio
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="border-b bg-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Save className="w-5 h-5 text-orange-600" />
              </div>
              <span>Información del Servicio</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Nombre del servicio */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Servicio *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Ej: Corte de cabello, Manicura, Masaje relajante..."
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe brevemente el servicio (opcional)"
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Precio y duración */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Precio */}
                <div className="space-y-2">
                  <Label htmlFor="price">Precio *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      max="99999.99"
                      {...register('price')}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-sm text-red-600">{errors.price.message}</p>
                  )}
                </div>

                {/* Duración */}
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duración (minutos) *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="duration_minutes"
                      type="number"
                      min="15"
                      max="480"
                      step="15"
                      {...register('duration_minutes')}
                      className="pl-10"
                      placeholder="60"
                    />
                  </div>
                  {durationMinutes && (
                    <p className="text-sm text-gray-600">
                      Equivale a: {formatDuration(durationMinutes)}
                    </p>
                  )}
                  {errors.duration_minutes && (
                    <p className="text-sm text-red-600">{errors.duration_minutes.message}</p>
                  )}
                </div>
              </div>

              {/* Estado del servicio */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="is_active" className="text-base font-medium">
                    Estado del Servicio
                  </Label>
                  <p className="text-sm text-gray-600">
                    {isActive
                      ? 'El servicio estará disponible para reservas'
                      : 'El servicio estará oculto y no disponible para reservas'
                    }
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
              </div>

              {/* Información adicional del servicio */}
              {service && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Información del Servicio</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Creado: {new Date(service.created_at).toLocaleDateString('es-ES')}</p>
                    {service.updated_at !== service.created_at && (
                      <p>Última actualización: {new Date(service.updated_at).toLocaleDateString('es-ES')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href="/dashboard/business/services" className="w-full sm:flex-1">
                  <Button variant="outline" type="button" className="w-full hover:bg-gray-100 transition-colors">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}