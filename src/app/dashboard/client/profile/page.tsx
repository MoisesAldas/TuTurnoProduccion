'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft, Edit, Save, X, Camera, User, Mail, Phone,
  MapPin, Calendar, Shield, Loader2, CheckCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
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

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  })

  const { authState } = useAuth()
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

      // Get user profile from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authState.user.id)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', userError)
        return
      }

      // If no user record exists in users table, create one with auth data
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
          // Use auth data as fallback
          setProfile({
            ...newUser,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        } else {
          setProfile(insertedUser)
        }
      } else {
        setProfile(userData)
      }

      // Set form data
      const currentUser = userData || {
        first_name: authState.user?.first_name || '',
        last_name: authState.user?.last_name || '',
        phone: authState.user?.phone || ''
      }

      setFormData({
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        phone: currentUser.phone || ''
      })

    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!authState.user || !profile) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone
        })
        .eq('id', authState.user.id)

      if (error) {
        console.error('Error updating profile:', error)
        alert('Error al actualizar el perfil')
        return
      }

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        updated_at: new Date().toISOString()
      } : null)

      setIsEditing(false)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)

    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error al actualizar el perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (!profile) return

    setFormData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || ''
    })
    setIsEditing(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error al cargar el perfil</h1>
          <p className="text-gray-600 mb-4">No se pudo cargar la información del perfil.</p>
          <Link href="/dashboard/client">
            <Button>Volver al Dashboard</Button>
          </Link>
        </div>
      </div>
    )
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
                <h1 className="text-lg font-semibold text-gray-900">
                  Mi Perfil
                </h1>
              </div>
            </div>

            {showSuccess && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm font-medium">¡Perfil actualizado!</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="relative mb-6">
                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.first_name || profile.email}
                  />
                  <AvatarFallback className="bg-green-100 text-green-600 text-3xl font-medium">
                    {(profile.first_name || profile.email)?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full h-10 w-10 bg-green-600 hover:bg-green-700 shadow-lg"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.first_name
                  ? profile.first_name
                  : 'Mi Perfil'
                }
              </h2>

              <p className="text-gray-500 mb-4">{profile.email}</p>

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Miembro desde {formatDate(profile.created_at)}
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 mr-1" />
                  Cuenta verificada
                </div>
              </div>
            </div>

            {!isEditing && (
              <div className="text-center">
                <Button
                  onClick={() => setIsEditing(true)}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Información Personal</CardTitle>
              {isEditing && (
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {saving ? (
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
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="space-y-2">
                <Label className="flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2" />
                  Nombre
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Tu nombre"
                    className="transition-all focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-900">
                      {profile.first_name || 'No especificado'}
                    </p>
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <Label className="flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2" />
                  Apellido
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Tu apellido"
                    className="transition-all focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-900">
                      {profile.last_name || 'No especificado'}
                    </p>
                  </div>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center text-gray-700">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-gray-900">{profile.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    El email no puede ser modificado
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label className="flex items-center text-gray-700">
                  <Phone className="w-4 h-4 mr-2" />
                  Teléfono
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+593 99 999 9999"
                    className="transition-all focus:ring-2 focus:ring-green-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <p className="text-gray-900">
                      {profile.phone || 'No especificado'}
                    </p>
                  </div>
                )}
              </div>

              {/* Account Type */}
              <div className="space-y-2">
                <Label className="flex items-center text-gray-700">
                  <User className="w-4 h-4 mr-2" />
                  Tipo de Cuenta
                </Label>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    {profile.is_client && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                        Cliente
                      </Badge>
                    )}
                    {profile.is_business_owner && (
                      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
                        Dueño de Negocio
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Información de la Cuenta</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <strong>Creado:</strong> {formatDate(profile.created_at)}
                </div>
                <div>
                  <strong>Última actualización:</strong> {formatDate(profile.updated_at)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}