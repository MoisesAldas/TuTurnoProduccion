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
import { CalendarDays, Building, CheckCircle, Phone, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'
import AuthProgressSteps from '@/components/AuthProgressSteps'

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

export default function BusinessSetupPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { authState, handleProfileCompleted } = useAuth()
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
        router.push('/auth/business/login')
        return
      }

      if (authState.user) {
        // Ya tiene perfil completo, redirigir al dashboard
        router.push('/dashboard/business')
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
          user_type: 'business_owner'
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        {/* Back button */}
        <div className="relative z-10">
          <Link href="/auth/business">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <CheckCircle className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Último paso</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Listo para<br />despegar
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Solo necesitamos completar tu perfil para empezar a configurar tu negocio
          </p>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Link href="/auth/business">
              <Button variant="ghost" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center">
            <AuthProgressSteps currentStep={3} userType="business" />
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="lg:hidden mb-6">
              <Logo color="black" size="lg" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">¡Completa tu Perfil!</h2>
            <p className="text-gray-600">Solo necesitamos algunos datos más</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Setup Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* First Name Field */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                Nombre *
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Tu nombre"
                  className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('firstName')}
                />
              </div>
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name Field */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Apellido *
              </Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Tu apellido"
                  className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('lastName')}
                />
              </div>
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            {/* Phone Field (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Teléfono (opcional)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+593 99 123 4567"
                  className="pl-10 h-12 border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* User Info Display */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-orange-800">
                <p><strong>Email:</strong> {authState.session?.user?.email}</p>
                <p><strong>Tipo de cuenta:</strong> Propietario de Negocio</p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-12 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
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
          <div className="text-center text-sm text-gray-500">
            <p>✓ Información segura y encriptada</p>
          </div>
        </div>
      </div>
    </div>
  )
}