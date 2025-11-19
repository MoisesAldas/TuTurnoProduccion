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
import { useTheme } from 'next-themes'
import Link from 'next/link'
import Logo from '@/components/logo'

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
  const { theme } = useTheme()
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
      { strength: 4, text: 'Fuerte', color: 'bg-emerald-500' },
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
        <div className={`flex justify-start transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <Link href="/auth/client">
            <Button variant="ghost" className="text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
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
            Crear Cuenta
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Únete a miles de usuarios satisfechos
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

        {/* Register Form */}
        <Card className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-white/40 dark:border-gray-700/40 shadow-xl hover:shadow-2xl transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '600ms' }}>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-cyan-600 dark:from-teal-600 dark:to-cyan-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">¡Bienvenido a TuTurno!</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Completa tus datos para crear tu cuenta
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nombre *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="firstName"
                      placeholder="Juan"
                      className="pl-9 h-11 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                      {...register('firstName')}
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement
                        target.value = target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                      }}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Apellido *
                  </Label>
                  <Input
                    id="lastName"
                    placeholder="Pérez"
                    className="h-11 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('lastName')}
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement
                      target.value = target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '')
                    }}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.lastName.message}</p>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    className="pl-10 h-12 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crea una contraseña segura"
                    className="pl-10 pr-10 h-12 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{passwordStrength.text}</span>
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmar Contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirma tu contraseña"
                    className="pl-10 pr-10 h-12 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-600 focus:border-emerald-500 dark:focus:border-emerald-600 hover:border-gray-300 dark:hover:border-gray-500 transition-all text-gray-900 dark:text-gray-100"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 dark:bg-red-400 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
                Al crear una cuenta, aceptas nuestros{' '}
                <Link href="/terms" className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400">
                  Términos y Condiciones
                </Link>
                {' '}y{' '}
                <Link href="/privacy" className="text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400">
                  Política de Privacidad
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isValid}
                className="w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 hover:from-teal-700 hover:via-cyan-700 hover:to-emerald-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-lg h-12"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Crear Cuenta
                  </>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">O también</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              variant="outline"
              className="w-full border-2 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 h-12"
            >
              {googleLoading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full mr-3"></div>
                  Conectando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Registrarse con Google
                </>
              )}
            </Button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                ¿Ya tienes cuenta?
              </p>
              <Link href="/auth/client/login">
                <Button variant="outline" className="border-2 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200">
                  Iniciar sesión
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Business Link */}
        <div className={`text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '800ms' }}>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-4 border border-white/40 dark:border-gray-700/40 shadow-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              ¿Tienes un negocio?
            </p>
            <Link href="/auth/business">
              <Button variant="outline" className="border-2 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200">
                Registrar mi negocio
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
