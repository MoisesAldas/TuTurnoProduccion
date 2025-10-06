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
import { CalendarDays, ArrowLeft, Mail, CheckCircle, Send } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingresa un email válido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function BusinessForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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
    watch,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
  })

  const emailValue = watch('email')

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?type=business_owner&action=reset-password`,
      })

      if (error) {
        console.error('Error sending reset email:', error)
        setError('Error al enviar el email de recuperación. Verifica que el email sea correcto.')
        return
      }

      setSuccess(true)
    } catch (err: any) {
      console.error('Reset password error:', err)
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
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
              <CardTitle className="text-xl font-bold text-gray-900">Email Enviado</CardTitle>
              <CardDescription className="text-gray-600">
                Te hemos enviado las instrucciones para restablecer tu contraseña
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Email Display */}
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-orange-800 font-medium text-center break-all">
                  {emailValue}
                </p>
              </div>

              <div className="space-y-4 text-center">
                <p className="text-sm text-gray-600">
                  Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
                </p>

                <div className="text-xs text-gray-500">
                  <p>Si no ves el email, revisa tu carpeta de spam.</p>
                  <p>El enlace expira en 1 hora.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <Link href="/auth/business/login">
                  <Button className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white">
                    Volver al Login
                  </Button>
                </Link>

                <Link href="/auth/business">
                  <Button variant="outline" className="w-full border-2 border-orange-200 text-orange-700 hover:bg-orange-50">
                    Inicio
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
            <div className="w-12 h-12 bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <span className="text-3xl font-bold text-black">TuTurno</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Recuperar Contraseña
          </h1>
          <p className="text-gray-600">
            Ingresa tu email para recibir instrucciones de recuperación
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

        {/* Forgot Password Form */}
        <Card className={`bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '600ms' }}>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">Restablecer Contraseña</CardTitle>
            <CardDescription className="text-gray-600">
              Te enviaremos un enlace para cambiar tu contraseña
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email *
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@negocio.com"
                    className="pl-10 h-12 bg-white/50 backdrop-blur-sm border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 flex-shrink-0"></span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !isValid}
                className="w-full bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white font-medium shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 disabled:opacity-50 disabled:transform-none disabled:shadow-lg h-12"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Enviar Instrucciones
                  </>
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-3">
                ¿Recordaste tu contraseña?
              </p>
              <Link href="/auth/business/login">
                <Button variant="outline" className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50 transition-all duration-200">
                  Volver al Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Client Link */}
        <div className={`text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '800ms' }}>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
            <p className="text-sm text-gray-600 mb-3">
              ¿Eres cliente?
            </p>
            <Link href="/auth/client">
              <Button variant="outline" className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50 transition-all duration-200">
                Reservar una cita
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}