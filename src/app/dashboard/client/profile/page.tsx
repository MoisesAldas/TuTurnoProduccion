'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Edit, Save, X, Camera, User, Mail, Phone,
  Calendar, Shield, Loader2, CheckCircle, XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { typography, patterns, colors } from '@/lib/design-tokens'
import ClientImageCropper from '@/components/ClientImageCropper'
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

export default function ClientProfilePage() {
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

  const { authState } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (authState.user) {
      fetchProfile()
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
        console.log('👤 Profile loaded:', {
          avatar_url: userData.avatar_url,
          first_name: userData.first_name,
          email: userData.email
        })
      }

      const currentUser = userData || { first_name: authState.user?.first_name || '', last_name: authState.user?.last_name || '', phone: authState.user?.phone || '' }
      setFormData({ first_name: currentUser.first_name || '', last_name: currentUser.last_name || '', phone: currentUser.phone || '' })
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = { first_name: '', last_name: '', phone: '' }
    let isValid = true

    // Validar nombre (requerido, mínimo 2 caracteres)
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'El nombre es requerido'
      isValid = false
    } else if (formData.first_name.trim().length < 2) {
      newErrors.first_name = 'El nombre debe tener al menos 2 caracteres'
      isValid = false
    }

    // Validar apellido (requerido, mínimo 2 caracteres)
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'El apellido es requerido'
      isValid = false
    } else if (formData.last_name.trim().length < 2) {
      newErrors.last_name = 'El apellido debe tener al menos 2 caracteres'
      isValid = false
    }

    // Validar teléfono (opcional, pero si tiene valor debe ser válido)
    if (formData.phone.trim()) {
      // Formato ecuatoriano: +593 o 09, seguido de 8-9 dígitos
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

    // Validar antes de guardar
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Archivo inválido',
        description: 'Por favor selecciona una imagen válida (JPG, PNG, etc.)',
      })
      return
    }

    // Validate file size (max 5MB)
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

      // Delete old avatar if exists
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop()
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${authState.user.id}/${oldPath}`])
        }
      }

      // Upload new avatar
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

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update user profile
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

      // Update local state
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Profile Header Skeleton */}
          <Card className="mb-8">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6">
                <Skeleton className="h-24 w-24 sm:h-32 sm:w-32 rounded-full" />
                <div className="flex-grow space-y-3">
                  <Skeleton className="h-8 w-64 mx-auto sm:mx-0" />
                  <Skeleton className="h-5 w-48 mx-auto sm:mx-0" />
                  <div className="flex gap-4 justify-center sm:justify-start">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-12 w-40" />
              </div>
            </CardContent>
          </Card>

          {/* Profile Info Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-48" />
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
        {showSuccess && (
            <div className="mb-6 flex items-center space-x-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">¡Perfil actualizado con éxito!</span>
            </div>
        )}

        <Card className="mb-8">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left">
              <div className="relative mb-4 sm:mb-0 sm:mr-8">
                <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-lg">
                  <AvatarImage src={profile.avatar_url} alt={profile.first_name || profile.email} />
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 text-3xl font-medium">{(profile.first_name || profile.email)?.charAt(0)?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 rounded-full h-10 w-10 p-0 bg-emerald-600 hover:bg-emerald-700 shadow-lg"
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
                  <Button onClick={() => setIsEditing(true)} size="lg" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                    <Edit className="w-4 h-4 mr-2" />Editar Perfil
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className={typography.h3}>Información Personal</CardTitle>
              {isEditing && (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={handleCancel} disabled={saving}><X className="w-4 h-4 mr-2" />Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar Cambios</>}
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
              {/* RESTORED INFO BLOCK */}
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
                  <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
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