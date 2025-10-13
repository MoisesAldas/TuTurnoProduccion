'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Save, User, Mail, Phone, Briefcase, Camera, Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'
import ImageCropper from '@/components/ImageCropper'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'
import { useToast } from '@/hooks/use-toast'

// Schema de validación del formulario
const employeeFormSchema = z.object({
  first_name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  last_name: z.string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(50, 'El apellido no puede exceder 50 caracteres'),
  email: z.string()
    .email('Formato de email inválido')
    .optional()
    .or(z.literal('')),
  phone: z.string()
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .optional()
    .or(z.literal('')),
  position: z.string()
    .max(100, 'La posición no puede exceder 100 caracteres')
    .optional(),
  bio: z.string()
    .max(500, 'La biografía no puede exceder 500 caracteres')
    .optional(),
  is_active: z.boolean()
})

type EmployeeFormData = z.infer<typeof employeeFormSchema>

export default function NewEmployeePage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      position: '',
      bio: '',
      is_active: true
    },
    mode: 'onSubmit'
  })

  const isActive = watch('is_active')

  useEffect(() => {
    if (authState.user) {
      fetchBusiness()
    }
  }, [authState.user])

  // Verificar que existe el bucket de avatars en Supabase
  useEffect(() => {
    const checkBucket = async () => {
      try {
        const { data, error } = await supabase.storage.getBucket('avatars')
        if (error && error.message.includes('not found')) {
          console.info('Bucket avatars no existe. Asegúrate de crearlo en Supabase Storage.')
        }
      } catch (error) {
        console.info('Storage check:', error)
      }
    }
    checkBucket()
  }, [])

  const fetchBusiness = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)
    } catch (error) {
      console.error('Error fetching business:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar archivo usando utilidad
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: validation.error
      })
      return
    }

    // Guardar archivo original y abrir cropper
    setOriginalFile(file)
    setShowCropper(true)
  }

  const handleCropSave = async (croppedFile: File) => {
    try {
      setUploadingAvatar(true)
      setShowCropper(false)

      console.log(`📁 Archivo original: ${originalFile?.name} (${formatFileSize(originalFile?.size || 0)})`)
      console.log(`✂️ Archivo recortado: ${croppedFile.name} (${formatFileSize(croppedFile.size)})`)

      // Comprimir imagen después del crop (ULTRA calidad para tesis)
      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.98,
        maxSizeKB: 300
      })

      console.log(`🗜️ Archivo final: ${compressedFile.name} (${formatFileSize(compressedFile.size)})`)
      if (originalFile) {
        console.log(`📊 Reducción total: ${Math.round((1 - compressedFile.size / originalFile.size) * 100)}%`)
      }

      setAvatarFile(compressedFile)

      // Crear preview del archivo final
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)

    } catch (error) {
      console.error('Error al procesar imagen:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al procesar la imagen. Intenta con otro archivo.'
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropper(false)
    setOriginalFile(null)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !business) return null

    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${business.id}/employees/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al subir la imagen'
        })
        return null
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al subir la imagen'
      })
      return null
    } finally {
      setUploadingAvatar(false)
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (formData: EmployeeFormData) => {
    if (!business) return

    try {
      setSubmitting(true)

      // Subir avatar si existe
      let avatarUrl: string | null = null
      if (avatarFile) {
        avatarUrl = await uploadAvatar()
      }

      const { error } = await supabase
        .from('employees')
        .insert([
          {
            business_id: business.id,
            first_name: formData.first_name,
            last_name: formData.last_name,
            email: formData.email || null,
            phone: formData.phone || null,
            position: formData.position || null,
            bio: formData.bio || null,
            avatar_url: avatarUrl,
            is_active: formData.is_active
          }
        ])

      if (error) {
        console.error('Error creating employee:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al crear el empleado'
        })
      } else {
        toast({
          title: 'Éxito',
          description: 'Empleado creado correctamente'
        })
        router.push('/dashboard/business/employees')
      }
    } catch (error) {
      console.error('Error creating employee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al crear el empleado'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header centrado */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/dashboard/business/employees">
            <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-700 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Nuevo Empleado</h1>
        <p className="text-lg text-gray-600">Agrega un nuevo empleado a tu equipo</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="border-b bg-white">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Save className="w-5 h-5 text-orange-600" />
              </div>
              <span>Información del Empleado</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center space-y-4 sm:space-y-6 p-6 sm:p-8 border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50/50 to-amber-50/50 rounded-xl hover:border-orange-300 transition-all duration-300">
                <div className="relative">
                  {avatarPreview ? (
                    <div className="relative group">
                      <img
                        src={avatarPreview}
                        alt="Preview"
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-orange-200 group-hover:ring-orange-300 transition-all"
                      />
                      <button
                        type="button"
                        onClick={removeAvatar}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center ring-2 ring-orange-200 transition-all hover:ring-orange-300">
                      <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500" />
                    </div>
                  )}
                </div>

                <div className="text-center space-y-2">
                  <Label className="text-base sm:text-lg font-semibold text-gray-800 block">
                    Foto de Perfil
                  </Label>
                  <p className="text-xs sm:text-sm text-gray-600">
                    JPG, PNG o GIF (máximo 5MB)
                  </p>
                  <p className="text-xs text-orange-600 font-medium">
                    Resolución óptima: 500x500px
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-all w-full sm:w-auto"
                  >
                    {uploadingAvatar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                        <span className="hidden sm:inline">Comprimiendo...</span>
                        <span className="sm:hidden">Procesando...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">{avatarPreview ? 'Cambiar Foto' : 'Subir Foto'}</span>
                        <span className="sm:hidden">{avatarPreview ? 'Cambiar' : 'Subir'}</span>
                      </>
                    )}
                  </Button>

                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={removeAvatar}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all w-full sm:w-auto"
                    >
                      <X className="w-4 h-4 mr-1 sm:mr-2" />
                      Quitar
                    </Button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Nombre y Apellido */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="first_name"
                      {...register('first_name')}
                      className="pl-10"
                      placeholder="Ej: Juan"
                    />
                  </div>
                  {errors.first_name && (
                    <p className="text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido *</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    placeholder="Ej: Pérez"
                  />
                  {errors.last_name && (
                    <p className="text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              {/* Email y Teléfono */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="pl-10"
                      placeholder="juan@ejemplo.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      type="tel"
                      {...register('phone')}
                      className="pl-10"
                      placeholder="+34 600 123 456"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Posición */}
              <div className="space-y-2">
                <Label htmlFor="position">Posición / Cargo</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="position"
                    {...register('position')}
                    className="pl-10"
                    placeholder="Ej: Estilista, Barbero, Masajista..."
                  />
                </div>
                {errors.position && (
                  <p className="text-sm text-red-600">{errors.position.message}</p>
                )}
              </div>

              {/* Biografía */}
              <div className="space-y-2">
                <Label htmlFor="bio">Biografía / Descripción</Label>
                <Textarea
                  id="bio"
                  {...register('bio')}
                  placeholder="Descripción breve del empleado, experiencia, especialidades..."
                  rows={3}
                />
                {errors.bio && (
                  <p className="text-sm text-red-600">{errors.bio.message}</p>
                )}
              </div>

              {/* Estado del empleado */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="is_active" className="text-base font-medium">
                    Estado del Empleado
                  </Label>
                  <p className="text-sm text-gray-600">
                    {isActive
                      ? 'El empleado estará activo y podrá ser asignado a citas'
                      : 'El empleado estará inactivo y no aparecerá en las opciones de reserva'
                    }
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Link href="/dashboard/business/employees" className="w-full sm:flex-1">
                  <Button variant="outline" type="button" className="w-full hover:bg-gray-100 transition-colors">
                    Cancelar
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  disabled={submitting || uploadingAvatar}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      {uploadingAvatar ? 'Subiendo imagen...' : 'Creando empleado...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Crear Empleado
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-blue-500">
          <CardHeader className="border-b bg-white">
            <CardTitle className="text-base flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-lg">
                💡
              </div>
              <span>Consejos para agregar empleados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2 pt-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Una foto de perfil profesional genera más confianza en los clientes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Proporciona información completa para mejorar la experiencia del cliente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>La posición ayuda a los clientes a entender las especialidades</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Una buena biografía genera confianza y profesionalismo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Los empleados inactivos no aparecerán en el sistema de reservas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-600 font-bold">•</span>
                <span>Podrás asignar servicios específicos a cada empleado después</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && originalFile && (
        <ImageCropper
          imageFile={originalFile}
          onSave={handleCropSave}
          onCancel={handleCropCancel}
          aspectRatio={1} // Cuadrado para avatars (ULTRA)
          maxWidth={500}
          maxHeight={500}
        />
      )}
    </div>
  )
}