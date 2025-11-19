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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, User, CheckCircle, Phone, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import Logo from '@/components/logo'
import { ThemeToggle } from '@/components/ThemeToggle'

const setupSchema = z.object({
  firstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras'),
  lastName: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El apellido solo puede contener letras'),
  phone: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .regex(/^[0-9+\-\s\(\)]+$/, 'Formato de teléfono inválido')
    .optional()
    .or(z.literal('')),
})

type SetupFormData = z.infer<typeof setupSchema>

export default function ClientSetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { authState, handleProfileCompleted } = useAuth()
  const { theme } = useTheme()
  const router = useRouter()

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Verificar que el usuario esté autenticado pero sin perfil
  useEffect(() => {
    if (!authState.loading) {
      if (!authState.session?.user) {
        // No hay sesión, redirigir a login
        router.push('/auth/client/login')
        return
      }

      if (authState.user) {
        // Ya tiene perfil completo, redirigir al dashboard
        router.push('/dashboard/client')
        return
      }
    }
  }, [authState, router])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    mode: 'onChange',
    defaultValues: {
      firstName: authState.session?.user?.user_metadata?.first_name || '',
      lastName: authState.session?.user?.user_metadata?.last_name || '',
      phone: '',
    }
  })

  const onSubmit = async (data: SetupFormData) => {
    try {
      setLoading(true)
      setError(null)

      if (!authState.session?.user) {
        throw new Error('No hay sesión activa')
      }

      // Llamar al endpoint de API para completar el perfil
      const response = await fetch('/api/complete-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone || null,
          user_type: 'client'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al completar el perfil')
      }

      // Perfil completado exitosamente, actualizar el estado y redirigir
      await handleProfileCompleted()

    } catch (err: any) {
      console.error('Setup error:', err)
      setError(err.message || 'Error al completar el perfil. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la autenticación
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-400/5 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-400/10 dark:bg-teal-400/5 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-10 w-72 h-72 bg-cyan-400/10 dark:bg-cyan-400/5 rounded-full filter blur-3xl animate-pulse delay-500"></div>

        {/* Floating dots */}
        <div className="absolute top-1/4 left-10 animate-bounce delay-1000">
          <div className="w-4 h-4 bg-emerald-400 dark:bg-emerald-500 rounded-full opacity-60"></div>
        </div>
        <div className="absolute top-1/3 right-20 animate-bounce delay-[1500ms]">
          <div className="w-6 h-6 bg-teal-400 dark:bg-teal-500 rounded-full opacity-40"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce delay-[2000ms]">
          <div className="w-5 h-5 bg-cyan-400 dark:bg-cyan-500 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Back Button */}
        <div className={`flex justify-between items-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <Link href="/auth/client">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        {/* Header */}
        <div className={`text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '200ms' }}>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-emerald-600 dark:bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <Logo color={theme === 'dark' ? 'white' : 'black'} size="lg" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ¡Completa tu Perfil!
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Solo necesitamos algunos datos más para terminar
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className={`border-red-200 dark:border-red-800 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-sm transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <AlertDescription className="text-red-700 dark:text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Form */}
        <Card className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-white/40 dark:border-gray-700/40 shadow-xl hover:shadow-2xl transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '600ms' }}>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <User className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">Información Personal</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Completa tu perfil para comenzar a reservar citas
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* First Name Field */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nombre *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Tu nombre"
                    className="pl-10 h-12 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('firstName')}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.firstName.message}
                  </p>
                )}
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Apellido *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Tu apellido"
                    className="pl-10 h-12 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('lastName')}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.lastName.message}
                  </p>
                )}
              </div>

              {/* Phone Field (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Teléfono (opcional)
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+593 99 123 4567"
                    className="pl-10 h-12 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* User Info Display */}
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="text-sm text-emerald-800 dark:text-emerald-300">
                  <p><strong>Email:</strong> {authState.session?.user?.email}</p>
                  <p><strong>Tipo de cuenta:</strong> Cliente</p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isValid}
                className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-lg h-12"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                    Completando perfil...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Completar Perfil
                  </>
                )}
              </Button>
            </form>

            {/* Help Text */}
            <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Al completar tu perfil podrás reservar citas en todos los negocios disponibles
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className={`text-center text-sm text-gray-500 dark:text-gray-400 space-y-2 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '800ms' }}>
          <p>✓ Información segura y encriptada</p>
        </div>
      </div>
    </div>
  )
}
