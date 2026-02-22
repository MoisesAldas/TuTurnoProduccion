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
    <div className="min-h-screen bg-slate-50/50">
      {/* Premium Integrated Header (Consistent with appointments) */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="w-full px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-black text-slate-400 border-slate-200 px-2 py-0">
                    Panel Cliente
                  </Badge>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Ajustes de Cuenta</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-gray-50 flex items-center gap-3">
                  Mi Perfil
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-100 dark:bg-slate-800">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-900 dark:text-slate-100" />
                  </div>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isEditing ? (
                <Button 
                  onClick={() => setIsEditing(true)} 
                  className="bg-slate-900 hover:bg-slate-800 shadow-xl hover:shadow-slate-900/20 transition-all duration-300 text-white font-black h-12 px-8 rounded-2xl"
                >
                  <Edit className="w-5 h-5 mr-3" />
                  EDITAR PERFIL
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel} 
                    disabled={saving}
                    className="h-12 border-slate-200 text-slate-600 font-black px-6 rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    CANCELAR
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-slate-900 hover:bg-slate-800 shadow-xl hover:shadow-slate-900/20 text-white font-black h-12 px-8 rounded-2xl transition-all"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 mr-3" />GUARDAR CAMBIOS</>}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {showSuccess && (
          <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-tight">¡Perfil actualizado con éxito!</span>
          </div>
        )}

        {/* Hero Section */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 rounded-[2.5rem] opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40 rounded-[2.5rem]" />
          
          <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-tr from-slate-500/20 to-white/20 rounded-full blur-sm group-hover:blur-md transition-all duration-500" />
              <Avatar className="h-28 w-28 sm:h-36 sm:w-36 border-4 border-white/10 shadow-2xl relative">
                <AvatarImage src={profile.avatar_url} alt={profile.first_name || profile.email} className="object-cover" />
                <AvatarFallback className="bg-slate-800 text-white text-4xl font-black">
                  {(profile.first_name || profile.email)?.charAt(0)?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                onClick={handleAvatarClick}
                className="absolute -bottom-1 -right-1 rounded-2xl h-10 w-10 p-0 bg-white hover:bg-slate-50 text-slate-950 shadow-xl transition-all active:scale-90"
              >
                <Camera className="h-4.5 w-4.5" />
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-80">Cuenta Verificada</p>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-none">
                  {profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.first_name ? profile.first_name : 'Mi Perfil'}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
                  <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-bold text-[9px] px-2.5 py-0.5 tracking-wider uppercase">
                    <div className="w-1 h-1 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
                    Estado Activo
                  </Badge>
                  {profile.is_business_owner && (
                    <Badge variant="outline" className="bg-slate-500/10 border-slate-500/20 text-slate-600 font-bold text-[9px] px-2.5 py-0.5 tracking-wider uppercase">
                      Business Owner
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 pt-2">
                <div className="flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm group/metric">
                  <Mail className="w-3.5 h-3.5 text-slate-400 mr-2 group-hover/metric:text-white transition-colors" />
                  <span className="text-[10px] font-bold text-white tracking-tight">{profile.email}</span>
                </div>
                <div className="flex items-center px-4 py-2 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm group/metric">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2 group-hover/metric:text-white transition-colors" />
                  <span className="text-[10px] font-bold text-white tracking-tight">MIEMBRO DESDE {formatDate(profile.created_at).toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block shrink-0">
              <div className="text-right space-y-1 bg-white/5 p-5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Última Actividad</p>
                <div className="text-xl font-black text-white tracking-tighter leading-none">{formatDate(profile.updated_at).toUpperCase()}</div>
                <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold text-slate-400 uppercase pt-1">
                  Sincronizado
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Tabs Navigation */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl w-fit mb-6 border border-slate-200/60">
            <TabsTrigger 
              value="profile" 
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm text-slate-400"
            >
              <User className="w-3.5 h-3.5 mr-2" />
              Perfil
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all data-[state=active]:bg-white data-[state=active]:text-slate-950 data-[state=active]:shadow-sm text-slate-400"
            >
              <Settings className="w-3.5 h-3.5 mr-2" />
              Ajustes
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="animate-in fade-in-50 duration-300 outline-none">
            <Card className="border-0 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden bg-white">
              <CardHeader className="p-5 border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 tracking-tight">Información Personal</CardTitle>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">DATOS DE CONTACTO Y PERFIL</p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</Label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input
                          className={`h-11 rounded-xl border-slate-200 focus:ring-slate-950 transition-all ${errors.first_name ? 'border-rose-500 bg-rose-50/30' : 'bg-slate-50/50'}`}
                          value={formData.first_name}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, first_name: e.target.value }))
                            if (errors.first_name) setErrors(prev => ({ ...prev, first_name: '' }))
                          }}
                          placeholder="Tu nombre"
                        />
                        {errors.first_name && (
                          <p className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1 ml-1 animate-in slide-in-from-left-1">
                            <XCircle className="w-3 h-3" /> {errors.first_name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-11 flex items-center px-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm font-bold text-slate-700">
                        {profile.first_name || 'No especificado'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Apellido</Label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input
                          className={`h-11 rounded-xl border-slate-200 focus:ring-slate-950 transition-all ${errors.last_name ? 'border-rose-500 bg-rose-50/30' : 'bg-slate-50/50'}`}
                          value={formData.last_name}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, last_name: e.target.value }))
                            if (errors.last_name) setErrors(prev => ({ ...prev, last_name: '' }))
                          }}
                          placeholder="Tu apellido"
                        />
                        {errors.last_name && (
                          <p className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1 ml-1 animate-in slide-in-from-left-1">
                            <XCircle className="w-3 h-3" /> {errors.last_name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-11 flex items-center px-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm font-bold text-slate-700">
                        {profile.last_name || 'No especificado'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</Label>
                    <div className="h-11 flex items-center px-4 bg-slate-100/50 rounded-xl border border-dashed border-slate-200 text-sm font-bold text-slate-400 cursor-not-allowed">
                      <Mail className="w-3.5 h-3.5 mr-2 opacity-50" />
                      {profile.email}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Móvil</Label>
                    {isEditing ? (
                      <div className="space-y-1">
                        <Input
                          className={`h-11 rounded-xl border-slate-200 focus:ring-slate-950 transition-all ${errors.phone ? 'border-rose-500 bg-rose-50/30' : 'bg-slate-50/50'}`}
                          value={formData.phone}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, phone: e.target.value }))
                            if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }))
                          }}
                          placeholder="+593 99 999 9999"
                        />
                        {errors.phone && (
                          <p className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1 ml-1 animate-in slide-in-from-left-1">
                            <XCircle className="w-3 h-3" /> {errors.phone}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="h-11 flex items-center px-4 bg-slate-50/80 rounded-xl border border-slate-100 text-sm font-bold text-slate-700">
                        <Phone className="w-3.5 h-3.5 mr-2 opacity-50" />
                        {profile.phone || 'No especificado'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel de Acceso</Label>
                    <div className="h-14 flex items-center justify-between px-5 bg-slate-950 rounded-2xl border border-slate-800 shadow-lg shadow-slate-900/20">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center">
                          <Shield className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white uppercase tracking-wider leading-none">Tipo de Cuenta</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">SISTEMA TU TURNO CLOUD</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {profile.is_client && (
                          <Badge className="bg-emerald-500/20 border-emerald-500/30 text-emerald-400 font-bold text-[9px] px-2.5 py-0.5 tracking-wider uppercase">
                            CLIENTE
                          </Badge>
                        )}
                        {profile.is_business_owner && (
                          <Badge className="bg-white/10 border-white/20 text-white font-bold text-[9px] px-2.5 py-0.5 tracking-wider uppercase">
                            OWNER
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group/info">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Fecha de Registro</p>
                    <p className="text-xs font-bold text-slate-700 group-hover/info:text-slate-950 transition-colors">{formatDate(profile.created_at)}</p>
                  </div>
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group/info">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Último Login</p>
                    <p className="text-xs font-bold text-slate-700 group-hover/info:text-slate-950 transition-colors">{formatDate(profile.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 animate-in fade-in-50 duration-300 outline-none pb-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8 space-y-4">
                {/* Notifications Card */}
                <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-950 rounded-xl shadow-lg shadow-slate-900/10">
                        <Bell className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-black text-slate-900 tracking-tight">Notificaciones</CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PREFERENCIAS DE COMUNICACIÓN</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-50">
                      <div className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group/row">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/row:text-slate-900 transition-colors" />
                            <Label className="text-sm font-black text-slate-700">Email Notifications</Label>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-5.5">Alertas de citas y recordatorios</p>
                        </div>
                        <Switch 
                          checked={settings.email_notifications} 
                          onCheckedChange={(v) => updateSetting('email_notifications', v)}
                          className="data-[state=checked]:bg-slate-950"
                        />
                      </div>

                      <div className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group/row">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-slate-400 group-hover/row:text-slate-900 transition-colors" />
                            <Label className="text-sm font-black text-slate-700">Promociones</Label>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-5.5">Ofertas y beneficios exclusivos</p>
                        </div>
                        <Switch 
                          checked={settings.promotional_messages} 
                          onCheckedChange={(v) => updateSetting('promotional_messages', v)}
                          className="data-[state=checked]:bg-slate-950"
                        />
                      </div>
                    </div>
                    
                    <div className="p-5 bg-slate-50/80 border-t border-slate-100">
                      <Button 
                        onClick={handleSaveSettings} 
                        disabled={settingsLoading} 
                        className="h-10 px-6 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-black text-[10px] shadow-lg shadow-slate-950/20 active:scale-95 transition-all w-full sm:w-fit"
                      >
                        {settingsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Save className="w-3.5 h-3.5 mr-2" />}
                        GUARDAR PREFERENCIAS
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Security Card */}
                <Card className="border-0 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-950 rounded-xl shadow-lg shadow-slate-900/10">
                        <Shield className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-black text-slate-900 tracking-tight">Seguridad</CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">PROTECCIÓN DE CUENTA</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
                        <Lock className="w-5 h-5 text-slate-900" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase">Credenciales</h3>
                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                          La actualización periódica de tu contraseña garantiza la integridad de tu información y previene accesos no autorizados.
                        </p>
                        <div className="pt-3">
                          <ChangePasswordCard
                            userEmail={authState.user?.email || ''}
                            userProvider={(authState.user as any)?.app_metadata?.provider || 'email'}
                            inline={false}
                            asButton={true}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Settings */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="border-rose-500/20 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="p-5 bg-rose-50/50 border-b border-rose-100">
                    <div className="flex items-center gap-3 text-rose-600">
                      <div className="p-2 bg-rose-600 rounded-xl">
                        <AlertTriangle className="w-3.5 h-3.5 text-white" />
                      </div>
                      <CardTitle className="text-base font-black uppercase tracking-tight">Zona de Riesgo</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-tighter">
                      LA ELIMINACIÓN DE LA CUENTA ES PERMANENTE Y BORRARÁ TODO TU HISTORIAL Y DATOS.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          disabled={deleting}
                          className="h-11 w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                        >
                          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3.5 h-3.5 mr-2" /> ELIMINAR CUENTA</>}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-[2.5rem] border-0 p-8">
                        <AlertDialogHeader>
                          <div className="w-16 h-16 rounded-[2rem] bg-rose-50 flex items-center justify-center mb-4 mx-auto">
                            <AlertTriangle className="w-8 h-8 text-rose-600" />
                          </div>
                          <AlertDialogTitle className="text-2xl font-black text-slate-900 text-center tracking-tighter">
                            ¿CONFIRMAS LA ELIMINACIÓN?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-center text-slate-500 font-medium">
                            Esta acción es <span className="text-rose-600 font-black uppercase tracking-widest">irreversible</span>. Perderás el acceso a todas tus citas y configuración.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-4">
                          <AlertDialogCancel className="h-11 rounded-2xl border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest flex-1">
                            DETENER ACCIÓN
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleDeleteAccount} 
                            className="h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest flex-1 shadow-lg shadow-rose-600/20"
                          >
                            CONFIRMAR BORRADO
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Avatar Upload Dialog */}
        <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none">
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
              <div className="flex items-center justify-center py-20 bg-white/10 backdrop-blur-md rounded-[2.5rem]">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-4" />
                  <p className="text-lg font-black text-white mb-1 uppercase tracking-tighter">Subiendo foto...</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PROCESANDO TU IMAGEN</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}