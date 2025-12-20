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
import { KeyRound, ArrowLeft, Mail, CheckCircle, Send } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'
import Logo from '@/components/logo'

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

  // Verificar si hay mensaje de error en la URL (ej: enlace expirado)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const errorType = searchParams.get('error')
    const errorMessage = searchParams.get('message')

    if (errorType === 'link_expired') {
      setError(errorMessage || 'El enlace de recuperación ha expirado. Por favor solicita uno nuevo.')
    }
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
      <div className="min-h-screen flex">
        {/* Left Panel - Visual */}
        <div className="hidden lg:flex lg:w-1/2 bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-800 p-12 flex-col justify-between relative overflow-hidden">
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
            <div className="inline-flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 dark:border-white/10">
              <CheckCircle className="w-5 h-5 text-white" />
              <span className="text-white font-medium">Email Enviado</span>
            </div>

            <h1 className="text-5xl font-bold text-white leading-tight">
              Revisa tu<br />correo
            </h1>

            <p className="text-xl text-white/80 dark:text-white/70 max-w-md">
              Te hemos enviado las instrucciones para restablecer tu contraseña
            </p>
          </div>

          {/* Logo */}
          <div className="relative z-10">
            <Logo color="white" size="lg" />
          </div>
        </div>

        {/* Right Panel - Success Content */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-gray-950 overflow-y-auto">
          <div className="w-full max-w-md space-y-4 py-2">
            {/* Mobile back button */}
            <div className="lg:hidden">
              <Link href="/auth/business">
                <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20">
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">¡Email Enviado!</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Revisa tu bandeja de entrada</p>
            </div>

            {/* Email Display */}
            <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
              <p className="text-orange-800 dark:text-orange-400 font-medium text-center break-all text-sm">
                {emailValue}
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-3 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Haz clic en el enlace del email para restablecer tu contraseña.
              </p>

              <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                <p>• Si no ves el email, revisa tu carpeta de spam</p>
                <p>• El enlace expira en 1 hora</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Link href="/auth/business/login">
                <Button className="w-full h-10 bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-800 text-white">
                  Volver al Login
                </Button>
              </Link>

              <Link href="/auth/business">
                <Button variant="outline" className="mt-2 w-full h-10 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Back button */}
        <div className="relative z-10">
          <Link href="/auth/business/login">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Login
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 dark:border-white/10">
            <KeyRound className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Recuperación</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Recupera tu<br />contraseña
          </h1>

          <p className="text-xl text-white/80 dark:text-white/70 max-w-md">
            Te enviaremos un enlace para restablecer tu contraseña de forma segura
          </p>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="w-full max-w-md space-y-4 py-2">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Link href="/auth/business/login">
              <Button variant="ghost" size="sm" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver al Login
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="lg:hidden mb-2">
              <Logo color="black" size="lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Recuperar Contraseña</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Ingresa tu email para recibir instrucciones</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <AlertDescription className="text-red-700 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@negocio.com"
                      className="pl-10 h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-orange-500 dark:focus:ring-orange-400"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-red-600 dark:text-red-400">{errors.email.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading || !isValid}
                  className="w-full h-10 bg-orange-600 dark:bg-orange-700 hover:bg-orange-700 dark:hover:bg-orange-800 text-white font-semibold"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Instrucciones
                    </>
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  ¿Recordaste tu contraseña?
                </p>
                <Link href="/auth/business/login">
                  <Button variant="outline" className="w-full h-10 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    Volver al Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Client Link */}
          <div className="text-center pt-2">
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                ¿Eres cliente?
              </p>
              <Link href="/auth/client">
                <Button variant="outline" className="border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Reservar una cita
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}