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
import { MapPin, Building2, ArrowRight, ArrowLeft, Phone, Mail, Globe, Check, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
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
      title: 'Contacto',
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

  // Verificar si se puede clickear un paso
  const isClickable = (stepId: number) => {
    // Puede ir atrás siempre
    if (stepId <= currentStep) return true
    // Puede ir adelante solo si el paso anterior está completo
    return completedSteps.includes(stepId - 1)
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
    if (isClickable(stepId)) {
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
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 dark:border-gray-700 border-t-orange-600 dark:border-t-orange-500 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-slate-950 py-4 transition-all duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Simplificado */}
        <div className={`text-center mb-4 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <div className="w-10 h-10 bg-orange-600 dark:bg-orange-700 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Configura tu <span className="text-orange-600 dark:text-orange-500">Negocio</span>
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Completa la información para comenzar a recibir reservas
          </p>
        </div>

        {/* Alert de error */}
        {error && (
          <Alert variant="destructive" className={`mb-3 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <AlertDescription className="text-red-700 dark:text-red-400">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stepper Horizontal Compacto */}
        <div className={`mb-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 shadow-sm transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '200ms' }}>
          {/* Stepper Horizontal */}
          <div className="flex items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Button Circle */}
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  disabled={!isClickable(step.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-200 flex-shrink-0 ${
                    completedSteps.includes(step.id)
                      ? 'bg-orange-600 dark:bg-orange-700 text-white shadow-sm'
                      : currentStep === step.id
                      ? 'bg-orange-600 dark:bg-orange-700 text-white ring-2 ring-orange-200 dark:ring-orange-800 shadow-md'
                      : isClickable(step.id)
                      ? 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 dark:hover:border-orange-600 cursor-pointer'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {completedSteps.includes(step.id) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                {/* Step Label (desktop only) */}
                <div className="ml-2 hidden sm:block flex-shrink-0">
                  <p className={`text-xs font-medium transition-colors ${
                    currentStep === step.id
                      ? 'text-orange-600 dark:text-orange-400'
                      : completedSteps.includes(step.id)
                      ? 'text-orange-700 dark:text-orange-500'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {step.title}
                  </p>
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2 sm:mx-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        completedSteps.includes(step.id)
                          ? 'w-full bg-orange-600 dark:bg-orange-700'
                          : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: Current Step Info */}
          <div className="sm:hidden mt-2 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paso {currentStep} de {steps.length}
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
              {steps.find(s => s.id === currentStep)?.title}
            </p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={`transition-all duration-300 ease-in-out ${
            isTransitioning
              ? slideDirection === 'right'
                ? 'translate-x-4 opacity-0'
                : '-translate-x-4 opacity-0'
              : 'translate-x-0 opacity-100'
          }`}>

            {/* Paso 1: Información Básica */}
            {currentStep === 1 && (
              <Card className="border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
                <CardHeader className="border-b bg-white dark:bg-gray-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Información Básica
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Datos principales de tu negocio
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-2">
                  {/* Nombre del Negocio */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nombre del Negocio *
                    </Label>
                    <div className="relative">
                      <Input
                        id="name"
                        placeholder="Ej: Salón de Belleza María"
                        className={`h-10 ${
                          watchedFields.name && !errors.name ? 'border-green-500 dark:border-green-600' : ''
                        } ${errors.name ? 'border-red-500 dark:border-red-600' : ''}`}
                        {...register('name')}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement
                          target.value = target.value.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s&.-]/g, '')
                        }}
                      />
                      {watchedFields.name && !errors.name && (
                        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 dark:text-green-500" />
                      )}
                    </div>
                    {errors.name && (
                      <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-400">{errors.name.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Categoría */}
                  <div className="space-y-1.5">
                    <Label htmlFor="business_category_id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Categoría del Negocio *
                    </Label>
                    <Select
                      value={watchedFields.business_category_id || ''}
                      onValueChange={(value) => {
                        setValue('business_category_id', value, { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger className={`h-10 ${
                        watchedFields.business_category_id && !errors.business_category_id
                          ? 'border-green-500 dark:border-green-600'
                          : ''
                      } ${errors.business_category_id ? 'border-red-500 dark:border-red-600' : ''}`}>
                        <SelectValue placeholder="Selecciona el tipo de negocio" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-[300px]">
                        {categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id}
                            className="focus:bg-orange-50 dark:focus:bg-orange-900/20 focus:text-orange-900 dark:focus:text-orange-100 cursor-pointer"
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {watchedFields.business_category_id && !errors.business_category_id && (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-500">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {categories.find(c => c.id === watchedFields.business_category_id)?.name || 'Categoría seleccionada'}
                        </span>
                      </div>
                    )}
                    {errors.business_category_id && (
                      <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-400">{errors.business_category_id.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Descripción (opcional)
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Describe tu negocio..."
                      rows={2}
                      className="resize-none"
                      {...register('description')}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {watchedFields.description?.length || 0}/500 caracteres
                    </p>
                    {errors.description && (
                      <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-400">{errors.description.message}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paso 2: Información de Contacto */}
            {currentStep === 2 && (
              <Card className="border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
                <CardHeader className="border-b bg-white dark:bg-gray-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Información de Contacto
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Cómo pueden contactarte tus clientes
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-2">
                  {/* Grid: Phone + Email en desktop, stack en mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone */}
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Teléfono (opcional)
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+593 99 123 4567"
                          className="pl-10 h-10"
                          {...register('phone')}
                        />
                      </div>
                      {errors.phone && (
                        <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-700 dark:text-red-400">{errors.phone.message}</p>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email (opcional)
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="contacto@tunegocio.com"
                          className="pl-10 h-10"
                          {...register('email')}
                        />
                      </div>
                      {errors.email && (
                        <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-red-700 dark:text-red-400">{errors.email.message}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Website (full width) */}
                  <div className="space-y-1.5">
                    <Label htmlFor="website" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sitio Web (opcional)
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        id="website"
                        type="url"
                        placeholder="https://www.tunegocio.com"
                        className="pl-10 h-10"
                        {...register('website')}
                      />
                    </div>
                    {errors.website && (
                      <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-700 dark:text-red-400">{errors.website.message}</p>
                      </div>
                    )}
                  </div>

                  {/* Info Box (sin emoji, con icono) */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-900 dark:text-blue-300">
                      Aunque estos campos son opcionales, tener información de contacto ayuda a que tus clientes confíen más en tu negocio.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paso 3: Ubicación */}
            {currentStep === 3 && (
              <Card className="border border-gray-200 dark:border-gray-800 shadow-lg overflow-hidden">
                <CardHeader className="border-b bg-white dark:bg-gray-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/40 rounded-lg flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        Ubicación del Negocio
                      </CardTitle>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Dónde pueden encontrarte tus clientes
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
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
                    <div className="mt-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-orange-900 dark:text-orange-400 text-sm">Ubicación requerida</p>
                        <p className="text-xs text-orange-800 dark:text-orange-500 mt-0.5">
                          Selecciona la ubicación de tu negocio para continuar.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Info Box: Qué sigue después */}
                  <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-1">
                          ¿Qué sigue después?
                        </h4>
                        <p className="text-xs text-blue-800 dark:text-blue-400 mb-3">
                          Una vez creado tu negocio, podrás configurar servicios, empleados y comenzar a recibir reservas.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Configuración gratuita
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Sin límites
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Soporte incluido
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navegación Simplificada */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              {/* Anterior (solo visible si currentStep > 1) */}
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="h-10 px-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
              ) : (
                <div />
              )}

              {/* Siguiente / Crear */}
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepValid(currentStep)}
                  className="h-10 px-6 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white"
                >
                  Siguiente
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading || !isStepValid(3)}
                  className="h-10 px-6 bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Creando negocio...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Crear Mi Negocio
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
