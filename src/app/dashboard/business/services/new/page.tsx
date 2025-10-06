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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, DollarSign, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'

// Schema de validación del formulario
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

// Opciones predefinidas de duración
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

export default function NewServicePage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  useEffect(() => {
    if (authState.user) {
      fetchBusiness()
    }
  }, [authState.user])

  const fetchBusiness = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

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
    } catch (error) {
      console.error('Error fetching business:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (formData: ServiceFormData) => {

    if (!business) return

    try {
      setSubmitting(true)

      // Validar y convertir números
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
        router.push('/dashboard/business/services')
      }
    } catch (error) {
      console.error('Error creating service:', error)
      alert('Error al crear el servicio')
    } finally {
      setSubmitting(false)
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

  const durationMinutesValue = watch('duration_minutes')
  const durationMinutes = durationMinutesValue ? parseInt(durationMinutesValue) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header centrado */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/dashboard/business/services">
            <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-700 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Nuevo Servicio</h1>
        <p className="text-lg text-gray-600">Crea un nuevo servicio para tu negocio</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
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
                  <Label htmlFor="duration_minutes">Duración *</Label>
                  <Select
                    value={durationMinutesValue}
                    onValueChange={(value) => setValue('duration_minutes', value)}
                  >
                    <SelectTrigger className="w-full">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <SelectValue placeholder="Selecciona la duración" />
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
                    <p className="text-sm text-red-600">{errors.duration_minutes.message}</p>
                  )}
                </div>
              </div>

              {/* Estado del servicio */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl">
                <div className="space-y-1">
                  <Label htmlFor="is_active" className="text-base font-semibold text-gray-900">
                    Estado del Servicio
                  </Label>
                  <p className="text-sm text-gray-600">
                    {isActive
                      ? '✅ El servicio estará disponible para reservas'
                      : '🔒 El servicio estará oculto y no disponible para reservas'
                    }
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
              </div>

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
                      Creando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Crear Servicio
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-base flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                💡
              </div>
              <span>Consejos para crear servicios</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2 pt-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Usa nombres claros y descriptivos para tus servicios</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Incluye detalles importantes en la descripción</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Establece duraciones realistas considerando tiempo de preparación</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Los precios deben reflejar el valor y calidad del servicio</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Puedes desactivar servicios temporalmente sin eliminarlos</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}