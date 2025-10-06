'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CalendarDays, Building, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const ERROR_MESSAGES = {
  auth_error: 'Ocurrió un error durante la autenticación.',
  no_code: 'No se recibió el código de autorización.',
  invalid_type: 'Tipo de usuario inválido.',
  session_error: 'Error al crear la sesión.',
  no_user: 'No se pudo obtener la información del usuario.',
  database_error: 'Error de conexión con la base de datos.',
  email_different_type: 'Este email ya está registrado como un tipo de usuario diferente. Usa otro email.',
  email_exists: 'Este email ya está siendo usado por otro usuario.',
  unexpected_error: 'Ocurrió un error inesperado.',
  invalid_setup: 'Configuración de perfil inválida.'
}

export default function LoginPage() {
  const [loading, setLoading] = useState<'client' | 'business' | null>(null)
  const { signInWithGoogle } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const error = errorParam ? ERROR_MESSAGES[errorParam as keyof typeof ERROR_MESSAGES] : null

  const handleGoogleSignIn = async (userType: 'client' | 'business_owner') => {
    try {
      setLoading(userType === 'client' ? 'client' : 'business')
      await signInWithGoogle(userType)
    } catch (error) {
      console.error('Error signing in:', error)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-slate-700 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-slate-700 bg-clip-text text-transparent">
              TuTurno
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
          <p className="text-gray-600">Elige cómo quieres continuar</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Opciones de login */}
        <div className="space-y-4">
          {/* Cliente */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
              <CardTitle className="text-lg">Soy Cliente</CardTitle>
              <CardDescription>
                Quiero reservar citas y servicios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleGoogleSignIn('client')}
                disabled={loading !== null}
                className="w-full"
                size="lg"
              >
                {loading === 'client' ? 'Cargando...' : 'Continuar con Google'}
              </Button>
            </CardContent>
          </Card>

          {/* Negocio */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Building className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Tengo un Negocio</CardTitle>
              <CardDescription>
                Quiero ofrecer mis servicios y gestionar citas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleGoogleSignIn('business_owner')}
                disabled={loading !== null}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {loading === 'business' ? 'Cargando...' : 'Registrar Negocio'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Al continuar, aceptas nuestros términos y condiciones</p>
          <p className="mt-2 text-xs">
            Cada email solo puede ser usado para un tipo de cuenta (Cliente o Negocio)
          </p>
        </div>
      </div>
    </div>
  )
}