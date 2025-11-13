'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Building2, ArrowRight, ArrowLeft, Phone, Mail, Globe, FileText, Tag, Check } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import MapboxLocationPicker from '@/components/ui/mapbox-location-picker'
import Logo from '@/components/logo'

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
  const [currentStep, setCurrentStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
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
    watch,
    trigger
  } = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    mode: 'onChange',
  })

  const watchedFields = watch()

  // Definir pasos del formulario
  const steps = [
    {
      id: 1,
      title: 'Información Básica',
      description: 'Datos principales de tu negocio',
      icon: Building2,
      fields: ['name', 'business_category_id', 'description']
    },
    {
      id: 2,
      title: 'Información de Contacto',
      description: 'Cómo pueden contactarte',
      icon: Phone,
      fields: ['phone', 'email', 'website']
    },
    {
      id: 3,
      title: 'Ubicación',
      description: 'Donde está ubicado tu negocio',
      icon: MapPin,
      fields: ['location']
    }
  ]

  // Verificar si un paso está completo
  const isStepValid = (stepId: number) => {
    const step = steps.find(s => s.id === stepId)
    if (!step) return false

    if (stepId === 1) {
      return watchedFields.name && watchedFields.business_category_id
    }
    if (stepId === 2) {
      return true // Todos los campos de contacto son opcionales
    }
    if (stepId === 3) {
      return locationData.address && locationData.address.trim() !== ''
    }
    return false
  }

  // Navegar al siguiente paso
  const nextStep = async () => {
    if (currentStep === 1) {
      const isValid = await trigger(['name', 'business_category_id', 'description'])
      if (!isValid) return
    }
    if (currentStep === 2) {
      const isValid = await trigger(['phone', 'email', 'website'])
      if (!isValid) return
    }

    if (!completedSteps.includes(currentStep) && isStepValid(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep])
    }

    if (currentStep < 3) {
      setSlideDirection('right')
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentStep(prev => prev + 1)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 200)
    }
  }

  // Navegar al paso anterior
  const prevStep = () => {
    if (currentStep > 1) {
      setSlideDirection('left')
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentStep(prev => prev - 1)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 200)
    }
  }

  // Navegar directamente a un paso
  const goToStep = (stepId: number) => {
    if (stepId <= currentStep || completedSteps.includes(stepId - 1)) {
      setSlideDirection(stepId > currentStep ? 'right' : 'left')
      setIsTransitioning(true)

      setTimeout(() => {
        setCurrentStep(stepId)
        setTimeout(() => {
          setIsTransitioning(false)
        }, 50)
      }, 200)
    }
  }

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

      console.log('🏢 Creando negocio con datos:', businessData)

      const { data: insertedBusiness, error: businessError } = await supabase
        .from('businesses')
        .insert(businessData)
        .select()
        .single()

      if (businessError) {
        console.error('❌ Error al crear negocio:', businessError)
        throw businessError
      }

      console.log('✅ Negocio creado exitosamente:', insertedBusiness)
      console.log('🚀 Redirigiendo al dashboard...')

      // Forzar recarga de la página para que el middleware detecte el nuevo negocio
      window.location.href = '/dashboard/business'
    } catch (err: any) {
      console.error('❌ Error en onSubmit:', err)
      setError(err.message || 'Error al crear el negocio')
      setLoading(false)
    }
  }

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-4 relative overflow-hidden transition-all duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-400/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-400/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-10 w-72 h-72 bg-yellow-400/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>

        {/* Floating dots */}
        <div className="absolute top-1/4 left-10 animate-bounce delay-1000">
          <div className="w-4 h-4 bg-orange-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-1/3 right-20 animate-bounce delay-1500">
          <div className="w-6 h-6 bg-amber-400 rounded-full opacity-40"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce delay-2000">
          <div className="w-5 h-5 bg-yellow-400 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className={`text-center mb-8 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <Logo color="black" size="md" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Configura tu <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent">Negocio</span>
          </h1>
          <p className="text-gray-600 max-w-lg mx-auto">
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

        {/* Layout de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Columna izquierda - Progreso vertical */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-8">
              <Card className="bg-white/90 backdrop-blur-md border border-white/40 shadow-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-gray-900">Progreso de configuración</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progreso vertical */}
                  {steps.map((step, index) => {
                    const isCompleted = completedSteps.includes(step.id)
                    const isCurrent = currentStep === step.id
                    const isClickable = step.id <= currentStep || completedSteps.includes(step.id - 1)
                    const StepIcon = step.icon

                    return (
                      <div key={step.id} className="relative">
                        <div className="flex items-start gap-4">
                          <button
                            type="button"
                            onClick={() => isClickable && goToStep(step.id)}
                            disabled={!isClickable}
                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-500 flex-shrink-0 ${
                              isCompleted
                                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                                : isCurrent
                                ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white shadow-xl scale-110'
                                : isClickable
                                ? 'bg-white border-2 border-gray-300 text-gray-500 hover:border-orange-300 hover:text-orange-600 hover:scale-105'
                                : 'bg-gray-100 border-2 border-gray-200 text-gray-400'
                            } ${
                              isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="w-6 h-6" />
                            ) : (
                              <StepIcon className="w-6 h-6" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold transition-all duration-300 ${
                              isCurrent ? 'text-orange-600' : isCompleted ? 'text-orange-700' : 'text-gray-500'
                            }`}>
                              {step.title}
                            </h4>
                            <p className={`text-sm mt-1 transition-all duration-300 ${
                              isCurrent ? 'text-orange-600' : isCompleted ? 'text-orange-600' : 'text-gray-400'
                            }`}>
                              {step.description}
                            </p>
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium mt-2">
                                <Check className="w-3 h-3" />
                                Completado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Línea conectora vertical */}
                        {index < steps.length - 1 && (
                          <div className="absolute left-6 top-12 w-0.5 h-6 transition-all duration-700">
                            <div className="w-full h-full bg-gray-200 rounded-full" />
                            <div className={`absolute top-0 left-0 w-full rounded-full transition-all duration-700 ease-out ${
                              completedSteps.includes(step.id)
                                ? 'h-full bg-gradient-to-b from-orange-500 to-amber-600'
                                : currentStep === step.id && isStepValid(step.id)
                                ? 'h-1/2 bg-gradient-to-b from-orange-400 to-amber-500'
                                : 'h-0'
                            }`} />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Información adicional */}
                  <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        🚀
                      </div>
                      <h4 className="font-semibold text-orange-800">¿Qué sigue después?</h4>
                    </div>
                    <p className="text-sm text-orange-700 mb-3">
                      Una vez creado tu negocio, podrás configurar servicios, empleados y comenzar a recibir reservas.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-orange-600">
                      <span className="bg-orange-100 px-2 py-1 rounded-full">✓ Configuración gratuita</span>
                      <span className="bg-orange-100 px-2 py-1 rounded-full">✓ Sin límites</span>
                      <span className="bg-orange-100 px-2 py-1 rounded-full">✓ Soporte incluido</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Columna derecha - Formulario */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className={`transition-all duration-500 ease-in-out transform ${
                isTransitioning
                  ? `${
                      slideDirection === 'right'
                        ? 'translate-x-8 opacity-0'
                        : '-translate-x-8 opacity-0'
                    } scale-95`
                  : isVisible
                  ? 'translate-x-0 opacity-100 scale-100'
                  : 'translate-x-8 opacity-0 scale-95'
              }`}>

                {/* Paso 1: Información Básica */}
                {currentStep === 1 && (
                  <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Información Básica</CardTitle>
                      <p className="text-gray-600">Cuéntanos sobre tu negocio</p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                          Nombre del Negocio *
                        </Label>
                        <Input
                          id="name"
                          placeholder="Ej: Salón de Belleza María"
                          className="h-12 text-base bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                          {...register('name')}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement
                            target.value = target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s&.-]/g, '')
                          }}
                        />
                        {errors.name && (
                          <p className="text-sm text-red-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{errors.name.message}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="business_category_id" className="text-sm font-medium text-gray-700">
                          Categoría del Negocio *
                        </Label>
                        <Select onValueChange={(value) => setValue('business_category_id', value)}>
                          <SelectTrigger className="h-12 text-base bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 hover:border-gray-300">
                            <SelectValue placeholder="Selecciona el tipo de negocio" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id} className="cursor-pointer py-3">
                                <div className="w-full">
                                  <span className="font-medium block">{category.name}</span>
                                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{category.description}</p>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.business_category_id && (
                          <p className="text-sm text-red-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{errors.business_category_id.message}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                          Descripción (opcional)
                        </Label>
                        <Textarea
                          id="description"
                          placeholder="Describe tu negocio, servicios que ofreces, lo que te hace especial..."
                          rows={4}
                          className="text-base bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all resize-none"
                          {...register('description')}
                        />
                        {errors.description && (
                          <p className="text-sm text-red-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{errors.description.message}</span>
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Paso 2: Información de Contacto */}
                {currentStep === 2 && (
                  <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Phone className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Información de Contacto</CardTitle>
                      <p className="text-gray-600">¿Cómo pueden contactarte tus clientes?</p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                          Teléfono (opcional)
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+593 99 123 4567"
                          className="h-12 text-base bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                          {...register('phone')}
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{errors.phone.message}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email (opcional)
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="contacto@tunegocio.com"
                          className="h-12 text-base bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                          {...register('email')}
                        />
                        {errors.email && (
                          <p className="text-sm text-red-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{errors.email.message}</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                          Sitio Web (opcional)
                        </Label>
                        <Input
                          id="website"
                          type="url"
                          placeholder="https://www.tunegocio.com"
                          className="h-12 text-base bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                          {...register('website')}
                        />
                        {errors.website && (
                          <p className="text-sm text-red-600 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                            <span>{errors.website.message}</span>
                          </p>
                        )}
                      </div>

                      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-4 border border-orange-200">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            💡
                          </div>
                          <div>
                            <p className="font-medium text-orange-800 mb-1">Consejo profesional</p>
                            <p className="text-sm text-orange-700">
                              Aunque estos campos son opcionales, tener información de contacto ayuda a que tus clientes confíen más en tu negocio.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Paso 3: Ubicación */}
                {currentStep === 3 && (
                  <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader className="pb-6 text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <MapPin className="w-8 h-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900">Ubicación del Negocio</CardTitle>
                      <p className="text-gray-600">¿Dónde pueden encontrarte tus clientes?</p>
                    </CardHeader>

                    <CardContent>
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
                      {!locationData.address && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                              ⚠️
                            </div>
                            <div>
                              <p className="font-medium text-amber-800 mb-1">Ubicación requerida</p>
                              <p className="text-sm text-amber-700">
                                Selecciona la ubicación de tu negocio para continuar con el proceso.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Navegación entre pasos */}
                <div className={`flex justify-between items-center pt-8 transition-all duration-700 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`} style={{ transitionDelay: '400ms' }}>
                  <div>
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Anterior
                      </Button>
                    )}
                  </div>

                  <div className="flex space-x-3">
                    {currentStep < 3 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStepValid(currentStep) || isTransitioning}
                        size="lg"
                        className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-lg"
                      >
                        Siguiente
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={loading || !isStepValid(3) || isTransitioning}
                        size="lg"
                        className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-lg"
                      >
                        {loading ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                            Creando negocio...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Crear Mi Negocio
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}