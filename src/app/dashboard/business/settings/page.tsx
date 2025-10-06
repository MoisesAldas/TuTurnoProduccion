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
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Save, Building, Mail, Phone, Globe, MapPin,
  Upload, Camera, X, Image as ImageIcon, Settings
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { compressImage, validateImageFile, formatFileSize } from '@/lib/imageUtils'
import ImageCropper from '@/components/ImageCropper'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Business } from '@/types/database'

// Schema de validación para el business
const businessSettingsSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  phone: z.string()
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .optional()
    .or(z.literal('')),
  email: z.string()
    .email('Formato de email inválido')
    .optional()
    .or(z.literal('')),
  website: z.string()
    .url('Formato de URL inválido')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .min(10, 'La dirección debe tener al menos 10 caracteres')
    .max(200, 'La dirección no puede exceder 200 caracteres')
})

type BusinessSettingsData = z.infer<typeof businessSettingsSchema>

export default function BusinessSettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Estados para logo
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [showLogoCropper, setShowLogoCropper] = useState(false)
  const [originalLogoFile, setOriginalLogoFile] = useState<File | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Estados para cover image
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [showCoverCropper, setShowCoverCropper] = useState(false)
  const [originalCoverFile, setOriginalCoverFile] = useState<File | null>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  const { authState } = useAuth()
  const supabase = createClient()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors }
  } = useForm<BusinessSettingsData>({
    resolver: zodResolver(businessSettingsSchema),
    mode: 'onSubmit'
  })

  useEffect(() => {
    if (authState.user) {
      fetchBusiness()
    }
  }, [authState.user])

  const fetchBusiness = async () => {
    if (!authState.user) return

    try {
      setLoading(true)

      const { data: businessData, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', authState.user.id)
        .single()

      if (error) {
        console.error('Error fetching business:', error)
        router.push('/business/setup')
        return
      }

      setBusiness(businessData)

      // Llenar el formulario con los datos existentes
      reset({
        name: businessData.name || '',
        description: businessData.description || '',
        phone: businessData.phone || '',
        email: businessData.email || '',
        website: businessData.website || '',
        address: businessData.address || ''
      })

      // Establecer previews de imágenes existentes
      if (businessData.logo_url) {
        setLogoPreview(businessData.logo_url)
      }
      if (businessData.cover_image_url) {
        setCoverPreview(businessData.cover_image_url)
      }

    } catch (error) {
      console.error('Error fetching business:', error)
    } finally {
      setLoading(false)
    }
  }

  // Manejar selección de archivo de logo
  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    setOriginalLogoFile(file)
    setShowLogoCropper(true)
  }

  // Manejar selección de archivo de cover
  const handleCoverSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    setOriginalCoverFile(file)
    setShowCoverCropper(true)
  }

  // Manejar crop del logo
  const handleLogoCropSave = async (croppedFile: File) => {
    try {
      setUploadingLogo(true)
      setShowLogoCropper(false)

      console.log(`📁 Logo original: ${originalLogoFile?.name} (${formatFileSize(originalLogoFile?.size || 0)})`)

      // Comprimir para logo (ULTRA calidad para tesis)
      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.98,
        maxSizeKB: 800
      })

      console.log(`🗜️ Logo comprimido: ${compressedFile.name} (${formatFileSize(compressedFile.size)})`)

      setLogoFile(compressedFile)

      // Crear preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)

    } catch (error) {
      console.error('Error al procesar logo:', error)
      alert('Error al procesar la imagen. Intenta con otro archivo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Manejar crop del cover
  const handleCoverCropSave = async (croppedFile: File) => {
    try {
      setUploadingCover(true)
      setShowCoverCropper(false)

      console.log(`📁 Cover original: ${originalCoverFile?.name} (${formatFileSize(originalCoverFile?.size || 0)})`)

      // Comprimir para cover (ULTRA calidad para tesis)
      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 2000,
        maxHeight: 1000,
        quality: 0.98,
        maxSizeKB: 2500
      })

      console.log(`🗜️ Cover comprimido: ${compressedFile.name} (${formatFileSize(compressedFile.size)})`)

      setCoverFile(compressedFile)

      // Crear preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)

    } catch (error) {
      console.error('Error al procesar cover:', error)
      alert('Error al procesar la imagen. Intenta con otro archivo.')
    } finally {
      setUploadingCover(false)
    }
  }

  // Cancelar croppers
  const handleLogoCropCancel = () => {
    setShowLogoCropper(false)
    setOriginalLogoFile(null)
  }

  const handleCoverCropCancel = () => {
    setShowCoverCropper(false)
    setOriginalCoverFile(null)
  }

  // Subir imagen a Supabase Storage
  const uploadImage = async (file: File, type: 'logo' | 'cover'): Promise<string | null> => {
    if (!file || !business) return null

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${business.id}/${type}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('business-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      return null
    }
  }

  // Remover imágenes
  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(business?.logo_url || null)
    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  const removeCover = () => {
    setCoverFile(null)
    setCoverPreview(business?.cover_image_url || null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }

  // Enviar formulario
  const onSubmit = async (data: BusinessSettingsData) => {
    if (!business) return

    try {
      setSubmitting(true)

      let logoUrl = business.logo_url
      let coverUrl = business.cover_image_url

      // Subir logo si hay uno nuevo
      if (logoFile) {
        const uploadedLogoUrl = await uploadImage(logoFile, 'logo')
        if (uploadedLogoUrl) {
          logoUrl = uploadedLogoUrl
        }
      }

      // Subir cover si hay uno nuevo
      if (coverFile) {
        const uploadedCoverUrl = await uploadImage(coverFile, 'cover')
        if (uploadedCoverUrl) {
          coverUrl = uploadedCoverUrl
        }
      }

      // Actualizar business
      const { error } = await supabase
        .from('businesses')
        .update({
          ...data,
          logo_url: logoUrl,
          cover_image_url: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id)

      if (error) throw error

      alert('¡Configuración actualizada exitosamente!')
      await fetchBusiness() // Recargar datos

    } catch (error) {
      console.error('Error updating business:', error)
      alert('Error al actualizar la configuración')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header centrado */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Configuración</h1>
            <p className="text-lg text-gray-600">Gestiona la información de tu negocio</p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 border border-orange-200 w-fit px-4 py-2">
            <Settings className="w-4 h-4 mr-2" />
            {business?.name}
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Advanced Settings Link */}
        <Link href="/dashboard/business/settings/advanced">
          <Card className="mb-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2 border-orange-200 hover:border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardHeader className="border-b bg-white/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Configuraciones Avanzadas</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Políticas, horarios especiales, recordatorios y más
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-orange-600">
                  <span className="text-sm font-medium hidden sm:inline">Configurar</span>
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </div>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Imágenes del negocio */}
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
            <CardHeader className="border-b bg-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-orange-600" />
                </div>
                <span>Imágenes del Negocio</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 pt-6">
              {/* Logo */}
              <div>
                <Label className="text-base font-semibold">Logo del Negocio</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Imagen cuadrada que represente tu negocio. Se mostrará en el perfil y búsquedas.
                </p>

                <div className="flex flex-col sm:flex-row items-start gap-6">
                  {/* Preview del logo */}
                  <div className="w-32 h-32 border-2 border-orange-200 rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center shadow-md flex-shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-orange-400">
                        <Building className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs font-medium">Sin logo</p>
                      </div>
                    )}
                  </div>

                  {/* Controles del logo */}
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-2 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors"
                      >
                        {uploadingLogo ? (
                          <>
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" />
                            {logoPreview ? 'Cambiar Logo' : 'Subir Logo'}
                          </>
                        )}
                      </Button>

                      {logoFile && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={removeLogo}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Quitar
                        </Button>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                      <p>• Formato: JPG, PNG o WebP</p>
                      <p>• Tamaño recomendado: 300x300px</p>
                      <p>• Máximo: 10MB</p>
                    </div>

                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              <div className="border-t pt-8">
                <Label className="text-base font-semibold">Imagen de Portada</Label>
                <p className="text-sm text-gray-600 mb-4">
                  Imagen horizontal que se mostrará como fondo en tu perfil público.
                </p>

                <div className="space-y-4">
                  {/* Preview del cover */}
                  <div className="w-full h-48 sm:h-64 border-2 border-orange-200 rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center shadow-md">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-orange-400">
                        <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                        <p className="text-sm font-medium">Sin imagen de portada</p>
                        <p className="text-xs">Recomendado: 800x400px</p>
                      </div>
                    )}
                  </div>

                  {/* Controles del cover */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="flex items-center gap-2 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 transition-colors"
                    >
                      {uploadingCover ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          {coverPreview ? 'Cambiar Portada' : 'Subir Portada'}
                        </>
                      )}
                    </Button>

                    {coverFile && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={removeCover}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Quitar
                      </Button>
                    )}
                  </div>

                  <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    <p>• Formato: JPG, PNG o WebP</p>
                    <p>• Tamaño recomendado: 800x400px (2:1)</p>
                    <p>• Máximo: 10MB</p>
                  </div>

                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    className="hidden"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información básica */}
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
            <CardHeader className="border-b bg-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-orange-600" />
                </div>
                <span>Información Básica</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Negocio *</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="name"
                    {...register('name')}
                    className="pl-10"
                    placeholder="Ej: Salón de Belleza María"
                  />
                </div>
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe tu negocio, servicios y lo que te hace especial..."
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Dirección */}
              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="address"
                    {...register('address')}
                    className="pl-10"
                    placeholder="Calle, número, ciudad"
                  />
                </div>
                {errors.address && (
                  <p className="text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información de contacto */}
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-orange-500">
            <CardHeader className="border-b bg-white">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-5 h-5 text-orange-600" />
                </div>
                <span>Información de Contacto</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phone"
                      {...register('phone')}
                      className="pl-10"
                      placeholder="Ej: +1234567890"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="pl-10"
                      placeholder="contacto@negocio.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="website"
                    {...register('website')}
                    className="pl-10"
                    placeholder="https://www.tunegocio.com"
                  />
                </div>
                {errors.website && (
                  <p className="text-sm text-red-600">{errors.website.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-0 bg-white/95 backdrop-blur-sm py-4 border-t">
            <Link href="/dashboard/business" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto hover:bg-gray-100 transition-colors">
                Cancelar
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
        </form>
      </div>

      {/* Logo Cropper Modal */}
      {showLogoCropper && originalLogoFile && (
        <ImageCropper
          imageFile={originalLogoFile}
          onSave={handleLogoCropSave}
          onCancel={handleLogoCropCancel}
          aspectRatio={1} // Cuadrado para logos (ULTRA)
          maxWidth={500}
          maxHeight={500}
        />
      )}

      {/* Cover Cropper Modal */}
      {showCoverCropper && originalCoverFile && (
        <ImageCropper
          imageFile={originalCoverFile}
          onSave={handleCoverCropSave}
          onCancel={handleCoverCropCancel}
          aspectRatio={2} // 2:1 para covers (ULTRA)
          maxWidth={2000}
          maxHeight={1000}
        />
      )}
    </div>
  )
}