'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Save, User, Mail, Phone, Briefcase, Camera, Upload, X, AlertCircle, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'
import BusinessImageCropper from '@/components/BusinessImageCropper'

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

interface EditEmployeeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee: Employee | null
  onSuccess: () => void
}

export default function EditEmployeeModal({
  open,
  onOpenChange,
  employee,
  onSuccess
}: EditEmployeeModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null)
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

  // Reset form when employee changes
  useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        bio: employee.bio || '',
        is_active: employee.is_active
      })
      setCurrentAvatarUrl(employee.avatar_url || null)
      setAvatarPreview(null)
      setAvatarFile(null)
    }
  }, [employee, reset])

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
    if (!avatarFile || !employee) return null

    setUploadingAvatar(true)
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${employee.business_id}/employees/${Date.now()}.${fileExt}`

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

  const removeCurrentAvatar = () => {
    setCurrentAvatarUrl(null)
  }

  const onSubmit = async (formData: EmployeeFormData) => {
    if (!employee) return

    try {
      setSubmitting(true)

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
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id)

      if (error) {
        console.error('Error updating employee:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al actualizar el empleado'
        })
      } else {
        toast({
          title: 'Éxito',
          description: 'Empleado actualizado correctamente'
        })
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('Error updating employee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al actualizar el empleado'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!employee) return

    try {
      setDeleting(true)

      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employee.id)

      if (error) {
        console.error('Error deleting employee:', error)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Error al eliminar el empleado'
        })
      } else {
        toast({
          title: 'Éxito',
          description: 'Empleado eliminado correctamente'
        })
        setDeleteDialogOpen(false)
        onOpenChange(false)
        onSuccess()
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al eliminar el empleado'
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!employee) return null

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0">
        <div className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent hover:scrollbar-thumb-orange-300 px-4 sm:px-6 py-4 sm:py-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">Editar Empleado</DialogTitle>
            <DialogDescription className="text-sm">
              Modifica la información de {employee.first_name} {employee.last_name}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 mt-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-3 p-4 sm:p-6 border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-lg">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative group">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-orange-200"
                  />
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : currentAvatarUrl ? (
                <div className="relative group">
                  <img
                    src={currentAvatarUrl}
                    alt={`${employee.first_name} ${employee.last_name}`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-orange-200"
                  />
                  <button
                    type="button"
                    onClick={removeCurrentAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all shadow-lg hover:scale-110"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center ring-2 ring-orange-200">
                  <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <Label className="text-sm sm:text-base font-semibold text-gray-800 block">
                Foto de Perfil
              </Label>
              <p className="text-xs text-gray-600">
                JPG, PNG o GIF (máximo 5MB)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="flex items-center justify-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-400 transition-all w-full sm:w-auto"
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
                    <span>{(currentAvatarUrl || avatarPreview) ? 'Cambiar Foto' : 'Subir Foto'}</span>
                  </>
                )}
              </Button>

              {(avatarPreview || currentAvatarUrl) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={avatarPreview ? removeAvatar : removeCurrentAvatar}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all w-full sm:w-auto"
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
              <Label htmlFor="first_name" className="text-sm font-semibold text-gray-700">
                Nombre <span className="text-orange-600">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="first_name"
                  {...register('first_name')}
                  className="pl-10 h-10 focus:border-orange-500 focus:ring-orange-500"
                  placeholder="Ej: Juan"
                />
              </div>
              {errors.first_name && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errors.first_name.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last_name" className="text-sm font-semibold text-gray-700">
                Apellido <span className="text-orange-600">*</span>
              </Label>
              <Input
                id="last_name"
                {...register('last_name')}
                className="h-10 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Ej: Pérez"
              />
              {errors.last_name && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errors.last_name.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Email y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="pl-10 h-10 focus:border-orange-500 focus:ring-orange-500"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              {errors.email && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errors.email.message}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                Teléfono
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  id="phone"
                  type="tel"
                  {...register('phone')}
                  className="pl-10 h-10 focus:border-orange-500 focus:ring-orange-500"
                  placeholder="+593 99 123 4567"
                />
              </div>
              {errors.phone && (
                <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-red-700">{errors.phone.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Posición */}
          <div className="space-y-1.5">
            <Label htmlFor="position" className="text-sm font-semibold text-gray-700">
              Posición / Cargo
            </Label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="position"
                {...register('position')}
                className="pl-10 h-10 focus:border-orange-500 focus:ring-orange-500"
                placeholder="Ej: Estilista, Barbero, Masajista..."
              />
            </div>
            {errors.position && (
              <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{errors.position.message}</p>
              </div>
            )}
          </div>

          {/* Biografía */}
          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-sm font-semibold text-gray-700">
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
              <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{errors.bio.message}</p>
              </div>
            )}
          </div>

          {/* Estado del empleado */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 bg-orange-50/50 border border-orange-200 rounded-lg">
            <div>
              <Label htmlFor="is_active" className="text-sm font-semibold text-gray-900">
                Estado del Empleado
              </Label>
              <p className="text-xs text-gray-600 mt-0.5">
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

          {/* Employee Info */}
          <div className="border-t pt-3">
            <h3 className="text-xs font-semibold text-gray-900 mb-1">Información del Empleado</h3>
            <div className="text-xs text-gray-600 space-y-0.5">
              <p>Creado: {new Date(employee.created_at).toLocaleDateString('es-ES')}</p>
              {employee.updated_at !== employee.created_at && (
                <p>Última actualización: {new Date(employee.updated_at).toLocaleDateString('es-ES')}</p>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting || submitting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 order-3 sm:order-1"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Eliminar
            </Button>
            <div className="flex-1 hidden sm:block" />
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 order-2"
              disabled={submitting || deleting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-9 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm hover:shadow-md transition-all order-1 sm:order-3"
              disabled={submitting || deleting}
            >
              {submitting ? (
                <>
                  <div className="relative w-3.5 h-3.5 mr-2">
                    <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                    <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente a {employee.first_name} {employee.last_name}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <div className="relative w-3.5 h-3.5 mr-2">
                  <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

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
              <p className="text-lg font-medium text-gray-900 mb-2">Procesando imagen...</p>
              <p className="text-sm text-gray-600">Por favor espera un momento</p>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
