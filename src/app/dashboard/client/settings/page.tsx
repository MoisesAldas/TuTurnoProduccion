'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft, Settings, Bell, Shield, Globe, Moon,
  Mail, MessageSquare, Calendar, Smartphone
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface UserSettings {
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
    appointment_reminders: boolean
    marketing: boolean
  }
  privacy: {
    profile_visibility: 'public' | 'private'
    show_email: boolean
    show_phone: boolean
  }
  preferences: {
    language: string
    timezone: string
    theme: 'light' | 'dark' | 'system'
  }
}

export default function ClientSettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      sms: false,
      push: true,
      appointment_reminders: true,
      marketing: false
    },
    privacy: {
      profile_visibility: 'private',
      show_email: false,
      show_phone: false
    },
    preferences: {
      language: 'es',
      timezone: 'America/Guayaquil',
      theme: 'system'
    }
  })

  const [loading, setLoading] = useState(false)
  const { authState } = useAuth()

  const handleSaveSettings = async () => {
    setLoading(true)
    // Simular guardado
    setTimeout(() => {
      setLoading(false)
      alert('Configuración guardada correctamente')
    }, 1000)
  }

  const updateNotificationSettings = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }))
  }

  const updatePrivacySettings = (key: keyof UserSettings['privacy'], value: any) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }))
  }

  const updatePreferences = (key: keyof UserSettings['preferences'], value: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
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
                  <Settings className="w-5 h-5 mr-2" />
                  Configuración
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Message */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Hola, {authState.user?.first_name || 'Cliente'}! 👋
            </h2>
            <p className="text-gray-600">
              Personaliza tu experiencia en TuTurno ajustando estas configuraciones.
            </p>
          </div>

          {/* Notifications Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Notificaciones por Email
                  </Label>
                  <p className="text-sm text-gray-500">
                    Recibir confirmaciones y recordatorios por email
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.email}
                  onCheckedChange={(value) => updateNotificationSettings('email', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Notificaciones SMS
                  </Label>
                  <p className="text-sm text-gray-500">
                    Recibir mensajes de texto para citas importantes
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.sms}
                  onCheckedChange={(value) => updateNotificationSettings('sms', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Notificaciones Push
                  </Label>
                  <p className="text-sm text-gray-500">
                    Recibir notificaciones en tiempo real en tu dispositivo
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.push}
                  onCheckedChange={(value) => updateNotificationSettings('push', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Recordatorios de Citas
                  </Label>
                  <p className="text-sm text-gray-500">
                    Recordatorios 24 horas y 1 hora antes de tu cita
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.appointment_reminders}
                  onCheckedChange={(value) => updateNotificationSettings('appointment_reminders', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Promociones y Marketing</Label>
                  <p className="text-sm text-gray-500">
                    Recibir ofertas especiales y promociones de tus salones favoritos
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.marketing}
                  onCheckedChange={(value) => updateNotificationSettings('marketing', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Privacidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Visibilidad del Perfil</Label>
                <Select
                  value={settings.privacy.profile_visibility}
                  onValueChange={(value: 'public' | 'private') => updatePrivacySettings('profile_visibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Privado - Solo yo puedo ver mi información</SelectItem>
                    <SelectItem value="public">Público - Los negocios pueden ver mi perfil básico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Email a los Negocios</Label>
                  <p className="text-sm text-gray-500">
                    Permitir que los negocios vean tu dirección de email
                  </p>
                </div>
                <Switch
                  checked={settings.privacy.show_email}
                  onCheckedChange={(value) => updatePrivacySettings('show_email', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mostrar Teléfono a los Negocios</Label>
                  <p className="text-sm text-gray-500">
                    Permitir que los negocios vean tu número de teléfono
                  </p>
                </div>
                <Switch
                  checked={settings.privacy.show_phone}
                  onCheckedChange={(value) => updatePrivacySettings('show_phone', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Preferencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select
                    value={settings.preferences.language}
                    onValueChange={(value) => updatePreferences('language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Zona Horaria</Label>
                  <Select
                    value={settings.preferences.timezone}
                    onValueChange={(value) => updatePreferences('timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Guayaquil">Ecuador (GMT-5)</SelectItem>
                      <SelectItem value="America/Bogota">Colombia (GMT-5)</SelectItem>
                      <SelectItem value="America/Lima">Perú (GMT-5)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center">
                    <Moon className="w-4 h-4 mr-2" />
                    Tema
                  </Label>
                  <Select
                    value={settings.preferences.theme}
                    onValueChange={(value) => updatePreferences('theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="system">Automático</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Zona de Peligro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">Eliminar Cuenta</h4>
                  <p className="text-sm text-red-600">
                    Eliminar permanentemente tu cuenta y todos tus datos
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="text-center">
            <Button
              onClick={handleSaveSettings}
              disabled={loading}
              size="lg"
              className="bg-green-600 hover:bg-green-700 px-8"
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}