'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Building, ArrowLeft, Sparkles, Star, CheckCircle, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'

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

export default function BusinessAuthPage() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const error = errorParam ? ERROR_MESSAGES[errorParam as keyof typeof ERROR_MESSAGES] : null

  // Animación de entrada
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

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

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Back Button */}
        <div className={`flex justify-start transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`}>
          <Link href="/">
            <Button variant="ghost" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al inicio
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

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              ¡Bienvenido Emprendedor!
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-sm mx-auto">
              Registra tu negocio y conecta con miles de clientes
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 gap-3 mb-8">
            {[
              { icon: <Building className="w-4 h-4" />, text: "Gestiona tu negocio" },
              { icon: <CheckCircle className="w-4 h-4" />, text: "Automatiza reservas" },
              { icon: <Sparkles className="w-4 h-4" />, text: "Aumenta tus ventas" }
            ].map((benefit, index) => (
              <div
                key={index}
                className={`flex items-center justify-center gap-2 text-orange-700 bg-orange-50 rounded-full px-4 py-2 transition-all duration-500 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}
                style={{ transitionDelay: `${400 + index * 100}ms` }}
              >
                {benefit.icon}
                <span className="text-sm font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className={`border-red-200 bg-red-50/90 backdrop-blur-sm transition-all duration-500 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`} style={{ transitionDelay: '600ms' }}>
            <AlertDescription className="text-red-700 space-y-3">
              <p>{error}</p>
              {errorParam === 'email_different_type' && (
                <Link href="/auth/client">
                  <Button variant="outline" className="w-full mt-2 border-red-300 text-red-700 hover:bg-red-50">
                    Ir al registro de clientes
                  </Button>
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Auth Options Cards */}
        <div className={`space-y-4 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`} style={{ transitionDelay: '700ms' }}>

          {/* Login Card */}
          <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 cursor-pointer group">
            <Link href="/auth/business/login">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                    <LogIn className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Iniciar Sesión</h3>
                    <p className="text-sm text-gray-600">Ya tengo una cuenta de negocio</p>
                  </div>
                  <div className="text-orange-600 group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>

          {/* Register Card */}
          <Card className="bg-white/95 backdrop-blur-md border border-white/40 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-1 cursor-pointer group">
            <Link href="/auth/business/register">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                    <UserPlus className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Registrar Negocio</h3>
                    <p className="text-sm text-gray-600">Soy nuevo, quiero registrarme</p>
                  </div>
                  <div className="text-amber-600 group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Client Link */}
        <div className={`text-center transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '900ms' }}>
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-lg">
            <p className="text-sm text-gray-600 mb-3">
              ¿Eres un cliente?
            </p>
            <Link href="/auth/client">
              <Button variant="outline" className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50 transition-all duration-200">
                Reservar una cita
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className={`text-center text-sm text-gray-500 space-y-2 transition-all duration-700 ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        }`} style={{ transitionDelay: '1000ms' }}>
          <p>Al continuar, aceptas nuestros términos y condiciones</p>
          <div className="flex justify-center items-center gap-6 text-xs">
            <span>✓ Comisión del 0%</span>
            <span>✓ Soporte 24/7</span>
            <span>✓ Setup gratuito</span>
          </div>
        </div>
      </div>
    </div>
  )
}