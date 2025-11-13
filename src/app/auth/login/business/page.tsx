'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Building, ArrowLeft, TrendingUp, Users, Shield, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'

const ERROR_MESSAGES = {
  auth_error: 'Ocurrió un error durante la autenticación.',
  no_code: 'No se recibió el código de autorización.',
  invalid_type: 'Tipo de usuario inválido.',
  session_error: 'Error al crear la sesión.',
  no_user: 'No se pudo obtener la información del usuario.',
  database_error: 'Error de conexión con la base de datos.',
  email_different_type: 'Este email ya está registrado como cliente. ¿Quieres iniciar sesión como cliente?',
  email_exists: 'Este email ya está siendo usado por otro usuario.',
  unexpected_error: 'Ocurrió un error inesperado.',
  invalid_setup: 'Configuración de perfil inválida.'
}

export default function BusinessLoginPage() {
  const [loading, setLoading] = useState(false)
  const { signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const error = errorParam ? ERROR_MESSAGES[errorParam as keyof typeof ERROR_MESSAGES] : null

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      await signInWithGoogle('business_owner')
    } catch (error) {
      console.error('Error signing in:', error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-white/10 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-white/5 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-10 w-72 h-72 bg-white/5 rounded-full filter blur-3xl animate-pulse delay-500"></div>

        {/* Floating dots */}
        <div className="absolute top-1/4 left-10 animate-bounce delay-1000">
          <div className="w-4 h-4 bg-white/30 rounded-full"></div>
        </div>
        <div className="absolute top-1/3 right-20 animate-bounce delay-1500">
          <div className="w-6 h-6 bg-white/20 rounded-full"></div>
        </div>
        <div className="absolute bottom-1/3 left-1/4 animate-bounce delay-2000">
          <div className="w-5 h-5 bg-white/25 rounded-full"></div>
        </div>
      </div>

      <div className="w-full max-w-lg space-y-8 relative z-10">
        {/* Back Button */}
        <div className="flex justify-start">
          <Link href="/">
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center text-white">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
              <CalendarDays className="w-7 h-7 text-white" />
            </div>
            <Logo color="white" size="lg" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-3">
              ¡Haz Crecer tu Negocio!
            </h1>
            <p className="text-lg text-white/90 leading-relaxed max-w-md mx-auto">
              Únete a miles de empresarios que ya transformaron sus negocios con nuestra plataforma
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: <TrendingUp className="w-5 h-5" />, text: "Aumenta ingresos 40%" },
              { icon: <Users className="w-5 h-5" />, text: "Gestiona clientes fácil" },
              { icon: <Shield className="w-5 h-5" />, text: "Datos 100% seguros" },
              { icon: <Zap className="w-5 h-5" />, text: "Setup en 60 segundos" }
            ].map((benefit, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="text-white">
                    {benefit.icon}
                  </div>
                  <span className="text-sm font-medium text-white/90 text-center leading-tight">{benefit.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="bg-red-50/90 backdrop-blur-sm border-red-200">
            <AlertDescription className="text-red-700 space-y-3">
              <p>{error}</p>
              {errorParam === 'email_different_type' && (
                <Link href="/auth/login/client">
                  <Button variant="outline" className="w-full mt-2 border-red-300 text-red-700 hover:bg-red-50">
                    Ir al login de clientes
                  </Button>
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Login Card */}
        <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
              <Building className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">Registro de Negocio</CardTitle>
            <CardDescription className="text-gray-600">
              Crea tu cuenta empresarial y comienza a gestionar tu negocio
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-medium shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 py-6 text-lg"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                  Registrando negocio...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Registrar con Google
                </>
              )}
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">
                ¿Eres cliente?
              </p>
              <Link href="/auth/login/client">
                <Button variant="outline" className="border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  Iniciar sesión como cliente
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Business Benefits */}
        <div className="text-center text-white/90 space-y-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="font-bold text-white mb-2">🚀 Primeros 30 días GRATIS</h3>
            <p className="text-sm">Sin compromisos, sin tarjeta de crédito</p>
          </div>

          <div className="flex justify-center items-center gap-6 text-xs">
            <span>✓ Sin límites de citas</span>
            <span>✓ Soporte 24/7</span>
            <span>✓ Configuración gratuita</span>
          </div>
        </div>
      </div>
    </div>
  )
}