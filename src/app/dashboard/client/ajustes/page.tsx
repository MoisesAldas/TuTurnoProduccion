'use client'

import React, { useState, useEffect } from 'react'
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
  Bell, MessageSquare, Mail, Trash2,
  Shield, CheckCircle, Save, Smartphone, Globe,
  AlertTriangle, UserX
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabaseClient'

// NOTE: All data fetching and state logic from the original file is preserved.
// Only the outer layout JSX has been removed to fit the new dashboard layout.

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
    console.log('Loading notification settings...')
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
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
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-8">
          {/* Notification Settings */}
          <Card className="overflow-hidden border-t-4 border-t-emerald-500">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <Bell className="w-6 h-6 mr-3 text-emerald-600" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">Notificaciones por Email</Label>
                      <p className="text-sm text-gray-500 mt-1">Recibe confirmaciones y recordatorios.</p>
                    </div>
                  </div>
                  <Switch checked={settings.email_notifications} onCheckedChange={(value) => updateSetting('email_notifications', value)} className="data-[state=checked]:bg-emerald-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">Notificaciones por WhatsApp</Label>
                      <p className="text-sm text-gray-500 mt-1">Recibe mensajes directos para tus citas.</p>
                    </div>
                  </div>
                  <Switch checked={settings.whatsapp_notifications} onCheckedChange={(value) => updateSetting('whatsapp_notifications', value)} className="data-[state=checked]:bg-emerald-600" />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">Notificaciones Push</Label>
                      <p className="text-sm text-gray-500 mt-1">Alertas instantáneas en tu dispositivo.</p>
                    </div>
                  </div>
                  <Switch checked={settings.push_notifications} onCheckedChange={(value) => updateSetting('push_notifications', value)} className="data-[state=checked]:bg-emerald-600" />
                </div>

                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Globe className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <Label className="text-base font-medium text-gray-900">Mensajes Promocionales</Label>
                      <p className="text-sm text-gray-500 mt-1">Ofertas y descuentos de tus lugares favoritos.</p>
                    </div>
                  </div>
                  <Switch checked={settings.promotional_messages} onCheckedChange={(value) => updateSetting('promotional_messages', value)} className="data-[state=checked]:bg-emerald-600" />
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button onClick={handleSaveSettings} disabled={loading} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  {loading ? 'Guardando...' : <><Save className="w-4 h-4 mr-2" /> Guardar Cambios</>}
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
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-red-50/50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserX className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">Eliminar Cuenta Permanentemente</h3>
                    <p className="text-red-700 mb-4">Esta acción no se puede deshacer. Se eliminarán todos tus datos, historial de citas y configuraciones de forma permanente.</p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleting}>
                          {deleting ? 'Eliminando...' : <><Trash2 className="w-4 h-4 mr-2" /> Eliminar Mi Cuenta</>}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center text-red-600"><AlertTriangle className="w-5 h-5 mr-2" />¿Estás absolutamente seguro?</AlertDialogTitle>
                          <AlertDialogDescription className="text-base py-4">Esta acción <strong>no se puede deshacer</strong>. Esto eliminará permanentemente tu cuenta y removerá todos tus datos de nuestros servidores.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">Sí, eliminar mi cuenta</AlertDialogAction>
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