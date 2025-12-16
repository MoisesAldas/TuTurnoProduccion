'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Building, CheckCircle, LogIn, UserPlus, TrendingUp } from 'lucide-react'
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

export default function BusinessAuthPage() {
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
    <div className="min-h-screen flex">
      {/* Left Panel - Visual */}
      <div className={`hidden lg:flex lg:w-1/2  bg-orange-600 hover:bg-orange-700 p-12 flex-col justify-between relative overflow-hidden transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
      }`}>
        {/* Decorative elements */}
        <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

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
            <Building className="w-5 h-5 text-white" />
            <span className="text-white font-medium">Emprende con nosotros</span>
          </div>

          <h1 className="text-5xl font-bold text-white leading-tight">
            Haz crecer tu<br />negocio
          </h1>

          <p className="text-xl text-white/80 max-w-md">
            Automatiza tus reservas y gestiona tu negocio desde una sola plataforma
          </p>

          {/* Benefits */}
          <div className="space-y-3 pt-4">
            {[
              { icon: <Building className="w-5 h-5" />, text: "Gestiona tu negocio" },
              { icon: <CheckCircle className="w-5 h-5" />, text: "Automatiza reservas" },
              { icon: <TrendingUp className="w-5 h-5" />, text: "Aumenta tus ventas" }
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
      <div className={`w-full lg:w-1/2 flex items-center justify-center p-6 bg-white transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}>
        <div className="w-full max-w-md space-y-6">
          {/* Mobile back button */}
          <div className="lg:hidden">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-orange-600 hover:bg-orange-50">
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
            <h2 className="text-3xl font-bold text-gray-900">¡Bienvenido Emprendedor!</h2>
            <p className="text-gray-600">Selecciona una opción para continuar</p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="border-red-200 bg-red-50">
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

          {/* Auth Option Cards */}
          <div className="space-y-6">
            {/* Login Card */}
            <Link href="/auth/business/login">
              <div className="group cursor-pointer bg-white border-2 border-gray-200 rounded-xl py-8 px-6 hover:border-orange-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <LogIn className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Iniciar Sesión</h3>
                    <p className="text-sm text-gray-600">Ya tengo una cuenta de negocio</p>
                  </div>
                  <div className="text-orange-600 text-2xl group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </div>
                </div>
              </div>
            </Link>

            {/* Register Card */}
            <Link href="/auth/business/register">
              <div className="mt-2 group cursor-pointer bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl py-8 px-6 hover:border-orange-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14  bg-orange-500 hover:bg-orange-600 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <UserPlus className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">Registrar Negocio</h3>
                    <p className="text-sm text-gray-600">Soy nuevo, quiero registrarme</p>
                  </div>
                  <div className="text-amber-600 text-2xl group-hover:translate-x-1 transition-transform duration-300">
                    →
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Client Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">¿Eres un cliente?</p>
            <Link href="/auth/client">
              <Button variant="outline" className="border-2 border-orange-200 text-orange-700 hover:bg-orange-50">
                Reservar una cita
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
