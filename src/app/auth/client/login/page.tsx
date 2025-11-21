'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Eye, EyeOff, Mail, Lock, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'
import AuthProgressSteps from '@/components/AuthProgressSteps'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

const ERROR_MESSAGES = {
  auth_error: 'Ocurrió un error durante la autenticación.',
  invalid_credentials: 'Email o contraseña incorrectos.',
  email_not_confirmed: 'Por favor confirma tu email antes de iniciar sesión.',
  too_many_attempts: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.',
  user_not_found: 'No existe una cuenta con este email.',
  invalid_type: 'Esta cuenta no es de tipo cliente.',
  unexpected_error: 'Ocurrió un error inesperado.',
}

export default function ClientLoginPage() {
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { signInWithGoogle, signInWithEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const returnUrl = searchParams.get('returnUrl')

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (errorParam) {
      setError(ERROR_MESSAGES[errorParam as keyof typeof ERROR_MESSAGES] || 'Ocurrió un error inesperado')
    }
  }, [errorParam])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true)
      setError(null)
      await signInWithEmail(data.email, data.password, 'client')
      if (returnUrl) {
        router.push(decodeURIComponent(returnUrl))
      }
    } catch (err: any) {
      console.error('Login error:', err)
      if (err.message?.includes('Invalid login credentials')) {
        setError('Email o contraseña incorrectos')
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Por favor confirma tu email antes de iniciar sesión')
      } else if (err.message?.includes('Too many requests')) {
        setError('Demasiados intentos fallidos. Intenta de nuevo más tarde')
      } else {
        setError('Ocurrió un error al iniciar sesión. Inténtalo de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      setError(null)
      if (returnUrl) {
        localStorage.setItem('authReturnUrl', returnUrl)
      }
      await signInWithGoogle('client')
    } catch (error) {
      console.error('Error signing in with Google:', error)
      setError('Error al iniciar sesión con Google. Inténtalo de nuevo.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

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
            <Sparkles className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Bienvenido de vuelta</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Accede a tu<br />cuenta cliente
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Gestiona tus reservas y descubre los mejores servicios cerca de ti
          </p>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md space-y-4">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Link href="/auth/client">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>

          {/* Progress Steps */}
          <div className="flex justify-center">
            <AuthProgressSteps currentStep={2} userType="client" variant="login" />
          </div>

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="lg:hidden mb-4">
              <Logo color="black" size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h2>
            <p className="text-sm text-gray-600">Ingresa tus credenciales para continuar</p>
          </div>

          {/* New User Banner */}
          <Alert className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 py-2">
            <AlertDescription className="text-center">
              <p className="text-sm text-gray-800 font-medium">
                ¿Primera vez en TuTurno?{' '}
                <Link href="/auth/client/register" className="font-bold text-emerald-700 hover:text-emerald-800 underline decoration-2 underline-offset-2 transition-colors">
                  Crea tu cuenta gratis aquí
                </Link>
              </p>
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/* Email Field */}
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className="pl-10 h-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
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
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Tu contraseña"
                  className="pl-10 pr-10 h-10 border-gray-300 focus:border-emerald-500 focus:ring-emerald-500"
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
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link href="/auth/client/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">O continúa con</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            variant="outline"
            className="w-full h-10 border-2 border-gray-300 hover:bg-gray-50"
          >
            {googleLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></div>
                Conectando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm">Continuar con Google</span>
              </>
            )}
          </Button>

          {/* Business Link */}
          <div className="text-center pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-1">
              ¿Tienes un negocio?
            </p>
            <Link href="/auth/business" className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold">
              Registrar mi negocio →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
