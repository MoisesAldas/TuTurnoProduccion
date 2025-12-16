'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Save, User, Mail, Phone, Briefcase, Camera, Upload, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'
import BusinessImageCropper from '@/components/BusinessImageCropper'
import type { Business } from '@/types/database'
import { employeeFormSchema, type EmployeeFormData } from '@/lib/validation'

interface CreateEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: Business
  onSuccess: () => void
}

export default function CreateEmployeeModal({
  open,
  onOpenChange,
  business,
  onSuccess
}: CreateEmployeeModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [originalFile, setOriginalFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid, touchedFields }
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
    mode: 'onBlur', // ✅ Validación al salir del campo
    reValidateMode: 'onChange'
  })

  const isActive = watch('is_active')

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: validation.error
      })
      return
    }

    setOriginalFile(file)
    setShowCropper(true)
  }

  const handleCropSave = async (croppedFile: File) => {
    try {
      setUploadingAvatar(true)
      setShowCropper(false)

      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.98,
        maxSizeKB: 300
      })

      setAvatarFile(compressedFile)

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
    try {
      setSubmitting(true)

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
        reset()
        removeAvatar()
        onOpenChange(false)
        onSuccess()
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

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
        <div className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent hover:scrollbar-thumb-orange-300 px-4 sm:px-6 py-4 sm:py-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-50">Nuevo Empleado</DialogTitle>
            <DialogDescription className="text-sm">
              Agrega un nuevo empleado a tu equipo
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 mt-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3 p-4 sm:p-6 border-2 border-dashed border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-900/20 rounded-lg">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative group">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg ring-2 ring-orange-200 dark:ring-orange-800"
                  />
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-full flex items-center justify-center ring-2 ring-orange-200 dark:ring-orange-800">
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500 dark:text-orange-400" />
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <Label className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200 block">
                Foto de Perfil
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                JPG, PNG o GIF (máximo 5MB)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-400 transition-all w-full sm:w-auto dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/50 dark:hover:text-orange-300 dark:hover:border-orange-600"
              >
                {uploadingAvatar ? (
                  <>
                    <div className="relative w-3.5 h-3.5">
                      <div className="absolute inset-0 border-2 border-orange-300 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <span className="hidden sm:inline">Procesando...</span>
                    <span className="sm:hidden">Procesando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarPreview ? 'Cambiar Foto' : 'Subir Foto'}</span>
                  </>
                )}
              </Button>

              {avatarPreview && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={removeAvatar}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all w-full sm:w-auto dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/50"
                >
                  <X className="w-3.5 h-3.5 mr-1 sm:mr-2" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="first_name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Nombre <span className="text-orange-600">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="first_name"
                  {...register('first_name')}
                  className={`pl-10 h-10 focus:border-orange-500 focus:ring-orange-500 ${
                    touchedFields.first_name && !errors.first_name ? 'border-green-500' : ''
                  } ${
                    errors.first_name ? 'border-red-500' : ''
                  }`}
                  placeholder="Ej: Juan"
                />
                {touchedFields.first_name && !errors.first_name && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                )}
              </div>
              {errors.first_name && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{errors.first_name.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Apellido <span className="text-orange-600">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="last_name"
                  {...register('last_name')}
                  className={`h-10 focus:border-orange-500 focus:ring-orange-500 ${
                    touchedFields.last_name && !errors.last_name ? 'border-green-500' : ''
                  } ${
                    errors.last_name ? 'border-red-500' : ''
                  }`}
                  placeholder="Ej: Pérez"
                />
                {touchedFields.last_name && !errors.last_name && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                )}
              </div>
              {errors.last_name && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{errors.last_name.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Email <span className="text-orange-600">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={`pl-10 h-10 focus:border-orange-500 focus:ring-orange-500 ${
                    touchedFields.email && !errors.email ? 'border-green-500' : ''
                  } ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  placeholder="juan@ejemplo.com"
                />
                {touchedFields.email && !errors.email && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                )}
              </div>
              {errors.email && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{errors.email.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Teléfono <span className="text-orange-600">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  className={`pl-10 h-10 focus:border-orange-500 focus:ring-orange-500 ${
                    touchedFields.phone && !errors.phone ? 'border-green-500' : ''
                  } ${
                    errors.phone ? 'border-red-500' : ''
                  }`}
                  placeholder="0999123456"
                />
                {touchedFields.phone && !errors.phone && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                )}
              </div>
              {errors.phone && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-400">{errors.phone.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Posición */}
          <div className="space-y-1.5">
            <Label htmlFor="position" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Posición / Cargo <span className="text-orange-600">*</span>
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <Input
                id="position"
                {...register('position')}
                className={`pl-10 h-10 focus:border-orange-500 focus:ring-orange-500 ${
                  touchedFields.position && !errors.position ? 'border-green-500' : ''
                } ${
                  errors.position ? 'border-red-500' : ''
                }`}
                placeholder="Ej: Estilista, Barbero, Masajista..."
              />
              {touchedFields.position && !errors.position && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
              )}
            </div>
            {errors.position && (
              <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">{errors.position.message}</p>
              </div>
            )}
          </div>

          {/* Biografía */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Biografía / Descripción
            </Label>
            <Textarea
              id="bio"
              {...register('bio')}
              placeholder="Descripción breve del empleado, experiencia, especialidades..."
              rows={2}
              className="focus:border-orange-500 focus:ring-orange-500 text-sm"
            />
            {errors.bio && (
              <div className="flex items-start gap-1.5 p-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-400">{errors.bio.message}</p>
              </div>
            )}
          </div>

          {/* Estado del empleado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 bg-orange-50/50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div>
              <Label htmlFor="is_active" className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                Estado del Empleado
              </Label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {isActive ? 'Disponible para asignar citas' : 'No aparecerá en opciones de reserva'}
              </p>
            </div>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={(checked) => setValue('is_active', checked)}
              className="self-start sm:self-auto"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-9"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 h-9 bg-orange-600 hover:bg-orange-700 text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isValid || submitting || uploadingAvatar}
            >
              {submitting ? (
                <>
                  <div className="relative w-3.5 h-3.5 mr-2">
                    <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  Creando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Crear Empleado
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>

    {/* Image Cropper Dialog */}
    <Dialog open={showCropper} onOpenChange={setShowCropper}>
      <DialogContent className="max-w-5xl p-0 gap-0">
        <div className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent hover:scrollbar-thumb-orange-300 p-6">
        {originalFile && !uploadingAvatar && (
          <BusinessImageCropper
            imageFile={originalFile}
            onSave={handleCropSave}
            onCancel={handleCropCancel}
            maxWidth={500}
            maxHeight={500}
          />
        )}
        {uploadingAvatar && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Procesando imagen...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Por favor espera un momento</p>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
