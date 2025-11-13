'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Mail, ArrowLeft, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'
import Logo from '@/components/logo'

export default function BusinessVerifyEmailPage() {
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
        router.push('/auth/business/setup')
      }
    }

    checkAuth()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
          router.push('/auth/business/setup')
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p className="text-gray-600 mb-4">No se encontró la información del email.</p>
            <Link href="/auth/business">
              <Button variant="outline">Volver al inicio</Button>
            </Link>
          </CardContent>
        </Card>
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
          <Link href="/auth/business">
            <Button variant="ghost" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
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
            <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <Logo color="black" size="lg" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verifica tu Email
          </h1>
          <p className="text-gray-600">
            Te hemos enviado un enlace de verificación
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

        {/* Success Alert */}
        {resent && (
          <Alert className={`border-orange-200 bg-orange-50/90 backdrop-blur-sm transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '400ms' }}>
            <CheckCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              Email reenviado exitosamente. Revisa tu bandeja de entrada.
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Card */}
        <Card className={`bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '600ms' }}>
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">Revisa tu Email</CardTitle>
            <CardDescription className="text-gray-600">
              Hemos enviado un enlace de verificación a
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Email Display */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-orange-800 font-medium text-center break-all">
                {email}
              </p>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Próximos pasos</h4>
                  <p className="text-sm text-gray-600">
                    Haz clic en el enlace del email para verificar tu cuenta y configurar tu negocio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Después de verificar</h4>
                  <p className="text-sm text-gray-600">
                    Serás redirigido automáticamente para completar tu perfil y configurar tu negocio.
                  </p>
                </div>
              </div>
            </div>

            {/* Resend Button */}
            <div className="pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600 mb-3">
                ¿No recibiste el email?
              </p>
              <Button
                onClick={resendEmail}
                disabled={resending}
                variant="outline"
                className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50 transition-all duration-200"
              >
                {resending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full mr-2"></div>
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
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Revisa tu carpeta de spam si no encuentras el email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className={`text-center text-sm text-gray-500 space-y-2 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '800ms' }}>
          <p>El enlace de verificación expira en 24 horas</p>
        </div>
      </div>
    </div>
  )
}