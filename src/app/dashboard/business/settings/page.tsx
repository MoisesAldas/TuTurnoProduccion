'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Save, Building, Mail, Phone, Globe, MapPin, Upload, Camera, X,
  Image as ImageIcon, Settings, Shield, Clock, Calendar, Bell, Receipt,
  CheckCircle2, Info, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { compressImage, validateImageFile } from '@/lib/imageUtils'
import ImageCropper from '@/components/ImageCropper'
import BusinessPhotoGallery from '@/components/BusinessPhotoGallery'
import MapboxLocationPicker from '@/components/ui/mapbox-location-picker'
import SpecialHoursManager from '@/components/SpecialHoursManager'
import InvoiceConfigSection from '@/components/InvoiceConfigSection'
import { useToast } from '@/hooks/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Business } from '@/types/database'

// Schema de validación para información básica
const businessInfoSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional(),
  phone: z.string()
    .refine(
      (val) => val === '' || /^09\d{8}$/.test(val),
      'Ingrese un número celular válido que inicie con 09 (ej: 0987654321)'
    )
    .optional(),
  email: z.string()
    .email('Formato de email inválido')
    .optional()
    .or(z.literal('')),
  website: z.string()
    .url('Formato de URL inválido')
    .optional()
    .or(z.literal('')),
  address: z.string().optional()
})

// Schema para configuraciones avanzadas
const advancedSettingsSchema = z.object({
  cancellation_policy_hours: z.number().min(0).max(168),
  cancellation_policy_text: z.string().max(500),
  allow_client_cancellation: z.boolean(),
  allow_client_reschedule: z.boolean(),
  min_booking_hours: z.number().min(0).max(72),
  max_booking_days: z.number().min(1).max(365),
  enable_reminders: z.boolean(),
  reminder_hours_before: z.number().min(1).max(168),
  reminder_email_enabled: z.boolean(),
  reminder_sms_enabled: z.boolean(),
  reminder_push_enabled: z.boolean(),
  require_deposit: z.boolean(),
  deposit_percentage: z.number().min(0).max(100),
  auto_confirm_appointments: z.boolean(),
})

type BusinessInfoData = z.infer<typeof businessInfoSchema>
type AdvancedSettingsData = z.infer<typeof advancedSettingsSchema>

interface SpecialHour {
  id: string
  special_date: string
  is_closed: boolean
  open_time: string | null
  close_time: string | null
  reason: string
  description: string | null
}

type Section = 'profile' | 'visual' | 'location' | 'policies' | 'booking' | 'special-hours' | 'reminders' | 'invoicing'

export default function UnifiedSettingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<Section>(
    (searchParams?.get('section') as Section) || 'profile'
  )

  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [specialHours, setSpecialHours] = useState<SpecialHour[]>([])
  const [loadingSpecialHours, setLoadingSpecialHours] = useState(false)

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

  // Estado para ubicación
  const [locationData, setLocationData] = useState({
    address: '',
    latitude: -0.2295,
    longitude: -78.5249
  })

  const { authState } = useAuth()
  const supabase = createClient()
  const { toast } = useToast()

  // Form para información básica
  const {
    register: registerInfo,
    handleSubmit: handleSubmitInfo,
    reset: resetInfo,
    formState: { errors: errorsInfo, touchedFields: touchedInfo }
  } = useForm<BusinessInfoData>({
    resolver: zodResolver(businessInfoSchema),
    mode: 'onBlur', // ✅ VALIDACIÓN EN TIEMPO REAL
    reValidateMode: 'onChange'
  })

  // Form para configuraciones avanzadas
  const {
    register: registerAdvanced,
    handleSubmit: handleSubmitAdvanced,
    setValue: setValueAdvanced,
    watch: watchAdvanced,
    reset: resetAdvanced,
    formState: { errors: errorsAdvanced, touchedFields: touchedAdvanced }
  } = useForm<AdvancedSettingsData>({
    resolver: zodResolver(advancedSettingsSchema),
    mode: 'onBlur', // ✅ VALIDACIÓN EN TIEMPO REAL
    reValidateMode: 'onChange',
    defaultValues: {
      cancellation_policy_hours: 24,
      cancellation_policy_text: 'Las citas deben ser canceladas con al menos 24 horas de anticipación.',
      allow_client_cancellation: true,
      allow_client_reschedule: true,
      min_booking_hours: 1,
      max_booking_days: 90,
      enable_reminders: true,
      reminder_hours_before: 24,
      reminder_email_enabled: true,
      reminder_sms_enabled: false,
      reminder_push_enabled: true,
      require_deposit: false,
      deposit_percentage: 0,
      auto_confirm_appointments: false,
    }
  })

  const enableReminders = watchAdvanced('enable_reminders')
  const requireDeposit = watchAdvanced('require_deposit')

  useEffect(() => {
    if (authState.user) {
      fetchBusiness()
      fetchSpecialHours()
    }
  }, [authState.user])

  // Update URL when section changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    params.set('section', activeSection)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [activeSection, router])

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

      // Llenar formulario de información básica
      resetInfo({
        name: businessData.name || '',
        description: businessData.description || '',
        phone: businessData.phone || '',
        email: businessData.email || '',
        website: businessData.website || '',
        address: businessData.address || ''
      })

      // Llenar formulario de configuraciones avanzadas
      resetAdvanced({
        cancellation_policy_hours: businessData.cancellation_policy_hours || 24,
        cancellation_policy_text: businessData.cancellation_policy_text || 'Las citas deben ser canceladas con al menos 24 horas de anticipación.',
        allow_client_cancellation: businessData.allow_client_cancellation ?? true,
        allow_client_reschedule: businessData.allow_client_reschedule ?? true,
        min_booking_hours: businessData.min_booking_hours || 1,
        max_booking_days: businessData.max_booking_days || 90,
        enable_reminders: businessData.enable_reminders ?? true,
        reminder_hours_before: businessData.reminder_hours_before || 24,
        reminder_email_enabled: businessData.reminder_email_enabled ?? true,
        reminder_sms_enabled: businessData.reminder_sms_enabled ?? false,
        reminder_push_enabled: businessData.reminder_push_enabled ?? true,
        require_deposit: businessData.require_deposit ?? false,
        deposit_percentage: businessData.deposit_percentage || 0,
        auto_confirm_appointments: businessData.auto_confirm_appointments ?? false,
      })

      // Ubicación
      setLocationData({
        address: businessData.address || '',
        latitude: businessData.latitude || -0.2295,
        longitude: businessData.longitude || -78.5249
      })

      // Previews de imágenes
      if (businessData.logo_url) setLogoPreview(businessData.logo_url)
      if (businessData.cover_image_url) setCoverPreview(businessData.cover_image_url)

    } catch (error) {
      console.error('Error fetching business:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSpecialHours = async () => {
    if (!authState.user) return

    try {
      setLoadingSpecialHours(true)

      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', authState.user.id)
        .single()

      if (businessError || !businessData) return

      const { data, error } = await supabase
        .from('business_special_hours')
        .select('*')
        .eq('business_id', businessData.id)
        .order('special_date', { ascending: true })

      if (!error && data) {
        setSpecialHours(data)
      }
    } catch (error) {
      console.error('Error fetching special hours:', error)
    } finally {
      setLoadingSpecialHours(false)
    }
  }

  // Image handlers (unchanged)
  const handleLogoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Error en el archivo',
        description: validation.error
      })
      return
    }

    setOriginalLogoFile(file)
    setShowLogoCropper(true)
  }

  const handleCoverSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Error en el archivo',
        description: validation.error
      })
      return
    }

    setOriginalCoverFile(file)
    setShowCoverCropper(true)
  }

  const handleLogoCropSave = async (croppedFile: File) => {
    try {
      setUploadingLogo(true)
      setShowLogoCropper(false)

      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.98,
        maxSizeKB: 800
      })

      setLogoFile(compressedFile)

      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)

      toast({
        title: 'Logo procesado',
        description: 'La imagen está lista. Guarda los cambios para aplicar.'
      })

    } catch (error) {
      console.error('Error al procesar logo:', error)
      toast({
        variant: 'destructive',
        title: 'Error al procesar imagen',
        description: 'No se pudo procesar la imagen. Intenta con otro archivo.'
      })
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleCoverCropSave = async (croppedFile: File) => {
    try {
      setUploadingCover(true)
      setShowCoverCropper(false)

      const compressedFile = await compressImage(croppedFile, {
        maxWidth: 2000,
        maxHeight: 1000,
        quality: 0.98,
        maxSizeKB: 2500
      })

      setCoverFile(compressedFile)

      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string)
      }
      reader.readAsDataURL(compressedFile)

      toast({
        title: 'Portada procesada',
        description: 'La imagen está lista. Guarda los cambios para aplicar.'
      })

    } catch (error) {
      console.error('Error al procesar cover:', error)
      toast({
        variant: 'destructive',
        title: 'Error al procesar imagen',
        description: 'No se pudo procesar la imagen. Intenta con otro archivo.'
      })
    } finally {
      setUploadingCover(false)
    }
  }

  const handleLogoCropCancel = () => {
    setShowLogoCropper(false)
    setOriginalLogoFile(null)
  }

  const handleCoverCropCancel = () => {
    setShowCoverCropper(false)
    setOriginalCoverFile(null)
  }

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

      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error(`Error uploading ${type}:`, error)
      return null
    }
  }

  const onSubmitInfo = async (data: BusinessInfoData) => {
    if (!business) return

    // Validar ubicación para secciones de perfil/ubicación
    if ((activeSection === 'profile' || activeSection === 'location') &&
        (!locationData.address || locationData.address.trim() === '')) {
      toast({
        variant: 'destructive',
        title: 'Ubicación requerida',
        description: 'Por favor selecciona una ubicación para tu negocio en el mapa'
      })
      return
    }

    try {
      setSubmitting(true)

      let logoUrl = business.logo_url
      let coverUrl = business.cover_image_url

      if (logoFile) {
        const uploadedLogoUrl = await uploadImage(logoFile, 'logo')
        if (uploadedLogoUrl) logoUrl = uploadedLogoUrl
      }

      if (coverFile) {
        const uploadedCoverUrl = await uploadImage(coverFile, 'cover')
        if (uploadedCoverUrl) coverUrl = uploadedCoverUrl
      }

      const { error } = await supabase
        .from('businesses')
        .update({
          ...data,
          address: locationData.address,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          logo_url: logoUrl,
          cover_image_url: coverUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id)

      if (error) throw error

      toast({
        title: '¡Configuración actualizada!',
        description: 'Los cambios se han guardado exitosamente.'
      })

      await fetchBusiness()

    } catch (error) {
      console.error('Error updating business:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: 'No se pudo guardar la configuración. Intenta nuevamente.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const onSubmitAdvanced = async (data: AdvancedSettingsData) => {
    if (!business) return

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('businesses')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id)

      if (error) throw error

      toast({
        title: '¡Configuraciones actualizadas!',
        description: 'Los ajustes avanzados han sido guardados exitosamente.',
      })
      await fetchBusiness()

    } catch (error) {
      console.error('Error updating settings:', error)
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: 'No se pudieron guardar las configuraciones. Intenta de nuevo.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const navigationItems = [
    { id: 'profile' as Section, label: 'Perfil del Negocio', icon: Building },
    { id: 'visual' as Section, label: 'Identidad Visual', icon: ImageIcon },
    { id: 'location' as Section, label: 'Ubicación', icon: MapPin },
    { id: 'policies' as Section, label: 'Políticas', icon: Shield },
    { id: 'booking' as Section, label: 'Reservas', icon: Clock },
    { id: 'special-hours' as Section, label: 'Horarios Especiales', icon: Calendar },
    { id: 'reminders' as Section, label: 'Recordatorios', icon: Bell },
    { id: 'invoicing' as Section, label: 'Facturación', icon: Receipt },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Configuración</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Gestiona todos los aspectos de tu negocio
              </p>
            </div>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
              <Settings className="w-4 h-4 mr-2" />
              {business?.name}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Mobile Section Selector */}
        <div className="lg:hidden w-full mb-4">
          <select
            value={activeSection}
            onChange={(e) => setActiveSection(e.target.value as Section)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-800 dark:text-gray-50"
          >
            {navigationItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                      transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0 w-full lg:w-auto">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <form onSubmit={handleSubmitInfo(onSubmitInfo)} className="space-y-4">
                <Card className="dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building className="w-5 h-5 text-orange-600" />
                      Información del Negocio
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400 text-sm">
                      Información básica que se mostrará en tu perfil público
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
                      {/* Columna Izquierda: Logo */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Logo</Label>
                        <div className="flex lg:flex-col items-start gap-2">
                          <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            {logoPreview ? (
                              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                          <div className="flex lg:flex-col gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-gray-300 dark:border-gray-600 border-t-orange-600 rounded-full animate-spin mr-2" />
                                  Procesando...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3 mr-2" />
                                  {logoPreview ? 'Cambiar' : 'Subir'}
                                </>
                              )}
                            </Button>
                            {logoFile && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={removeLogo}
                                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoSelect}
                          className="hidden"
                        />
                      </div>

                      {/* Columna Derecha: Campos + Descripción */}
                      <div className="space-y-3">
                        {/* Fila 1: Nombre + Teléfono */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Nombre */}
                          <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-sm dark:text-gray-50">
                              Nombre del Negocio *
                            </Label>
                            <div className="relative">
                              <Input
                                id="name"
                                {...registerInfo('name')}
                                placeholder="Ej: Salón de Belleza María"
                                className={`h-9 ${
                                  touchedInfo.name && !errorsInfo.name ? 'border-green-500' : ''
                                } ${
                                  errorsInfo.name ? 'border-red-500' : ''
                                }`}
                              />
                              {touchedInfo.name && !errorsInfo.name && (
                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                              )}
                            </div>
                            {errorsInfo.name && (
                              <p className="text-xs text-red-600 dark:text-red-400">{errorsInfo.name.message}</p>
                            )}
                          </div>

                          {/* Teléfono */}
                          <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-sm dark:text-gray-50">Teléfono</Label>
                            <div className="relative">
                              <Input
                                id="phone"
                                type="tel"
                                {...registerInfo('phone', {
                                  onChange: (e) => {
                                    // Solo permite números
                                    const value = e.target.value.replace(/\D/g, '')
                                    e.target.value = value
                                  }
                                })}
                                placeholder="0987654321"
                                maxLength={10}
                                className={`h-9 ${
                                  touchedInfo.phone && !errorsInfo.phone ? 'border-green-500' : ''
                                } ${
                                  errorsInfo.phone ? 'border-red-500' : ''
                                }`}
                              />
                              {touchedInfo.phone && !errorsInfo.phone && (
                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                              )}
                            </div>
                            {errorsInfo.phone && (
                              <p className="text-xs text-red-600 dark:text-red-400">{errorsInfo.phone.message}</p>
                            )}
                          </div>
                        </div>

                        {/* Fila 2: Email + Website */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Email */}
                          <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm dark:text-gray-50">Email</Label>
                            <div className="relative">
                              <Input
                                id="email"
                                type="email"
                                {...registerInfo('email')}
                                placeholder="contacto@negocio.com"
                                className={`h-9 ${
                                  touchedInfo.email && !errorsInfo.email ? 'border-green-500' : ''
                                } ${
                                  errorsInfo.email ? 'border-red-500' : ''
                                }`}
                              />
                              {touchedInfo.email && !errorsInfo.email && (
                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                              )}
                            </div>
                            {errorsInfo.email && (
                              <p className="text-xs text-red-600 dark:text-red-400">{errorsInfo.email.message}</p>
                            )}
                          </div>

                          {/* Website */}
                          <div className="space-y-1.5">
                            <Label htmlFor="website" className="text-sm dark:text-gray-50">Sitio Web</Label>
                            <div className="relative">
                              <Input
                                id="website"
                                {...registerInfo('website')}
                                placeholder="https://tunegocio.com"
                                className={`h-9 ${
                                  touchedInfo.website && !errorsInfo.website ? 'border-green-500' : ''
                                } ${
                                  errorsInfo.website ? 'border-red-500' : ''
                                }`}
                              />
                              {touchedInfo.website && !errorsInfo.website && (
                                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                              )}
                            </div>
                            {errorsInfo.website && (
                              <p className="text-xs text-red-600 dark:text-red-400">{errorsInfo.website.message}</p>
                            )}
                          </div>
                        </div>

                        {/* Fila 3: Descripción - Full Width */}
                        <div className="space-y-1.5">
                          <Label htmlFor="description" className="text-sm dark:text-gray-50">Descripción</Label>
                          <Textarea
                            id="description"
                            {...registerInfo('description')}
                            placeholder="Describe tu negocio..."
                            rows={2}
                            className={`resize-none ${
                              touchedInfo.description && !errorsInfo.description ? 'border-green-500' : ''
                            } ${
                              errorsInfo.description ? 'border-red-500' : ''
                            }`}
                          />
                          {errorsInfo.description && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errorsInfo.description.message}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">Máximo 500 caracteres</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 border-t dark:bg-gray-900/95 dark:border-gray-800">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
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
            )}

            {/* Visual Identity Section */}
            {activeSection === 'visual' && (
              <form onSubmit={handleSubmitInfo(onSubmitInfo)} className="space-y-6">
                <Card className="dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-orange-600" />
                      Imagen de Portada
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Imagen principal que se mostrará en tu perfil
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                      <Info className="w-4 h-4" />
                      <AlertDescription className="text-sm dark:text-gray-200">
                        <strong>Requisitos:</strong> JPG, PNG o WebP • Tamaño recomendado: 2000x1000px (2:1) • Máximo 10MB
                        <br/>
                        Tu portada aparecerá en la parte superior de tu perfil público.
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-4">
                      <div className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800 min-h-[200px] flex items-center justify-center">
                        {coverPreview ? (
                          <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center text-gray-400 dark:text-gray-500">
                            <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                            <p className="text-sm">Sin imagen de portada</p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploadingCover}
                        >
                          {uploadingCover ? (
                            <>
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-600 rounded-full animate-spin mr-2" />
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {coverPreview ? 'Cambiar Portada' : 'Subir Portada'}
                            </>
                          )}
                        </Button>
                        {coverFile && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={removeCover}
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverSelect}
                        className="hidden"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Photo Gallery */}
                {business && (
                  <Card className="dark:border-gray-700">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-orange-600" />
                        Galería de Fotos
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        Muestra fotos de tu trabajo y espacio
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <BusinessPhotoGallery businessId={business.id} />
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm py-4 border-t dark:bg-gray-900/95 dark:border-gray-800">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
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
            )}

            {/* Location Section */}
            {activeSection === 'location' && (
              <form onSubmit={handleSubmitInfo(onSubmitInfo)} className="space-y-4">
                <Card className="dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MapPin className="w-5 h-5 text-orange-600" />
                      Ubicación del Negocio
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400 text-sm">
                      Ayuda a tus clientes a encontrarte fácilmente
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {locationData.address && (
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-sm text-green-900 dark:text-green-200">
                        <MapPin className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span>
                          <strong>Ubicación seleccionada:</strong> {locationData.address}
                        </span>
                      </div>
                    )}
                    <MapboxLocationPicker
                      onLocationSelect={(location) => {
                        setLocationData({
                          address: location.address,
                          latitude: location.latitude,
                          longitude: location.longitude
                        })
                      }}
                      initialLocation={locationData}
                    />
                  </CardContent>
                </Card>

                <div className="flex justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 border-t dark:bg-gray-900/95 dark:border-gray-800">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
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
            )}

            {/* Policies Section */}
            {activeSection === 'policies' && (
              <form onSubmit={handleSubmitAdvanced(onSubmitAdvanced)} className="space-y-4">
                <Card className="dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="w-5 h-5 text-orange-600" />
                      Políticas de Cancelación
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400 text-sm">
                      Define las reglas para cancelar y reagendar citas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                      {/* Horas de anticipación */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cancellation_policy_hours" className="text-sm dark:text-gray-50">
                          Horas de anticipación
                        </Label>
                        <Input
                          id="cancellation_policy_hours"
                          type="number"
                          min="0"
                          max="168"
                          className="h-9"
                          {...registerAdvanced('cancellation_policy_hours', { valueAsNumber: true })}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Máximo 168 horas (7 días)
                        </p>
                        {errorsAdvanced.cancellation_policy_hours && (
                          <p className="text-xs text-red-600 dark:text-red-400">{errorsAdvanced.cancellation_policy_hours.message}</p>
                        )}
                      </div>

                      {/* Checkboxes en la segunda columna */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="allow_client_cancellation"
                            {...registerAdvanced('allow_client_cancellation')}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <Label htmlFor="allow_client_cancellation" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                            Permitir cancelación por clientes
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="allow_client_reschedule"
                            {...registerAdvanced('allow_client_reschedule')}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <Label htmlFor="allow_client_reschedule" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                            Permitir reagendar por clientes
                          </Label>
                        </div>
                      </div>

                      {/* Texto de política - Full Width */}
                      <div className="lg:col-span-2 space-y-1.5">
                        <Label htmlFor="cancellation_policy_text" className="text-sm dark:text-gray-50">
                          Texto de la política
                        </Label>
                        <Textarea
                          id="cancellation_policy_text"
                          {...registerAdvanced('cancellation_policy_text')}
                          rows={2}
                          className="resize-none"
                          placeholder="Describe tu política de cancelación..."
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Este texto se mostrará a los clientes al reservar
                        </p>
                        {errorsAdvanced.cancellation_policy_text && (
                          <p className="text-xs text-red-600 dark:text-red-400">{errorsAdvanced.cancellation_policy_text.message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Settings */}
                <Card className="dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-orange-600" />
                      Configuraciones Adicionales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                      {/* Auto-confirmar */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="auto_confirm_appointments"
                          {...registerAdvanced('auto_confirm_appointments')}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <Label htmlFor="auto_confirm_appointments" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                          Auto-confirmar citas
                        </Label>
                      </div>

                      {/* Requerir depósito */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="require_deposit"
                          {...registerAdvanced('require_deposit')}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <Label htmlFor="require_deposit" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                          Requerir depósito
                        </Label>
                      </div>

                      {/* Porcentaje de depósito - Condicional */}
                      {requireDeposit && (
                        <div className="lg:col-span-2 space-y-1.5">
                          <Label htmlFor="deposit_percentage" className="text-sm dark:text-gray-50">
                            Porcentaje de depósito (%)
                          </Label>
                          <Input
                            id="deposit_percentage"
                            type="number"
                            min="0"
                            max="100"
                            className="h-9 max-w-xs"
                            {...registerAdvanced('deposit_percentage', { valueAsNumber: true })}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Porcentaje del precio total del servicio
                          </p>
                          {errorsAdvanced.deposit_percentage && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errorsAdvanced.deposit_percentage.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 border-t dark:bg-gray-900/95 dark:border-gray-800">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
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
            )}

            {/* Booking Section */}
            {activeSection === 'booking' && (
              <form onSubmit={handleSubmitAdvanced(onSubmitAdvanced)} className="space-y-4">
                <Card className="dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="w-5 h-5 text-orange-600" />
                      Restricciones de Reserva
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400 text-sm">
                      Define cuándo pueden reservar tus clientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                        {/* Anticipación mínima */}
                        <div className="space-y-1.5">
                          <Label htmlFor="min_booking_hours" className="text-sm dark:text-gray-50">
                            Anticipación mínima (horas)
                          </Label>
                          <Input
                            id="min_booking_hours"
                            type="number"
                            min="0"
                            max="72"
                            className="h-9"
                            {...registerAdvanced('min_booking_hours', { valueAsNumber: true })}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Máximo 72 horas (3 días)
                          </p>
                          {errorsAdvanced.min_booking_hours && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errorsAdvanced.min_booking_hours.message}</p>
                          )}
                        </div>

                        {/* Días máximos */}
                        <div className="space-y-1.5">
                          <Label htmlFor="max_booking_days" className="text-sm dark:text-gray-50">
                            Días máximos al futuro
                          </Label>
                          <Input
                            id="max_booking_days"
                            type="number"
                            min="1"
                            max="365"
                            className="h-9"
                            {...registerAdvanced('max_booking_days', { valueAsNumber: true })}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Máximo 365 días (1 año)
                          </p>
                          {errorsAdvanced.max_booking_days && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errorsAdvanced.max_booking_days.message}</p>
                          )}
                        </div>
                      </div>

                      {/* Vista previa con Badge */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Info className="w-4 h-4" />
                        <span>Reservas desde</span>
                        <Badge variant="secondary" className="font-mono">
                          {watchAdvanced('min_booking_hours')}h
                        </Badge>
                        <span>de anticipación hasta</span>
                        <Badge variant="secondary" className="font-mono">
                          {watchAdvanced('max_booking_days')}d
                        </Badge>
                        <span>al futuro</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 border-t dark:bg-gray-900/95 dark:border-gray-800">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
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
            )}

            {/* Special Hours Section */}
            {activeSection === 'special-hours' && (
              <div className="space-y-6">
                <Card className="dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      Horarios Especiales y Feriados
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400">
                      Gestiona días cerrados, feriados y horarios especiales
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-6 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">
                      <Info className="w-4 h-4" />
                      <AlertDescription className="dark:text-gray-200">
                        Configura días especiales donde tu negocio tendrá horarios diferentes o estará cerrado.
                        Estos horarios tienen prioridad sobre los horarios regulares.
                      </AlertDescription>
                    </Alert>

                    {loadingSpecialHours ? (
                      <div className="text-center py-8">
                        <div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Cargando horarios especiales...</p>
                      </div>
                    ) : business ? (
                      <SpecialHoursManager
                        businessId={business.id}
                        specialHours={specialHours}
                        onUpdate={fetchSpecialHours}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Reminders Section */}
            {activeSection === 'reminders' && (
              <form onSubmit={handleSubmitAdvanced(onSubmitAdvanced)} className="space-y-4">
                <Card className="dark:border-gray-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bell className="w-5 h-5 text-orange-600" />
                      Recordatorios Automáticos
                    </CardTitle>
                    <CardDescription className="dark:text-gray-400 text-sm">
                      Configura recordatorios para tus clientes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Activar recordatorios */}
                      <div className="flex items-center gap-2 pb-3 border-b dark:border-gray-800">
                        <input
                          type="checkbox"
                          id="enable_reminders"
                          {...registerAdvanced('enable_reminders')}
                          className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <Label htmlFor="enable_reminders" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                          Activar recordatorios automáticos
                        </Label>
                      </div>

                      {enableReminders && (
                        <div className="space-y-3">
                          {/* Grid: Horas antes + Canales */}
                          <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-x-6 gap-y-3">
                            {/* Horas antes */}
                            <div className="space-y-1.5">
                              <Label htmlFor="reminder_hours_before" className="text-sm dark:text-gray-50">
                                Horas antes
                              </Label>
                              <Input
                                id="reminder_hours_before"
                                type="number"
                                min="1"
                                max="168"
                                className="h-9"
                                {...registerAdvanced('reminder_hours_before', { valueAsNumber: true })}
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Máximo 168h (7 días)
                              </p>
                              {errorsAdvanced.reminder_hours_before && (
                                <p className="text-xs text-red-600 dark:text-red-400">{errorsAdvanced.reminder_hours_before.message}</p>
                              )}
                            </div>

                            {/* Canales */}
                            <div className="space-y-2">
                              <Label className="text-sm dark:text-gray-50">Canales de notificación</Label>

                              <div className="flex items-center gap-6">
                                {/* Email */}
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="reminder_email_enabled"
                                    {...registerAdvanced('reminder_email_enabled')}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                  />
                                  <Label htmlFor="reminder_email_enabled" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                                    Email
                                  </Label>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>

                                {/* SMS */}
                                <div className="flex items-center gap-2 opacity-50">
                                  <input
                                    type="checkbox"
                                    id="reminder_sms_enabled"
                                    {...registerAdvanced('reminder_sms_enabled')}
                                    disabled={true}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                  />
                                  <Label htmlFor="reminder_sms_enabled" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                                    SMS
                                  </Label>
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                    Próximamente
                                  </Badge>
                                </div>

                                {/* Push */}
                                <div className="flex items-center gap-2 opacity-50">
                                  <input
                                    type="checkbox"
                                    id="reminder_push_enabled"
                                    {...registerAdvanced('reminder_push_enabled')}
                                    disabled={true}
                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                  />
                                  <Label htmlFor="reminder_push_enabled" className="cursor-pointer text-sm font-medium dark:text-gray-50">
                                    Push
                                  </Label>
                                  <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                    Próximamente
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Vista previa con Badge */}
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 pt-2">
                            <Bell className="w-4 h-4" />
                            <span>Recordatorio</span>
                            <Badge variant="secondary" className="font-mono">
                              {watchAdvanced('reminder_hours_before')}h antes
                            </Badge>
                            <span>vía</span>
                            <Badge variant="secondary" className="font-mono">
                              {[
                                watchAdvanced('reminder_email_enabled') && 'Email',
                                watchAdvanced('reminder_sms_enabled') && 'SMS',
                                watchAdvanced('reminder_push_enabled') && 'Push'
                              ].filter(Boolean).join(', ') || 'ninguno'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 border-t dark:bg-gray-900/95 dark:border-gray-800">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
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
            )}

            {/* Invoicing Section */}
            {activeSection === 'invoicing' && (
              <div className="space-y-6">
                <InvoiceConfigSection />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cropper Modals */}
      {showLogoCropper && originalLogoFile && (
        <ImageCropper
          imageFile={originalLogoFile}
          onSave={handleLogoCropSave}
          onCancel={handleLogoCropCancel}
          aspectRatio={1}
          maxWidth={500}
          maxHeight={500}
        />
      )}

      {showCoverCropper && originalCoverFile && (
        <ImageCropper
          imageFile={originalCoverFile}
          onSave={handleCoverCropSave}
          onCancel={handleCoverCropCancel}
          aspectRatio={2}
          maxWidth={2000}
          maxHeight={1000}
        />
      )}
    </div>
  )
}
