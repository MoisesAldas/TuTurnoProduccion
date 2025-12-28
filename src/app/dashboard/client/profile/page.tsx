'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Edit, Save, X, Camera, User, Mail, Phone,
  Calendar, Shield, Loader2, CheckCircle, XCircle,
  Bell, Globe, Lock, AlertTriangle, UserX, Trash2, Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { typography, patterns, colors } from '@/lib/design-tokens'
import ClientImageCropper from '@/components/ClientImageCropper'
import ChangePasswordCard from '@/components/ChangePasswordCard'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  is_business_owner: boolean
  is_client: boolean
  created_at: string
  updated_at: string
}

interface NotificationSettings {
  email_notifications: boolean
  promotional_messages: boolean
}

export default function ClientProfilePage() {
  // Profile states
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  // Avatar upload states
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  })

  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  })

  // Settings states
  const [settings, setSettings] = useState<NotificationSettings>({
    email_notifications: true,
    promotional_messages: false
  })
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { authState, signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      fetchProfile()
      loadSettings()
    }
  }, [authState.user])

  const fetchProfile = async () => {
    if (!authState.user) return
    try {
      setLoading(true)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authState.user.id)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', userError)
        return
      }

      if (!userData) {
        const newUser = {
          id: authState.user.id,
          email: authState.user.email || '',
          first_name: authState.user.first_name || '',
          last_name: authState.user.last_name || '',
          phone: authState.user.phone || '',
          avatar_url: authState.user.avatar_url || '',
          is_business_owner: false,
          is_client: true
        }
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([newUser])
          .select()
          .single()
        if (insertError) {
          console.error('Error creating user:', insertError)
          setProfile({ ...newUser, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        } else {
          setProfile(insertedUser)
        }
      } else {
        setProfile(userData)
      }

      const currentUser = userData || { first_name: authState.user?.first_name || '', last_name: authState.user?.last_name || '', phone: authState.user?.phone || '' }
      setFormData({ first_name: currentUser.first_name || '', last_name: currentUser.last_name || '', phone: currentUser.phone || '' })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

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
    }
  }

  const validateForm = () => {
    const newErrors = { first_name: '', last_name: '', phone: '' }
    let isValid = true

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido'
      isValid = false
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = 'El nombre debe tener al menos 2 caracteres'
      isValid = false
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido'
      isValid = false
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = 'El apellido debe tener al menos 2 caracteres'
      isValid = false
    }

    if (formData.phone.trim()) {
      const phoneRegex = /^(\+593|593|0)?[0-9]{9,10}$/
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'Ingresa un número de teléfono válido (ej: 0999999999)'
        isValid = false
      }
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSave = async () => {
    if (!authState.user || !profile) return

    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Errores en el formulario',
        description: 'Por favor corrige los errores antes de guardar.',
      })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('users')
        .update({ first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone })
        .eq('id', authState.user.id)
      if (error) {
        console.error('Error updating profile:', error)
        toast({
          variant: 'destructive',
          title: 'Error al actualizar',
          description: 'No pudimos guardar los cambios. Por favor intenta nuevamente.',
        })
        return
      }
      setProfile(prev => prev ? { ...prev, first_name: formData.first_name, last_name: formData.last_name, phone: formData.phone, updated_at: new Date().toISOString() } : null)
      setIsEditing(false)
      setErrors({ first_name: '', last_name: '', phone: '' })
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: 'Ocurrió un error al actualizar tu perfil. Por favor intenta nuevamente.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (!profile) return
    setFormData({ first_name: profile.first_name || '', last_name: profile.last_name || '', phone: profile.phone || '' })
    setErrors({ first_name: '', last_name: '', phone: '' })
    setIsEditing(false)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Archivo inválido',
        description: 'Por favor selecciona una imagen válida (JPG, PNG, etc.)',
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Archivo muy grande',
        description: 'La imagen no debe superar los 5MB',
      })
      return
    }

    setSelectedImageFile(file)
    setShowAvatarDialog(true)
  }

  const handleSaveAvatar = async (croppedFile: File) => {
    if (!authState.user || !profile) return

    try {
      setUploadingAvatar(true)

      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${authState.user.id}/${oldPath}`])
        }
      }

      const fileExt = croppedFile.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `${authState.user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        toast({
          variant: 'destructive',
          title: 'Error al subir imagen',
          description: 'No se pudo subir la imagen. Por favor intenta nuevamente.',
        })
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', authState.user.id)

      if (updateError) {
        console.error('Error updating avatar URL:', updateError)
        toast({
          variant: 'destructive',
          title: 'Error al actualizar perfil',
          description: 'No se pudo actualizar tu foto de perfil.',
        })
        return
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)

      toast({
        title: 'Foto actualizada',
        description: 'Tu foto de perfil se actualizó exitosamente.',
      })

      setShowAvatarDialog(false)
      setSelectedImageFile(null)
    } catch (error) {
      console.error('Error saving avatar:', error)
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: 'Ocurrió un error al actualizar tu foto.',
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCancelAvatar = () => {
    setShowAvatarDialog(false)
    setSelectedImageFile(null)
  }

  const handleSaveSettings = async () => {
    if (!authState.user?.id) return

    setSettingsLoading(true)
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
      setSettingsLoading(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando tu perfil</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Obteniendo tu información personal...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar el perfil</h1>
          <p className="text-gray-600 mb-4">No se pudo cargar la información del perfil.</p>
          <Link href="/dashboard/client"><Button>Volver al Dashboard</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-50">
            Mi Cuenta
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tu perfil y configuración
          </p>
        </div>

        {showSuccess && (
            <div className="mb-6 flex items-center space-x-2 text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-300">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">¡Perfil actualizado con éxito!</span>
            </div>
        )}

        {/* Avatar Card */}
        <Card className="mb-6">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
              <div className="relative mb-4 sm:mb-0 sm:mr-8">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url} alt={profile.first_name || profile.email} />
                  <AvatarFallback className="bg-slate-200 text-slate-700 text-3xl font-medium">{(profile.first_name || profile.email)?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 bg-slate-900 hover:bg-slate-800 shadow-lg"
                  aria-label="Cambiar foto de perfil"
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
              <div className="flex-grow">
                <h2 className={`${typography.h1} mb-2`}>
                  {profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name ? profile.first_name : 'Mi Perfil'}
                </h2>
                <p className={typography.bodySmall + ' mb-4'}>{profile.email}</p>
                <div className={`flex flex-wrap justify-center sm:justify-start items-center gap-x-4 gap-y-2 ${typography.bodySmall}`}>
                  <div className="flex items-center"><Calendar className="w-4 h-4 mr-1.5" />Miembro desde {formatDate(profile.created_at)}</div>
                  <div className="flex items-center"><Shield className="w-4 h-4 mr-1.5" />Cuenta verificada</div>
                </div>
              </div>
              {!isEditing && (
                <div className="mt-4 sm:mt-0 sm:ml-6 w-full sm:w-auto">
                  <Button onClick={() => setIsEditing(true)} size="lg" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800">
                    <Edit className="w-4 h-4 mr-2" />Editar Perfil
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Ajustes
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={typography.h3}>Información Personal</CardTitle>
                  {isEditing && (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}><X className="w-4 h-4 mr-2" />Cancelar</Button>
                      <Button size="sm" onClick={handleSave} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar</>}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={typography.label}>Nombre</Label>
                    {isEditing ? (
                      <>
                        <Input
                          className={errors.first_name ? patterns.input.error : patterns.input.DEFAULT}
                          value={formData.first_name}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, first_name: e.target.value }))
                            if (errors.first_name) setErrors(prev => ({ ...prev, first_name: '' }))
                          }}
                          placeholder="Tu nombre"
                        />
                        {errors.first_name && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            {errors.first_name}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-md border text-gray-800">{profile.first_name || 'No especificado'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className={typography.label}>Apellido</Label>
                    {isEditing ? (
                      <>
                        <Input
                          className={errors.last_name ? patterns.input.error : patterns.input.DEFAULT}
                          value={formData.last_name}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, last_name: e.target.value }))
                            if (errors.last_name) setErrors(prev => ({ ...prev, last_name: '' }))
                          }}
                          placeholder="Tu apellido"
                        />
                        {errors.last_name && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            {errors.last_name}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-md border text-gray-800">{profile.last_name || 'No especificado'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className={typography.label}>Email</Label>
                    <p className="p-3 bg-slate-100 rounded-md border text-gray-500 cursor-not-allowed">{profile.email}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className={typography.label}>Teléfono</Label>
                    {isEditing ? (
                      <>
                        <Input
                          className={errors.phone ? patterns.input.error : patterns.input.DEFAULT}
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, phone: e.target.value }))
                            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }))
                          }}
                          placeholder="+593 99 999 9999"
                        />
                        {errors.phone && (
                          <p className="text-sm text-red-600 flex items-center gap-1">
                            <XCircle className="w-4 h-4" />
                            {errors.phone}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-md border text-gray-800">{profile.phone || 'No especificado'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Tipo de Cuenta</Label>
                    <div className="p-3 bg-slate-50 rounded-md border">
                      <div className="flex items-center space-x-2">
                        {profile.is_client && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Cliente</Badge>}
                        {profile.is_business_owner && <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Dueño de Negocio</Badge>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pt-6 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-4">Información de la Cuenta</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                    <div><strong>Creado:</strong> {formatDate(profile.created_at)}</div>
                    <div><strong>Última actualización:</strong> {formatDate(profile.updated_at)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
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
                  disabled={settingsLoading} 
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800"
                >
                  {settingsLoading ? (
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
          </TabsContent>
        </Tabs>

        {/* Avatar Upload Dialog */}
        <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            {selectedImageFile && !uploadingAvatar && (
              <ClientImageCropper
                imageFile={selectedImageFile}
                onSave={handleSaveAvatar}
                onCancel={handleCancelAvatar}
                maxWidth={400}
                maxHeight={400}
              />
            )}
            {uploadingAvatar && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-slate-900 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Subiendo foto...</p>
                  <p className="text-sm text-gray-600">Por favor espera un momento</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}