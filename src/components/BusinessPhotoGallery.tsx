'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Camera, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'

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
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return

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
      <div className="py-6 text-center">
        <div className="animate-spin w-6 h-6 border-3 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-2"></div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Cargando...</p>
      </div>
    ) : (
      <Card>
        <CardContent className="p-12 text-center bg-white dark:bg-gray-900">
          <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando galería...</p>
        </CardContent>
      </Card>
    )
  }

  // Compact Mode - Grid 3x2 (6 slots total)
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
      <div className="space-y-3 h-full flex flex-col">
        {/* Grid 3x2 Gallery */}
        <div className="grid grid-cols-3 gap-2">
          {slots.map((slot, index) => {
            if (slot.type === 'photo' && slot.data) {
              return (
                <div
                  key={slot.data.id}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                >
                  <img
                    src={slot.data.photo_url}
                    alt="Foto del negocio"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => deletePhoto(slot.data.id, slot.data.photo_url)}
                      className="p-1 bg-red-500 hover:bg-red-600 rounded text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
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
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex flex-col items-center justify-center gap-1 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-50">Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-50">Agregar</span>
                    </>
                  )}
                </button>
              )
            }

            // Empty placeholder
            return (
              <div
                key={`empty-${index}`}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
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
        <p className="text-xs text-gray-700 dark:text-gray-300 text-center font-medium mt-3 px-2">
          {photos.length >= MAX_PHOTOS ? (
            <span className="text-orange-600 font-semibold">
              Límite alcanzado ({MAX_PHOTOS}/{MAX_PHOTOS})
            </span>
          ) : (
            <span className="text-gray-900 dark:text-gray-50">{photos.length}/{MAX_PHOTOS} fotos • JPG, PNG (máx. 5MB)</span>
          )}
        </p>
      </div>
    )
  }

  // Full Mode - Grid View
  return (
    <>
      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b dark:border-gray-800 bg-white dark:bg-gray-900">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <span>Galería de Fotos</span>
              <p className="text-sm font-normal text-gray-600 dark:text-gray-400 mt-1">
                Muestra las instalaciones y ambiente de tu negocio ({photos.length}/{MAX_PHOTOS})
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Info Alert */}
          <Alert className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700">
            <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-700 dark:text-blue-200">
              Las fotos de tu galería se mostrarán en un carrusel en tu perfil público.
              Recomendamos fotos de alta calidad de tus instalaciones, equipo y ambiente.
            </AlertDescription>
          </Alert>

          {/* Photos Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group aspect-video rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
              >
                <img
                  src={photo.photo_url}
                  alt="Foto del negocio"
                  className="w-full h-full object-cover"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePhoto(photo.id, photo.photo_url)}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}

            {/* Upload Button */}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm font-medium dark:text-gray-50">Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8" />
                    <span className="text-sm font-medium dark:text-gray-50">Subir Foto</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">JPG, PNG (máx. 5MB)</span>
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

          {/* Info Text */}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {photos.length >= MAX_PHOTOS ? (
              <span className="text-orange-600 font-medium">
                Has alcanzado el límite de {MAX_PHOTOS} fotos. Elimina alguna para subir más.
              </span>
            ) : (
              <>Puedes subir hasta {MAX_PHOTOS - photos.length} foto(s) más</>
            )}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
