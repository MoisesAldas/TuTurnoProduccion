'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft, Bell, MessageSquare, Mail, Trash2,
  Shield, CheckCircle, Save, Smartphone, Globe,
  AlertTriangle, Settings, UserX
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabaseClient'
import Link from 'next/link'

interface NotificationSettings {
  email_notifications: boolean
  whatsapp_notifications: boolean
  push_notifications: boolean
  appointment_reminders: boolean
  promotional_messages: boolean
  booking_confirmations: boolean
}

export default function AjustesPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    whatsapp_notifications: true,
    push_notifications: true,
    appointment_reminders: true,
    promotional_messages: false,
    booking_confirmations: true
  })

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { authState, signOut } = useAuth()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      loadSettings()
    }
  }, [authState.user])

  const loadSettings = async () => {
    // Aquí cargarías las configuraciones desde la base de datos
    // Por ahora usamos valores por defecto
    console.log('Loading notification settings...')
  }

  const handleSaveSettings = async () => {
    setLoading(true)

    try {
      // Simular guardado en base de datos
      await new Promise(resolve => setTimeout(resolve, 1000))

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)

    try {
      // Aquí implementarías la lógica para eliminar la cuenta
      await new Promise(resolve => setTimeout(resolve, 2000))

      alert('Cuenta eliminada exitosamente')
      await signOut()
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Error al eliminar la cuenta')
    } finally {
      setDeleting(false)
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/dashboard/client">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-green-600" />
                  Ajustes
                </h1>
              </div>
            </div>

            {saved && (
              <div className="flex items-center space-x-2 text-green-600 animate-pulse">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">¡Ajustes guardados!</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
              <AvatarImage
                src={authState.user?.avatar_url}
                alt={authState.user?.first_name || 'Usuario'}
              />
              <AvatarFallback className="bg-green-100 text-green-600 text-2xl font-bold">
                {(authState.user?.first_name || authState.user?.email)?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Personaliza tu Experiencia
          </h2>
          <p className="text-gray-600">
            Configura tus notificaciones y preferencias de cuenta
          </p>
        </div>

        <div className="space-y-6">
          {/* Notification Settings */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b">
              <CardTitle className="flex items-center text-xl">
                <Bell className="w-6 h-6 mr-3 text-green-600" />
                Notificaciones
                <span className="ml-3 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  Personalizable
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Email Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Notificaciones por Email
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Recibe confirmaciones y recordatorios por correo electrónico
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(value) => updateSetting('email_notifications', value)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                {/* WhatsApp Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Notificaciones por WhatsApp
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Recibe mensajes directos por WhatsApp para tus citas
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.whatsapp_notifications}
                    onCheckedChange={(value) => updateSetting('whatsapp_notifications', value)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Notificaciones Push
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Recibe notificaciones instantáneas en tu dispositivo
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(value) => updateSetting('push_notifications', value)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                {/* Appointment Reminders */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Bell className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Recordatorios de Citas
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Recordatorios 24h y 1h antes de tu cita programada
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.appointment_reminders}
                    onCheckedChange={(value) => updateSetting('appointment_reminders', value)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                {/* Booking Confirmations */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Confirmaciones de Reserva
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Confirmaciones inmediatas cuando reserves una cita
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.booking_confirmations}
                    onCheckedChange={(value) => updateSetting('booking_confirmations', value)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                {/* Promotional Messages */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">
                        Mensajes Promocionales
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Ofertas especiales y descuentos de tus salones favoritos
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.promotional_messages}
                    onCheckedChange={(value) => updateSetting('promotional_messages', value)}
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-8 flex justify-center">
                <Button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 px-8 py-3 text-base font-medium"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Guardar Configuración
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Management */}
          <Card className="border-red-200">
            <CardHeader className="bg-red-50 border-b border-red-100">
              <CardTitle className="flex items-center text-xl text-red-700">
                <Shield className="w-6 h-6 mr-3" />
                Gestión de Cuenta
                <span className="ml-3 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  Zona Peligrosa
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      Eliminar Cuenta Permanentemente
                    </h3>
                    <p className="text-red-700 mb-4">
                      Esta acción no se puede deshacer. Se eliminarán todos tus datos,
                      historial de citas y configuraciones de forma permanente.
                    </p>
                    <div className="flex items-center space-x-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-800 font-medium">
                        Asegúrate de no tener citas pendientes antes de continuar
                      </span>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                          disabled={deleting}
                        >
                          {deleting ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar Mi Cuenta
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertTriangle className="w-5 h-5 mr-2" />
                            ¿Estás absolutamente seguro?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-base">
                            Esta acción <strong>no se puede deshacer</strong>. Esto eliminará permanentemente tu cuenta
                            y removerá todos tus datos de nuestros servidores, incluyendo:
                            <ul className="list-disc list-inside mt-3 space-y-1">
                              <li>Tu perfil y información personal</li>
                              <li>Historial completo de citas</li>
                              <li>Configuraciones y preferencias</li>
                              <li>Cualquier dato asociado a tu cuenta</li>
                            </ul>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Sí, eliminar mi cuenta
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}