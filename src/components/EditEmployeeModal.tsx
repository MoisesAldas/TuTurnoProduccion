'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Save, User, Mail, Phone, Briefcase, Camera, Upload, X, AlertCircle, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { compressImage, validateImageFile, formatFileSize, convertToWebP } from '@/lib/imageUtils'
import BusinessImageCropper from '@/components/BusinessImageCropper'
import { employeeFormSchema, type EmployeeFormData } from '@/lib/validation'

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
    mode: 'onBlur',
    reValidateMode: 'onChange'
  })

  const isActive = watch('is_active')

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

      const compressedFile = await convertToWebP(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.8,
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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl p-0 gap-0 border-none shadow-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden">
        <div className="max-h-[85vh] sm:max-h-[90vh] overflow-y-auto scrollbar-thin dark:scrollbar-thumb-gray-800 scrollbar-thumb-orange-200 scrollbar-track-transparent px-4 sm:px-8 py-6 sm:py-8">
          <DialogHeader className="mb-6">
            <div className="flex flex-col gap-0.5 relative pl-5">
              <div className="absolute left-0 w-1 h-6 bg-primary rounded-full mt-0.5" />
              <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary">Editar Profesional</span>
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white italic">
                {employee.first_name} {employee.last_name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium text-gray-500 dark:text-gray-400 pl-5">
              Modifica la información o el estado operativo del empleado
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center space-y-4 p-6 sm:p-8 border-2 border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 rounded-[2rem] transition-all hover:border-primary/30 group">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative group/avatar">
                  <img
                    src={avatarPreview}
                    alt="Preview"
                    className="w-24 h-24 sm:w-28 sm:h-24 rounded-[2rem] object-cover border-4 border-white dark:border-gray-800 shadow-2xl transition-transform group-hover/avatar:scale-105"
                  />
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-xl p-2 hover:bg-red-600 transition-all shadow-lg hover:scale-110 active:scale-90"
                  >
                    <X className="w-4 h-4 stroke-[3px]" />
                  </button>
                </div>
              ) : currentAvatarUrl ? (
                <div className="relative group/avatar">
                  <img
                    src={currentAvatarUrl}
                    alt={`${employee.first_name} ${employee.last_name}`}
                    className="w-24 h-24 sm:w-28 sm:h-24 rounded-[2rem] object-cover border-4 border-white dark:border-gray-800 shadow-2xl transition-transform group-hover/avatar:scale-105"
                  />
                  <button
                    type="button"
                    onClick={removeCurrentAvatar}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-xl p-2 hover:bg-red-600 transition-all shadow-lg hover:scale-110 active:scale-90"
                  >
                    <X className="w-4 h-4 stroke-[3px]" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-white dark:bg-gray-800 rounded-[2.5rem] flex items-center justify-center shadow-inner border border-gray-100 dark:border-gray-700 transition-all group-hover:border-primary/20">
                  <Camera className="w-10 h-10 text-gray-300 dark:text-gray-600 group-hover:text-primary transition-colors" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="h-10 rounded-xl px-6 text-[10px] font-black uppercase tracking-widest border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary hover:text-primary dark:hover:text-primary transition-all active:scale-95"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-2" />
                    <span>{(currentAvatarUrl || avatarPreview) ? 'Cambiar Foto' : 'Subir Foto'}</span>
                  </>
                )}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Nombre *</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    className="pl-11 h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary"
                    placeholder="Ej: Juan"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Apellido *</Label>
                <Input
                  id="last_name"
                  {...register('last_name')}
                  className="h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary"
                  placeholder="Ej: Pérez"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="pl-11 h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    maxLength={10}
                    {...register('phone')}
                    className="pl-11 h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary"
                    placeholder="0999123456"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Posición / Cargo</Label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="position"
                  {...register('position')}
                  className="pl-11 h-12 rounded-xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary"
                  placeholder="Ej: Estilista, Barbero, Masajista..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 pl-4">Biografía</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                className="rounded-2xl border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800/50 font-bold focus-visible:ring-primary min-h-[80px] resize-none"
                placeholder="Descripción breve..."
              />
            </div>

            {/* Estado del empleado */}
            <div className="p-5 bg-orange-50/30 dark:bg-orange-950/10 border-2 border-orange-100 dark:border-orange-900/30 rounded-[2rem] flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active" className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                  Estado Operativo
                </Label>
                <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">
                  {isActive ? '✓ Disponible' : '⚠ Inactivo'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue('is_active', checked)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleting || submitting}
              className="w-full sm:w-auto h-12 rounded-xl text-red-600 dark:text-red-500 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-950 font-black uppercase tracking-widest text-[10px]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-12 rounded-xl text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500"
              disabled={submitting || deleting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-12 px-10 bg-primary hover:bg-orange-600 text-white rounded-xl shadow-xl shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50"
              disabled={!isValid || submitting || deleting}
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Guardando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="w-4 h-4 mr-2" />
                  <span className="text-[11px] font-black uppercase tracking-widest">Guardar Cambios</span>
                </div>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent className="dark:bg-gray-900 border-none rounded-[2rem]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-500" />
            </div>
            <AlertDialogTitle className="dark:text-white">
              ¿Estás seguro?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="dark:text-gray-400">
            Esta acción eliminará permanentemente a {employee.first_name} {employee.last_name}. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 gap-2">
          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 shadow-red-600/20 rounded-xl"
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
      <DialogContent className="max-w-5xl p-0 gap-0 border-none rounded-[2rem] overflow-hidden bg-white dark:bg-gray-900">
        <div className="max-h-[90vh] overflow-y-auto scrollbar-thin dark:scrollbar-thumb-gray-800 p-6">
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
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
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
