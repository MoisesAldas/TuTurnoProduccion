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
import { ArrowLeft, Save, DollarSign, Clock, Building, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cargando formulario</h3>
          <p className="text-sm text-gray-600">Preparando el formulario de nuevo servicio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nuevo Servicio</h1>
              <p className="text-sm text-gray-600 mt-1">Crea un nuevo servicio para tu negocio</p>
            </div>
            <div className="flex items-center gap-3">
              {business && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                  <Building className="w-4 h-4 mr-2" />
                  {business.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Back Button - Outside of header, above form */}
      <div>
        <Link href="/dashboard/business/services">
          <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Servicios
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - 2/3 width */}
        <div className="lg:col-span-2">
        <Card className="hover:shadow-lg transition-all duration-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Información del Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                {errors.description && (
                  <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-red-700">{errors.description.message}</p>
                  </div>
                )}
              </div>

              {/* Precio y duración */}
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-200 rounded-lg">
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
                />
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <Link href="/dashboard/business/services" className="flex-1">
                  <Button variant="outline" type="button" className="w-full h-9 hover:bg-gray-100 transition-colors">
                    Cancelar
                  </Button>
                </Link>
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
          </CardContent>
        </Card>
        </div>

        {/* Sidebar - Tips - 1/3 width */}
        <div className="lg:block hidden">
          <Card className="hover:shadow-lg transition-all duration-200 sticky top-20">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>💡</span>
                <span>Consejos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ul className="space-y-2.5 text-xs text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-orange-600 mt-1.5 flex-shrink-0"></span>
                  <span>Usa nombres claros y descriptivos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-orange-600 mt-1.5 flex-shrink-0"></span>
                  <span>Incluye detalles importantes en la descripción</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-orange-600 mt-1.5 flex-shrink-0"></span>
                  <span>Duraciones realistas con tiempo de preparación</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-orange-600 mt-1.5 flex-shrink-0"></span>
                  <span>Precios que reflejen valor y calidad</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 rounded-full bg-orange-600 mt-1.5 flex-shrink-0"></span>
                  <span>Puedes desactivar sin eliminar</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}