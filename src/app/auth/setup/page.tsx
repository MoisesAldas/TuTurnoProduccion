'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { User, Building, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Logo from '@/components/logo'

// Configuración para Ecuador
const ecuadorConfig = {
  code: '+593',
  name: 'Ecuador',
  flag: '🇪🇨',
  country: 'EC'
}

const profileSchema = z.object({
  first_name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras'),
  last_name: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El apellido solo puede contener letras'),
  phone_number: z
    .string()
    .optional()
    .refine((val) => !val || /^[0-9]{10}$/.test(val), {
      message: 'El teléfono debe tener exactamente 10 dígitos'
    }),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const userType = searchParams.get('type') as 'client' | 'business_owner'
  const { forceRefreshUser } = useAuth()

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onChange'
  })

  // Componente para animación letra por letra
  const AnimatedText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
    return (
      <span className="inline-block">
        {text.split('').map((char, index) => (
          <span
            key={index}
            className={`inline-block transition-all duration-500 ${
              isVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
            style={{
              transitionDelay: `${delay + index * 100}ms`,
              transform: isVisible ? 'translateY(0)' : 'translateY(16px)'
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </span>
    )
  }

  // Verificar que tenemos el tipo de usuario
  if (!userType || !['client', 'business_owner'].includes(userType)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur-md border border-white/40 shadow-xl">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">Parámetro de tipo de usuario inválido</p>
            <Button onClick={() => router.push('/')} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true)
      setError(null)

      // Combinar código de país y número de teléfono
      const fullPhone: string = data.phone_number
        ? `${ecuadorConfig.code}${data.phone_number}`
        : ''

      console.log('🚀 Submitting profile setup:', { ...data, user_type: userType, fullPhone })

      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: fullPhone,
          user_type: userType,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Error response:', errorText)

        try {
          const errorData = JSON.parse(errorText)
          throw new Error(errorData.error || 'Error al completar el perfil')
        } catch {
          throw new Error(`Error del servidor: ${response.status} - ${errorText}`)
        }
      }

      const result = await response.json()
      console.log('✅ Profile completed successfully:', result)

      const redirectPath = result.redirectUrl
      console.log('🚀 Redirecting to:', redirectPath)

      // Forzar actualización del estado de autenticación
      await forceRefreshUser()
      console.log('✅ User state updated, redirecting...')

      setTimeout(() => {
        router.replace(redirectPath)
      }, 500)

    } catch (err: any) {
      console.error('❌ Error in profile setup:', err)
      setError(err.message || 'Error al completar el perfil. Por favor, inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-400/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-400/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-10 w-72 h-72 bg-cyan-400/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>

        {/* Floating dots */}
        <div className="absolute top-1/4 left-10 animate-bounce delay-1000">
          <div className="w-4 h-4 bg-emerald-400 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-1/3 right-20 animate-bounce delay-1500">
          <div className="w-6 h-6 bg-teal-400 rounded-full opacity-40"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce delay-2000">
          <div className="w-5 h-5 bg-cyan-400 rounded-full opacity-50"></div>
        </div>
      </div>

      <Card className={`w-full max-w-md bg-white/90 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-1000 relative z-10 ${
        isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
      }`}>
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-6">
            <Logo color="black" size="md" />
          </div>

          <div className={`flex items-center justify-center mb-6 transition-all duration-700 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '800ms' }}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 hover:scale-110 ${
              userType === 'client'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700'
            }`}>
              {userType === 'client' ? <User className="w-8 h-8 text-white" /> : <Building className="w-8 h-8 text-white" />}
            </div>
          </div>

          <CardTitle className="text-2xl font-bold text-gray-900 mb-3">Completa tu perfil</CardTitle>
          <CardDescription className="text-gray-600 text-base leading-relaxed">
            {userType === 'client'
              ? 'Información básica para gestionar tus citas y reservas'
              : 'Información personal antes de configurar tu negocio'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-50/90 backdrop-blur-sm border-red-200">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium text-gray-700">Nombre *</Label>
              <input
                id="first_name"
                placeholder="Tu nombre"
                className="flex h-11 w-full rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-2 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300"
                {...register('first_name')}
                onInput={(e) => {
                  // Solo permitir letras, espacios y caracteres especiales del español
                  const target = e.target as HTMLInputElement
                  target.value = target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                }}
              />
              {errors.first_name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.first_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium text-gray-700">Apellido *</Label>
              <input
                id="last_name"
                placeholder="Tu apellido"
                className="flex h-11 w-full rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-2 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300"
                {...register('last_name')}
                onInput={(e) => {
                  // Solo permitir letras, espacios y caracteres especiales del español
                  const target = e.target as HTMLInputElement
                  target.value = target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                }}
              />
              {errors.last_name && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.last_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Teléfono (opcional)</Label>
              <div className="flex space-x-3">
                <div className="flex items-center space-x-3 h-11 px-4 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm shadow-sm w-[140px]">
                  <span className="text-base">{ecuadorConfig.flag}</span>
                  <span className="text-sm font-medium text-gray-700">{ecuadorConfig.code}</span>
                </div>
                <input
                  id="phone_number"
                  type="tel"
                  placeholder="0969380735"
                  maxLength={10}
                  className="flex h-11 flex-1 rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-2 text-sm shadow-sm transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 hover:border-gray-300"
                  {...register('phone_number')}
                  onInput={(e) => {
                    // Solo permitir números
                    const target = e.target as HTMLInputElement
                    target.value = target.value.replace(/[^0-9]/g, '')
                  }}
                />
              </div>
              {errors.phone_number && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {errors.phone_number.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-medium shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 py-6 text-lg mt-8 disabled:opacity-50 disabled:transform-none disabled:shadow-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                  Guardando perfil...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}