'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, CheckCircle, Clock, RefreshCw, MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'
import Logo from '@/components/logo'

export default function VerifyEmailPage() {
  const [isVisible, setIsVisible] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const supabase = createClient()

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  // Verificar si el usuario ya está verificado y autenticado
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email_confirmed_at) {
        // Usuario ya verificado, redirigir a setup
        router.push('/auth/client/setup')
      }
    }

    checkAuth()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          router.push('/auth/client/setup')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const resendEmail = async () => {
    if (!email) return

    try {
      setResending(true)
      setError(null)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        setError('Error al reenviar el email. Inténtalo de nuevo.')
        console.error('Error resending email:', error)
        return
      }

      setResent(true)
      setTimeout(() => setResent(false), 5000) // Reset después de 5 segundos
    } catch (error) {
      console.error('Error resending email:', error)
      setError('Error al reenviar el email. Inténtalo de nuevo.')
    } finally {
      setResending(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-600 mb-4">No se encontró la información del email.</p>
            <Link href="/auth/client">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
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
            <MailCheck className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Verificación de Email</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Revisa tu<br />correo
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Estás a un paso de comenzar tu experiencia con TuTurno
          </p>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Content */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-3 py-2">
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
            <h2 className="text-2xl font-bold text-gray-900">Verifica tu Email</h2>
            <p className="text-sm text-gray-600">Te hemos enviado un enlace de verificación</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {resent && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Email reenviado exitosamente. Revisa tu bandeja de entrada.
              </AlertDescription>
            </Alert>
          )}

          {/* Verification Card */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="text-center pb-3">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-lg font-bold text-gray-900">Revisa tu Email</CardTitle>
              <CardDescription className="text-sm text-gray-600">
                Hemos enviado un enlace de verificación a
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Email Display */}
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="text-slate-800 font-medium text-sm text-center break-all">
                  {email}
                </p>
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-0.5">Próximos pasos</h4>
                    <p className="text-xs text-gray-600">
                      Haz clic en el enlace del email para verificar tu cuenta y completar el registro.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 mb-0.5">Después de verificar</h4>
                    <p className="text-xs text-gray-600">
                      Serás redirigido automáticamente para completar tu perfil.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resend Button */}
              <div className="pt-3 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-600 mb-2">
                  ¿No recibiste el email?
                </p>
                <Button
                  onClick={resendEmail}
                  disabled={resending}
                  variant="outline"
                  className="h-10 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                >
                  {resending ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></div>
                      Reenviando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reenviar email
                    </>
                  )}
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Revisa tu carpeta de spam si no encuentras el email
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500">
            <p>El enlace de verificación expira en 24 horas</p>
          </div>
        </div>
      </div>
    </div>
  )
}