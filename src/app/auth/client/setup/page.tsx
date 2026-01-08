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
import { User, CheckCircle, Phone, ArrowLeft, UserCog } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-gray-200 border-t-slate-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 hover:bg-slate-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Back button */}
        <div className="relative z-10">
          <Link href="/auth/client">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            <UserCog className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Configuración de Perfil</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Ya casi<br />terminamos
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Solo necesitamos completar tu perfil para empezar a reservar citas
          </p>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-4 py-2">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Link href="/auth/client">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-slate-600 hover:bg-slate-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="lg:hidden mb-2">
              <Logo color="black" size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">¡Completa tu Perfil!</h2>
            <p className="text-sm text-gray-600">Solo necesitamos algunos datos más</p>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* First Name Field */}
            <div className="space-y-1">
              <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                Nombre *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Tu nombre"
                  className="pl-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                  {...register('firstName')}
                />
              </div>
              {errors.firstName && (
                <p className="text-xs text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name Field */}
            <div className="space-y-1">
              <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                Apellido *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Tu apellido"
                  className="pl-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                  {...register('lastName')}
                />
              </div>
              {errors.lastName && (
                <p className="text-xs text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            {/* Phone Field (Optional) */}
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                Teléfono (opcional)
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+593 99 123 4567"
                  className="pl-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                  {...register('phone')}
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-600">{errors.phone.message}</p>
              )}
            </div>

            {/* User Info Display */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="text-xs text-slate-700 space-y-1">
                <p><strong>Email:</strong> {authState.session?.user?.email}</p>
                <p><strong>Tipo de cuenta:</strong> Cliente</p>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Completando perfil...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completar Perfil
                </>
              )}
            </Button>
          </form>

          {/* Help Text */}
          <div className="text-center text-xs text-gray-500 pt-2">
            <p>✓ Información segura y encriptada</p>
          </div>
        </div>
      </div>
    </div>
  )
}