'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, UserPlus, ArrowLeft, Eye, EyeOff, Mail, Lock, User, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'
import AuthProgressSteps from '@/components/AuthProgressSteps'

const registerSchema = z.object({
  firstName: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El nombre solo puede contener letras'),
  lastName: z
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, 'El apellido solo puede contener letras'),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Debe contener al menos: 1 minúscula, 1 mayúscula y 1 número'),
  confirmPassword: z
    .string()
    .min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

const ERROR_MESSAGES = {
  auth_error: 'Ocurrió un error durante el registro.',
  email_exists: 'Ya existe una cuenta con este email.',
  weak_password: 'La contraseña es muy débil.',
  invalid_email: 'El email no es válido.',
  signup_disabled: 'El registro está temporalmente deshabilitado.',
  unexpected_error: 'Ocurrió un error inesperado.',
}

export default function ClientRegisterPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { signInWithGoogle, signUpWithEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Mostrar error de URL params
  useEffect(() => {
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam as keyof typeof ERROR_MESSAGES] || 'Ocurrió un error inesperado')
    }
  }, [errorParam])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  const password = watch('password')

  // Función para evaluar la fortaleza de la contraseña
  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, text: '', color: '' }

    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/\d/.test(password)) strength += 1
    if (/[!@#$%^&*]/.test(password)) strength += 1

    const levels = [
      { strength: 1, text: 'Muy débil', color: 'bg-red-500' },
      { strength: 2, text: 'Débil', color: 'bg-orange-500' },
      { strength: 3, text: 'Regular', color: 'bg-yellow-500' },
      { strength: 4, text: 'Fuerte', color: 'bg-slate-500' },
      { strength: 5, text: 'Muy fuerte', color: 'bg-green-600' },
    ]

    return levels[strength - 1] || levels[0]
  }

  const passwordStrength = getPasswordStrength(password || '')

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true)
      setError(null)

      await signUpWithEmail(
        data.email,
        data.password,
        {
          first_name: data.firstName,
          last_name: data.lastName,
        },
        'client'
      )

      // El redirect se maneja automáticamente en el hook useAuth
      // Ya sea a verify-email (si necesita confirmación) o a setup (si no la necesita)

    } catch (err: any) {
      console.error('Register error:', err)

      // Mapear errores de Supabase a mensajes user-friendly
      if (err.message?.includes('User already registered')) {
        setError('Ya existe una cuenta con este email')
      } else if (err.message?.includes('Password should be')) {
        setError('La contraseña no cumple con los requisitos de seguridad')
      } else if (err.message?.includes('Invalid email')) {
        setError('El email no es válido')
      } else if (err.message?.includes('Signup is disabled')) {
        setError('El registro está temporalmente deshabilitado')
      } else {
        setError('Ocurrió un error al crear la cuenta. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      setError(null)
      await signInWithGoogle('client')
    } catch (error) {
      console.error('Error signing up with Google:', error)
      setError('Error al registrarse con Google. Inténtalo de nuevo.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900  hover:bg-slate-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
    
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
            <UserPlus className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Únete a TuTurno</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Empieza tu<br />experiencia
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Accede a cientos de servicios y reserva tus citas en segundos
          </p>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto flex-1">
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
            <h2 className="text-2xl font-bold text-gray-900">Crear Cuenta</h2>
            <p className="text-sm text-gray-600">Únete a miles de usuarios satisfechos</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  Nombre *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="firstName"
                    placeholder="Juan"
                    className="pl-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                    {...register('firstName')}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement
                      target.value = target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                    }}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Apellido *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="lastName"
                    placeholder="Pérez"
                    className="pl-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                    {...register('lastName')}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement
                      target.value = target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                    }}
                  />
                </div>
                {errors.lastName && (
                  <p className="text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Contraseña *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Crea una contraseña segura"
                  className="pl-10 pr-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="flex items-center gap-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">{passwordStrength.text}</span>
                </div>
              )}

              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                Confirmar Contraseña *
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirma tu contraseña"
                  className="pl-10 pr-10 h-10 border-gray-300 focus:border-slate-500 focus:ring-slate-500"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-600">
              Al crear una cuenta, aceptas nuestros{' '}
              <Link href="/terms" className="text-slate-800 hover:text-slate-900 underline">
                Términos
              </Link>
              {' '}y{' '}
              <Link href="/privacy" className="text-slate-800 hover:text-slate-900 underline">
                Privacidad
              </Link>
            </div>

            {/* Action Buttons - Two Columns */}
            <div className="grid grid-cols-2 gap-3">
              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isValid}
                className="h-10 bg-slate-900  hover:bg-slate-800 text-white font-semibold"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                      <span>Registrar</span>
                  </>
                )}
              </Button>

              {/* Google OAuth Button */}
              <Button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                variant="outline"
                type="button"
                className="h-10 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {googleLoading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Footer Links - Two Columns */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
            {/* Login Link */}
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">¿Ya tienes cuenta?</p>
              <Link href="/auth/client/login" className="text-sm text-slate-800 hover:text-slate-900 font-semibold">
                Iniciar sesión
              </Link>
            </div>

            {/* Business Link */}
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">¿Tienes negocio?</p>
              <Link href="/auth/business" className="text-sm text-slate-800 hover:text-slate-900 font-semibold">
                Registrar negocio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}