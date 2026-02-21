'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'
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
import { AlertCircle, Trash2 as TrashIcon } from 'lucide-react'

interface BusinessPhoto {
  id: string
  photo_url: string
  display_order: number
  created_at: string
}

interface BusinessPhotoGalleryProps {
  businessId: string
  compact?: boolean
}

const MAX_PHOTOS = 5

export default function BusinessPhotoGallery({ businessId, compact = false }: BusinessPhotoGalleryProps) {
  const [photos, setPhotos] = useState<BusinessPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchPhotos()
  }, [businessId])

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('business_photos')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      setPhotos(data || [])
    } catch (error) {
      console.error('Error fetching photos:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las fotos'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    // Check max photos
    if (photos.length >= MAX_PHOTOS) {
      toast({
        variant: 'destructive',
        title: 'Límite alcanzado',
        description: `Solo puedes subir un máximo de ${MAX_PHOTOS} fotos`
      })
      return
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: validation.error
      })
      return
    }

    // Upload directly (no cropper)
    await handlePhotoUpload(file)
  }

  const handlePhotoUpload = async (file: File) => {
    try {
      setUploading(true)

      console.log('🚀 Iniciando proceso de subida de foto...')
      console.log(`📁 Archivo original: ${file.name} (${formatFileSize(file.size)})`)

      // Verificar autenticación
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Usuario autenticado:', user ? `${user.id} (${user.email})` : 'NO AUTENTICADO')

      if (!user) {
        console.error('❌ Usuario no autenticado')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Debes iniciar sesión para subir fotos'
        })
        return
      }

      // Verificar que el negocio pertenece al usuario
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, owner_id, name')
        .eq('id', businessId)
        .single()

      console.log('🏢 Negocio:', business)
      console.log('🔒 businessId:', businessId)
      console.log('👤 user.id:', user.id)
      console.log('👤 business.owner_id:', business?.owner_id)
      console.log('✅ Es dueño?:', business?.owner_id === user.id)

      if (businessError) {
        console.error('❌ Error al verificar negocio:', businessError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo verificar el negocio'
        })
        return
      }

      if (business.owner_id !== user.id) {
        console.error('❌ Usuario no es dueño del negocio')
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No tienes permiso para subir fotos a este negocio'
        })
        return
      }

      // Comprimir imagen (sin recorte, mantiene aspect ratio original)
      console.log('🗜️ Comprimiendo imagen...')
      const compressedFile = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.92,
        maxSizeKB: 1000
      })

      console.log(`🗜️ Archivo final: ${compressedFile.name} (${formatFileSize(compressedFile.size)})`)
      console.log(`📊 Reducción: ${Math.round((1 - compressedFile.size / file.size) * 100)}%`)

      // Upload to Supabase Storage (usando el mismo bucket que logo/cover)
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${businessId}/gallery/${Date.now()}.${fileExt}`

      console.log('📤 Subiendo archivo a storage:', fileName)
      console.log('📦 Bucket: business-images')
      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('❌ Error uploading photo:', uploadError)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Error al subir la foto: ${uploadError.message}`
        })
        return
      }

      console.log('✅ Archivo subido al storage')

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(fileName)

      console.log('🔗 URL pública:', publicUrl)

      // Save to database
      console.log('💾 Guardando en base de datos...')
      console.log('💾 Datos a insertar:', {
        business_id: businessId,
        photo_url: publicUrl,
        display_order: photos.length
      })

      const { data: insertedData, error: dbError } = await supabase
        .from('business_photos')
        .insert({
          business_id: businessId,
          photo_url: publicUrl,
          display_order: photos.length
        })
        .select()

      if (dbError) {
        console.error('❌ Error saving photo to DB:', dbError)
        console.error('❌ Error code:', dbError.code)
        console.error('❌ Error message:', dbError.message)
        console.error('❌ Error details:', dbError.details)
        console.error('❌ Error hint:', dbError.hint)
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `Error al guardar la foto: ${dbError.message}`
        })
        return
      }

      console.log('✅ Foto guardada en DB:', insertedData)

      toast({
        title: 'Éxito',
        description: 'Foto agregada correctamente'
      })

      // Refresh photos
      await fetchPhotos()

    } catch (error) {
      console.error('Error processing photo:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al procesar la foto'
      })
    } finally {
      setUploading(false)
    }
  }

  const deletePhoto = async (photoId: string, photoUrl: string) => {
    try {
      // Delete from database (soft delete)
      const { error: dbError } = await supabase
        .from('business_photos')
        .update({ is_active: false })
        .eq('id', photoId)

      if (dbError) throw dbError

      // Optionally delete from storage
      try {
        const fileName = photoUrl.split('/').slice(-3).join('/')
        console.log('🗑️ Eliminando del storage:', fileName)
        await supabase.storage
          .from('business-images')
          .remove([fileName])
      } catch (storageError) {
        console.warn('Could not delete from storage:', storageError)
      }

      toast({
        title: 'Éxito',
        description: 'Foto eliminada correctamente'
      })

      // Refresh photos
      await fetchPhotos()

    } catch (error) {
      console.error('Error deleting photo:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al eliminar la foto'
      })
    }
  }

  if (loading) {
    return compact ? (
      <div className="py-4 text-center">
        <div className="animate-spin w-5 h-5 border-2 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-2"></div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">Cargando...</p>
      </div>
    ) : (
      <Card className="border-0 shadow-sm dark:bg-gray-900 rounded-[2rem] overflow-hidden">
        <CardContent className="p-12 text-center bg-white dark:bg-gray-900">
          <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Cargando galería...</p>
        </CardContent>
      </Card>
    )
  }

  // Compact Mode - Grid 3x2 (6 slots total) - Compacted
  if (compact) {
    // Create array of 6 slots
    const TOTAL_SLOTS = 6
    const slots = []

    // Add existing photos
    for (let i = 0; i < photos.length && i < MAX_PHOTOS; i++) {
      slots.push({ type: 'photo', data: photos[i] })
    }

    // Add upload button if space available
    if (photos.length < MAX_PHOTOS) {
      slots.push({ type: 'upload', data: null })
    }

    // Fill remaining slots with empty placeholders
    while (slots.length < TOTAL_SLOTS) {
      slots.push({ type: 'empty', data: null })
    }

    return (
      <div className="space-y-2 h-full flex flex-col">
        {/* Grid 3x2 Gallery */}
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot, index) => {
            if (slot.type === 'photo' && slot.data) {
              return (
                <div
                  key={slot.data.id}
                  className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-orange-200 transition-all"
                >
                  <img
                    src={slot.data.photo_url}
                    alt="Foto del negocio"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="p-1 bg-red-500 hover:bg-red-600 rounded shadow-sm text-white transition-transform active:scale-90"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <AlertDialogTitle>
                              Eliminar Foto
                            </AlertDialogTitle>
                          </div>
                          <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar esta foto de la galería? Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-4 gap-2">
                          <AlertDialogCancel>
                            Cancelar
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deletePhoto(slot.data!.id, slot.data!.photo_url)}
                            className="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                          >
                            Eliminar Permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )
            }

            if (slot.type === 'upload') {
              return (
                <button
                  key={`upload-${index}`}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none">Subir</span>
                    </>
                  )}
                </button>
              )
            }

            // Empty placeholder
            return (
              <div
                key={`empty-${index}`}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-50 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20"
              />
            )
          })}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Info Text - Compact */}
        <div className="text-center mt-1">
          {photos.length >= MAX_PHOTOS ? (
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">
              Límite {MAX_PHOTOS}/{MAX_PHOTOS}
            </span>
          ) : (
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {photos.length}/{MAX_PHOTOS} fotos
            </span>
          )}
        </div>
      </div>
    )
  }

  // Full Mode - Compacted Premium Redesign
  return (
    <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
      <CardHeader className="px-6 pt-6 pb-2">
        <div className="flex flex-col gap-0.5 relative pl-5">
          <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
          <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
            Galería
          </span>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              Galería de Fotos
            </CardTitle>
            <div className="px-2.5 py-1 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                {photos.length}/{MAX_PHOTOS} Slots
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6 space-y-4">
        {/* Info Alert - Compact */}
        <div className="flex items-start gap-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-xl p-3">
          <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
            <Camera className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-[10px] font-medium text-blue-800/80 dark:text-blue-300/80 leading-tight pt-1">
            Muestra las instalaciones y ambiente de tu negocio. Estas fotos aparecerán en tu perfil público.
          </p>
        </div>

        {/* Photos Grid - Compacted */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group aspect-video rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 hover:border-orange-200 transition-all shadow-sm"
            >
              <img
                src={photo.photo_url}
                alt="Foto del negocio"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 rounded-lg bg-red-600 hover:bg-red-700 text-[11px] font-bold"
                    >
                      <X className="w-3.5 h-3.5 mr-1.5" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <AlertDialogTitle>
                          Eliminar Foto
                        </AlertDialogTitle>
                      </div>
                      <AlertDialogDescription>
                        ¿Estás seguro de que deseas eliminar esta foto de la galería? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                      <AlertDialogCancel>
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deletePhoto(photo.id, photo.photo_url)}
                        className="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                      >
                        Eliminar Permanentemente
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}

          {/* Upload Button - Compacted */}
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-video rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 hover:border-orange-200 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all flex flex-col items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subiendo...</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
                    <Upload className="w-5 h-5 text-gray-400 group-hover:text-orange-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest">Añadir Foto</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">JPG, PNG • Máx 5MB</p>
                  </div>
                </>
              )}
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </CardContent>
    </Card>
  )
}
