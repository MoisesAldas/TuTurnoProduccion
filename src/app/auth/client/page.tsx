'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Sparkles, Star, CheckCircle, LogIn, UserPlus } from 'lucide-react'
import Link from 'next/link'
import Logo from '@/components/logo'

const ERROR_MESSAGES = {
  auth_error: 'Ocurrió un error durante la autenticación.',
  no_code: 'No se recibió el código de autorización.',
  invalid_type: 'Tipo de usuario inválido.',
  session_error: 'Error al crear la sesión.',
  no_user: 'No se pudo obtener la información del usuario.',
  database_error: 'Error de conexión con la base de datos.',
  email_different_type: 'Este email ya está registrado como negocio. ¿Quieres iniciar sesión como negocio?',
  email_exists: 'Este email ya está siendo usado por otro usuario.',
  unexpected_error: 'Ocurrió un error inesperado.',
  invalid_setup: 'Configuración de perfil inválida.'
}

export default function ClientAuthPage() {
  const [isVisible, setIsVisible] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const error = errorParam ? ERROR_MESSAGES[errorParam as keyof typeof ERROR_MESSAGES] : null

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Left Panel - Visual */}
      <div className={`hidden lg:flex lg:w-1/2 bg-slate-900 hover:bg-slate-800 p-12 flex-col justify-between relative overflow-hidden transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
      }`}>
        {/* Decorative elements */}
 
        {/* Back button */}
        <div className="relative z-10">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            
            <span className="text-white font-medium">Bienvenido de vuelta</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Reserva tus<br />servicios favoritos
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Accede a miles de negocios y agenda tus citas en segundos
          </p>

          {/* Benefits */}
          <div className="space-y-3 pt-4">
            {[
              { icon: <Star className="w-5 h-5" />, text: "Reserva en segundos" },
              { icon: <CheckCircle className="w-5 h-5" />, text: "Confirmaciones automáticas" },
              { icon: <Sparkles className="w-5 h-5" />, text: "Recordatorios inteligentes" }
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  {benefit.icon}
                </div>
                <span className="text-lg font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Logo color="white" size="lg" />
        </div>
      </div>

      {/* Right Panel - Options */}
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-6 bg-white overflow-y-auto flex-1 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}>
        <div className="w-full max-w-md space-y-6">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
            </Link>
          </div>

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="lg:hidden mb-4">
              <Logo color="black" size="lg" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">¡Bienvenido!</h2>
            <p className="text-gray-600">Selecciona una opción para continuar</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700 space-y-3">
                <p>{error}</p>
                {errorParam === 'email_different_type' && (
                  <Link href="/auth/business">
                    <Button variant="outline" className="w-full mt-2 border-red-300 text-red-700 hover:bg-red-50">
                      Ir al registro de negocios
                    </Button>
                  </Link>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Auth Option Cards */}
          <div className="space-y-6">
            {/* Login Card */}
            <Link href="/auth/client/login">
              <div className="group cursor-pointer bg-white border-2 border-gray-200 rounded-xl py-8 px-6 hover:border-slate-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-900  hover:bg-slate-800 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <LogIn className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Iniciar Sesión</h3>
                    <p className="text-sm text-gray-600">Ya tengo una cuenta de cliente</p>
                  </div>
                  <div className="text-slate-600 text-2xl group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </div>
                </div>
              </div>
            </Link>

            {/* Register Card */}
            <Link href="/auth/client/register">
              <div className="group cursor-pointer mt-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-slate-300 rounded-xl py-8 px-6 hover:border-slate-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-900  hover:bg-slate-800 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <UserPlus className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Crear Cuenta</h3>
                    <p className="text-sm text-gray-600">Soy nuevo, quiero registrarme</p>
                  </div>
                  <div className="text-slate-600 text-2xl group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Business Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">¿Tienes un negocio?</p>
            <Link href="/auth/business">
              <Button
  variant="outline"
  className="
    border-2 border-slate-800
    text-slate-800
    hover:bg-slate-900
    hover:text-white
    hover:border-slate-900
    transition-colors
    duration-200
  "
>
  Registrar mi negocio
</Button>

            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
