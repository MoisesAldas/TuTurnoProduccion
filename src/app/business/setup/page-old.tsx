'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Building2, ArrowRight, Phone, Mail, Globe, FileText, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import MapboxLocationPicker from '@/components/ui/mapbox-location-picker'

const businessSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s&.-]+$/, 'Solo letras, números y caracteres básicos'),
  description: z
    .string()
    .max(500, 'Máximo 500 caracteres')
    .optional(),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^[+]?[0-9\s-()]{10,15}$/.test(val), {
      message: 'Formato de teléfono inválido'
    }),
  email: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('URL inválida (debe incluir https://)')
    .optional()
    .or(z.literal('')),
  business_category_id: z.string().min(1, 'Selecciona una categoría'),
})

type BusinessFormData = z.infer<typeof businessSchema>

interface Category {
  id: string
  name: string
  description: string
}

export default function BusinessSetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [locationData, setLocationData] = useState({
    address: '',
    latitude: -0.2295, // Quito por defecto
    longitude: -78.5249
  })
  const { authState } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setValue,
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    mode: 'onChange',
  })

  useEffect(() => {
    if (!authState.user?.is_business_owner) {
      router.push('/dashboard/client')
      return
    }

    fetchCategories()
  }, [authState.user, router])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('id, name, description')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    }
  }

  const onSubmit = async (data: BusinessFormData) => {
    try {
      setLoading(true)
      setError(null)

      // Validar que se haya seleccionado una ubicación
      if (!locationData.address || locationData.address.trim() === '') {
        throw new Error('Por favor selecciona una ubicación para tu negocio')
      }

      const businessData = {
        owner_id: authState.user!.id,
        name: data.name,
        description: data.description || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        address: locationData.address,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        business_category_id: data.business_category_id,
        is_active: true,
      }

      const { error: businessError } = await supabase
        .from('businesses')
        .insert(businessData)

      if (businessError) throw businessError

      router.push('/dashboard/business')
    } catch (err: any) {
      setError(err.message || 'Error al crear el negocio')
    } finally {
      setLoading(false)
    }
  }

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 relative overflow-hidden transition-all duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-400/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-10 w-72 h-72 bg-cyan-400/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>

        {/* Floating dots */}
        <div className="absolute top-1/4 left-10 animate-bounce delay-1000">
          <div className="w-4 h-4 bg-emerald-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-1/3 right-20 animate-bounce" style={{animationDelay: '1500ms'}}>
          <div className="w-6 h-6 bg-teal-400 rounded-full opacity-40"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce" style={{animationDelay: '2000ms'}}>
          <div className="w-5 h-5 bg-cyan-400 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header compacto */}
        <div className={`text-center mb-8 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-black">TuTurno</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Configura tu <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">Negocio</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Completa la información para comenzar a recibir reservas
          </p>
        </div>

        {/* Alert de error */}
        {error && (
          <Alert variant="destructive" className={`mb-6 bg-red-50/90 backdrop-blur-sm border-red-200 transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        {/* Formulario reorganizado */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Columna Izquierda - Información Básica */}
            <Card className={`bg-white/90 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-700 ${
              isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
            }`} style={{ transitionDelay: '600ms' }}>
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  Información Básica
                </CardTitle>
                <CardDescription className="text-gray-600 text-base">
                  Los datos principales de tu negocio que verán los clientes
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Nombre del Negocio *
                  </Label>
                  <Input
                    id="name"
                    placeholder="Ej: Salón de Belleza María"
                    className="h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300 transition-all"
                    {...register('name')}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement
                      target.value = target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s&.-]/g, '')
                    }}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_category_id" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    Categoría del Negocio *
                  </Label>
                  <Select onValueChange={(value) => setValue('business_category_id', value)}>
                    <SelectTrigger className="h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 hover:border-gray-300">
                      <SelectValue placeholder="Selecciona el tipo de negocio" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id} className="cursor-pointer">
                          <div className="flex flex-col">
                            <span className="font-medium">{category.name}</span>
                            <span className="text-xs text-gray-500">{category.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.business_category_id && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {errors.business_category_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    Descripción (opcional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe tu negocio, servicios principales y lo que te hace especial..."
                    rows={4}
                    className="bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300 transition-all resize-none"
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Columna Derecha - Contacto y Ubicación */}
            <div className="space-y-8">

              {/* Información de Contacto */}
              <Card className={`bg-white/90 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-700 ${
                isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
              }`} style={{ transitionDelay: '800ms' }}>
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                    Contacto
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Información para que los clientes se comuniquen contigo
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        Teléfono (opcional)
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+593 99 123 4567"
                        className="h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300 transition-all"
                        {...register('phone')}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                          {errors.phone.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-emerald-600" />
                        Email del Negocio (opcional)
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contacto@tunegocio.com"
                        className="h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300 transition-all"
                        {...register('email')}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-600" />
                        Sitio Web (opcional)
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://www.tunegocio.com"
                        className="h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 hover:border-gray-300 transition-all"
                        {...register('website')}
                      />
                      {errors.website && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                          {errors.website.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ubicación con Mapbox */}
              <Card className={`bg-white/90 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-700 ${
                isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'
              }`} style={{ transitionDelay: '1000ms' }}>
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    Ubicación
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Selecciona la ubicación exacta donde los clientes pueden encontrarte
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <MapboxLocationPicker
                    onLocationSelect={(location) => {
                      setLocationData({
                        address: location.address,
                        latitude: location.latitude,
                        longitude: location.longitude
                      })
                    }}
                    initialLocation={locationData}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Botón de envío */}
          <div className={`flex justify-center pt-8 transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '1200ms' }}>
            <Button
              type="submit"
              disabled={loading || !isValid}
              size="lg"
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-medium shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 py-6 px-12 text-lg disabled:opacity-50 disabled:transform-none disabled:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                  Creando tu negocio...
                </>
              ) : (
                <>
                  Crear Mi Negocio
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}