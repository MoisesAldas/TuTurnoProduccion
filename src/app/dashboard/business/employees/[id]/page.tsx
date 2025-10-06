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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, User, Mail, Phone, Briefcase, Camera, Upload, X, FileText, Clock, CalendarDays, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'
import ImageCropper from '@/components/ImageCropper'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import type { Business } from '@/types/database'
import EmployeeSchedule from '@/components/EmployeeSchedule'
import EmployeeAbsences from '@/components/EmployeeAbsences'

// Tipo para empleados
interface Employee {
  id: string
  business_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  position?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

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

export default function EditEmployeePage() {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
  const [showCropper, setShowCropper] = useState(false)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { authState } = useAuth()
  const { toast } = useToast()
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const employeeId = params.id as string

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
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
    if (authState.user && employeeId) {
      fetchData()
    }
  }, [authState.user, employeeId])

  const fetchData = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      // Obtener información del negocio
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

      // Obtener información del empleado
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .eq('business_id', businessData.id)
        .single()

      if (employeeError) {
        console.error('Error fetching employee:', employeeError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cargar la información del empleado'
        })
        router.push('/dashboard/business/employees')
        return
      }

      setEmployee(employeeData)
      setCurrentAvatarUrl(employeeData.avatar_url || null)

      // Llenar el formulario con los datos del empleado
      reset({
        first_name: employeeData.first_name,
        last_name: employeeData.last_name,
        email: employeeData.email || '',
        phone: employeeData.phone || '',
        position: employeeData.position || '',
        bio: employeeData.bio || '',
        is_active: employeeData.is_active
      })

    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al cargar los datos'
      })
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

  const removeCurrentAvatar = () => {
    setCurrentAvatarUrl(null)
  }

  const onSubmit = async (formData: EmployeeFormData) => {
    if (!business || !employee) return

    try {
      setSubmitting(true)

      // Subir nueva imagen si existe
      let avatarUrl: string | null = currentAvatarUrl
      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar()
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl
        }
      }

      const { error } = await supabase
        .from('employees')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email || null,
          phone: formData.phone || null,
          position: formData.position || null,
          bio: formData.bio || null,
          avatar_url: avatarUrl,
          is_active: formData.is_active
        })
        .eq('id', employee.id)

      if (error) {
        console.error('Error updating employee:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo actualizar la información del empleado'
        })
      } else {
        toast({
          title: 'Éxito',
          description: 'Información del empleado actualizada correctamente'
        })
        // Actualizar el estado local
        setEmployee({ ...employee, ...formData, avatar_url: avatarUrl || employee.avatar_url })
        // Limpiar la preview
        setAvatarFile(null)
        setAvatarPreview(null)
        setCurrentAvatarUrl(avatarUrl)
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error inesperado'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando empleado...</p>
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Empleado no encontrado</p>
          <Link href="/dashboard/business/employees">
            <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white">
              Volver a Empleados
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header con Avatar y Nombre */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/dashboard/business/employees">
            <Button variant="ghost" size="sm" className="hover:bg-orange-50 hover:text-orange-700 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        {/* Employee Header Card */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 rounded-lg p-6 border border-orange-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            {/* Avatar */}
            <div className="relative">
              {currentAvatarUrl || avatarPreview ? (
                <img
                  src={avatarPreview || currentAvatarUrl || ''}
                  alt={`${employee.first_name} ${employee.last_name}`}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {employee.first_name[0]}{employee.last_name[0]}
                  </span>
                </div>
              )}
              {/* Status Badge */}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${employee.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {employee.first_name} {employee.last_name}
              </h1>
              {employee.position && (
                <p className="text-orange-600 font-medium mb-2">{employee.position}</p>
              )}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {employee.email && (
                  <span className="inline-flex items-center text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                    <Mail className="w-3 h-3 mr-1" />
                    {employee.email}
                  </span>
                )}
                {employee.phone && (
                  <span className="inline-flex items-center text-sm text-gray-600 bg-white px-3 py-1 rounded-full">
                    <Phone className="w-3 h-3 mr-1" />
                    {employee.phone}
                  </span>
                )}
                <span className={`inline-flex items-center text-sm font-medium px-3 py-1 rounded-full ${employee.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {employee.is_active ? '● Activo' : '● Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 bg-white border border-gray-200 p-1 rounded-lg">
            <TabsTrigger
              value="info"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Información</span>
              <span className="sm:hidden">Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="schedule"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Horarios</span>
              <span className="sm:hidden">Hora</span>
            </TabsTrigger>
            <TabsTrigger
              value="absences"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white"
            >
              <CalendarDays className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Ausencias</span>
              <span className="sm:hidden">Dias</span>
            </TabsTrigger>
            <TabsTrigger
              value="metrics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-amber-600 data-[state=active]:text-white"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Métricas</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Información */}
          <TabsContent value="info" className="space-y-6">
            <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-orange-600" />
                  </div>
                  <span>Datos Básicos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center space-y-4 p-6 border-2 border-dashed border-gray-200 rounded-lg">
                    <div className="relative">
                      {avatarPreview ? (
                        // Mostrar preview de nueva imagen
                        <div className="relative">
                          <img
                            src={avatarPreview}
                            alt="Preview"
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={removeAvatar}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : currentAvatarUrl ? (
                        // Mostrar imagen actual
                        <div className="relative">
                          <img
                            src={currentAvatarUrl}
                            alt={`${employee?.first_name} ${employee?.last_name}`}
                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                          <button
                            type="button"
                            onClick={removeCurrentAvatar}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        // Placeholder cuando no hay imagen
                        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                          <Camera className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <Label className="text-base font-medium text-gray-700">
                        Foto de Perfil
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        JPG, PNG o GIF (máximo 5MB)
                      </p>
                      {(currentAvatarUrl || avatarPreview) && (
                        <p className="text-xs text-blue-600 mt-1">
                          {avatarPreview ? 'Nueva imagen seleccionada' : 'Imagen actual'}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2"
                      >
                        {uploadingAvatar ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
                            Comprimiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            {(currentAvatarUrl || avatarPreview) ? 'Cambiar Foto' : 'Subir Foto'}
                          </>
                        )}
                      </Button>

                      {(avatarPreview || currentAvatarUrl) && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={avatarPreview ? removeAvatar : removeCurrentAvatar}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
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
                          placeholder="+593 99 123 4567"
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
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
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
                    <Button
                      type="submit"
                      className="w-full sm:flex-1 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      disabled={submitting || uploadingAvatar}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          {uploadingAvatar ? 'Subiendo imagen...' : 'Guardando cambios...'}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Guardar Cambios
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Horarios */}
          <TabsContent value="schedule">
            <EmployeeSchedule
              employeeId={employee.id}
              onSave={() => {
                toast({
                  title: 'Éxito',
                  description: 'Horarios guardados correctamente'
                })
              }}
            />
          </TabsContent>

          {/* TAB 3: Ausencias */}
          <TabsContent value="absences">
            <EmployeeAbsences
              employeeId={employee.id}
              employeeName={`${employee.first_name} ${employee.last_name}`}
            />
          </TabsContent>

          {/* TAB 4: Métricas */}
          <TabsContent value="metrics">
            <Card className="border-t-4 border-t-orange-500">
              <CardHeader className="border-b bg-white">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <span>Métricas de Rendimiento</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Próximamente
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Esta sección mostrará estadísticas detalladas del empleado: citas completadas,
                    ingresos generados, calificación promedio y más.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
