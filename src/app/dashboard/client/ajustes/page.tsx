'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  Bell, Mail, Trash2,
  Shield, Save, Globe,
  AlertTriangle, UserX, Loader2, Lock
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabaseClient'
import ChangePasswordCard from '@/components/ChangePasswordCard'

interface NotificationSettings {
  email_notifications: boolean
  promotional_messages: boolean
}

export default function AjustesPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    promotional_messages: false
  })

  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { authState, signOut } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      loadSettings()
    }
  }, [authState.user])

  const loadSettings = async () => {
    if (!authState.user?.id) return

    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', authState.user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_notification_preferences')
            .insert({
              user_id: authState.user.id,
              email_notifications: true,
              promotional_messages: false
            })

          if (insertError) {
            console.error('Error creating default preferences:', insertError)
          }
        } else {
          console.error('Error loading settings:', error)
        }
      } else if (data) {
        setSettings({
          email_notifications: data.email_notifications,
          promotional_messages: data.promotional_messages
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setInitialLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!authState.user?.id) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: authState.user.id,
          email_notifications: settings.email_notifications,
          promotional_messages: settings.promotional_messages,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast({
        title: 'Configuración guardada',
        description: 'Tus preferencias han sido actualizadas exitosamente.',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No pudimos guardar tu configuración. Por favor intenta nuevamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!authState.user?.id) return

    setDeleting(true)
    try {
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar la cuenta')
      }

      toast({
        title: 'Cuenta eliminada',
        description: 'Tu cuenta ha sido eliminada exitosamente.',
      })

      await new Promise(resolve => setTimeout(resolve, 1500))
      await signOut()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error instanceof Error ? error.message : 'No pudimos eliminar tu cuenta. Por favor intenta nuevamente.',
      })
    } finally {
      setDeleting(false)
    }
  }

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando ajustes</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preparando tus preferencias...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 mb-2">
            Configuración
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Administra tus preferencias y configuración de cuenta
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          
          {/* Notifications Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Notificaciones</CardTitle>
                  <CardDescription>Gestiona tus preferencias de notificaciones</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <Label htmlFor="email-notifications" className="text-base font-medium">
                      Notificaciones por Email
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                    Recibe confirmaciones y recordatorios de tus citas
                  </p>
                </div>
                <Switch 
                  id="email-notifications"
                  checked={settings.email_notifications} 
                  onCheckedChange={(value) => updateSetting('email_notifications', value)} 
                />
              </div>

              <Separator />

              {/* Promotional Messages */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <Label htmlFor="promotional-messages" className="text-base font-medium">
                      Mensajes Promocionales
                    </Label>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                    Ofertas exclusivas y descuentos especiales
                  </p>
                </div>
                <Switch 
                  id="promotional-messages"
                  checked={settings.promotional_messages} 
                  onCheckedChange={(value) => updateSetting('promotional_messages', value)} 
                />
              </div>

              <Separator />

              <Button 
                onClick={handleSaveSettings} 
                disabled={loading} 
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>Seguridad</CardTitle>
                  <CardDescription>Mantén tu cuenta segura</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium">Contraseña</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Actualiza tu contraseña regularmente para mantener tu cuenta segura
                  </p>
                </div>
              </div>

              <Separator />

              <ChangePasswordCard
                userEmail={authState.user?.email || ''}
                userProvider={(authState.user as any)?.app_metadata?.provider || 'email'}
                inline={false}
                asButton={true}
              />
            </CardContent>
          </Card>

          {/* Danger Zone Card */}
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-red-600 dark:text-red-400">Zona Peligrosa</CardTitle>
                  <CardDescription>Acciones irreversibles</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <UserX className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <h3 className="font-medium">Eliminar Cuenta</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Una vez eliminada tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar completamente seguro.
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                      Esta acción eliminará permanentemente:
                    </p>
                    <ul className="text-sm text-red-800 dark:text-red-300 space-y-1 list-disc list-inside">
                      <li>Todos tus datos personales</li>
                      <li>Tu historial completo de citas</li>
                      <li>Todas tus preferencias y configuraciones</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Separator />

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    disabled={deleting}
                    className="w-full sm:w-auto"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                    <AlertDialogTitle className="flex items-center text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      ¿Estás absolutamente seguro?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base py-4">
                      Esta acción <strong>no se puede deshacer</strong>. Esto eliminará permanentemente tu cuenta y removerá todos tus datos de nuestros servidores.
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
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}