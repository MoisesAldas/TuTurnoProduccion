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
import { CalendarDays, ArrowLeft, Lock, Eye, EyeOff, CheckCircle, Key } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Debe contener al menos: 1 minúscula, 1 mayúscula y 1 número'
    ),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export default function BusinessResetPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { authState } = useAuth()

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Verificar sesión válida para reset password
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          console.error('No valid session for password reset:', error)
          setSessionValid(false)
          setError('Enlace de recuperación inválido o expirado. Solicita uno nuevo.')
          return
        }

        ('✅ Valid session found for password reset')
        setSessionValid(true)
      } catch (err) {
        console.error('Error checking session:', err)
        setSessionValid(false)
        setError('Error al verificar la sesión. Solicita un nuevo enlace.')
      }
    }

    checkSession()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onChange',
  })

  const password = watch('password')

  // Calcular fuerza de contraseña
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' }

    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[^a-zA-Z\d]/.test(password)) score++

    if (score <= 2) return { score, label: 'Débil', color: 'bg-red-500' }
    if (score <= 3) return { score, label: 'Media', color: 'bg-yellow-500' }
    if (score <= 4) return { score, label: 'Fuerte', color: 'bg-orange-500' }
    return { score, label: 'Muy Fuerte', color: 'bg-orange-600' }
  }

  const passwordStrength = getPasswordStrength(password || '')

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!sessionValid) {
      setError('Sesión inválida. Solicita un nuevo enlace de recuperación.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Actualizar la contraseña directamente (la sesión ya está establecida)
      const { error } = await supabase.auth.updateUser({
        password: data.password
      })

      if (error) {
        console.error('Error updating password:', error)
        setError('Error al actualizar la contraseña. Inténtalo de nuevo.')
        return
      }

      ('✅ Password updated successfully')
      setSuccess(true)

      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/auth/business/login?message=password_updated')
      }, 3000)

    } catch (err: any) {
      console.error('Reset password error:', err)
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Mostrar loading mientras se verifica la sesión
  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando enlace de recuperación...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}>
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-1/4 w-96 h-96 bg-orange-400/10 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-amber-400/10 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 right-10 w-72 h-72 bg-yellow-400/10 rounded-full filter blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Success Card */}
          <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900">¡Contraseña Actualizada!</CardTitle>
              <CardDescription className="text-gray-600">
                Tu contraseña se ha cambiado exitosamente
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-center">
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-orange-800 font-medium">
                  Ya puedes iniciar sesión con tu nueva contraseña
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p>Serás redirigido al login en unos segundos...</p>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <Link href="/auth/business/login">
                  <Button className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white">
                    Ir al Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden transition-all duration-1000 ${
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
        <div className="absolute top-1/3 right-20 animate-bounce delay-[1500ms]">
          <div className="w-6 h-6 bg-amber-400 rounded-full opacity-40"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce delay-[2000ms]">
          <div className="w-5 h-5 bg-yellow-400 rounded-full opacity-50"></div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Back Button */}
        <div className={`flex justify-start transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <Link href="/auth/business/login">
            <Button variant="ghost" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className={`text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '200ms' }}>
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <Logo color="black" size="lg" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nueva Contraseña
          </h1>
          <p className="text-gray-600">
            Crea una contraseña segura para tu cuenta
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className={`border-red-200 bg-red-50/90 backdrop-blur-sm transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Reset Password Form */}
        <Card className={`bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '600ms' }}>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Key className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">Cambiar Contraseña</CardTitle>
            <CardDescription className="text-gray-600">
              Ingresa tu nueva contraseña segura
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Nueva Contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu nueva contraseña"
                    className="pl-10 pr-10 h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Seguridad:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-600' :
                        passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-orange-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="text-sm text-red-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirmar Contraseña *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirma tu contraseña"
                    className="pl-10 pr-10 h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isValid || !sessionValid}
                className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-lg h-12"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                    Actualizando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Cambiar Contraseña
                  </>
                )}
              </Button>
            </form>

            {/* Security Tips */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">
                Tips para una contraseña segura:
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Mínimo 8 caracteres</p>
                <p>• Incluye mayúsculas y minúsculas</p>
                <p>• Agrega números y símbolos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}