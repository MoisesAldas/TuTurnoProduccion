'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
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
import {
  Save, Building, Mail, Phone, Globe, MapPin, Upload, Camera, X, Trash2,
  Image as ImageIcon, Settings, Shield, Clock, Calendar, Bell, Receipt,
  CheckCircle2, Info, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { compressImage, validateImageFile, convertToWebP } from '@/lib/imageUtils'
import ImageCropperEasy from '@/components/ImageCropperEasy'
import BusinessPhotoGallery from '@/components/BusinessPhotoGallery'
import MapboxLocationPicker from '@/components/ui/mapbox-location-picker'
import SpecialHoursManager from '@/components/SpecialHoursManager'
import InvoiceConfigSection from '@/components/InvoiceConfigSection'
import CancellationLimitSettings from '@/components/business/CancellationLimitSettings'
import { useToast } from '@/hooks/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'

const AccountManagementModal = dynamic(
  () => import('@/components/settings/AccountManagementModal'),
  { ssr: false }
)
import type { Business } from '@/types/database'
import {
  businessInfoSchema,
  advancedSettingsSchema,
  type BusinessInfoData,
  type AdvancedSettingsData
} from '@/lib/validation'

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
  const [showAccountModal, setShowAccountModal] = useState(false)
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
  const [isDeletingLogo, setIsDeletingLogo] = useState(false)
  const [isDeletingCover, setIsDeletingCover] = useState(false)
  const [showDeleteLogoConfirm, setShowDeleteLogoConfirm] = useState(false)
  const [showDeleteCoverConfirm, setShowDeleteCoverConfirm] = useState(false)

  // Estado para ubicación
  const [locationData, setLocationData] = useState({
    address: '',
    latitude: -0.2295,
    longitude: -78.5249
  })

  // Estado para categorías
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  const { authState } = useAuth()
  const supabase = createClient()
  const { toast } = useToast()

  // Form para información básica
  const {
    register: registerInfo,
    handleSubmit: handleSubmitInfo,
    reset: resetInfo,
    watch: watchInfo,
    setValue,
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
      max_monthly_cancellations: 5,
      enable_cancellation_blocking: false,
    }
  })

  const enableReminders = watchAdvanced('enable_reminders')
  const requireDeposit = watchAdvanced('require_deposit')

  useEffect(() => {
    if (authState.user) {
      fetchBusiness()
      fetchSpecialHours()
      fetchCategories()
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
        address: businessData.address || '',
        business_category_id: businessData.business_category_id || ''
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
        max_monthly_cancellations: businessData.max_monthly_cancellations || 5,
        enable_cancellation_blocking: businessData.enable_cancellation_blocking ?? false,
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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('id, name')
        .order('name')

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
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

      const compressedFile = await convertToWebP(croppedFile, {
        maxWidth: 500,
        maxHeight: 500,
        quality: 0.85,
        maxSizeKB: 500
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

      const compressedFile = await convertToWebP(croppedFile, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.82,
        maxSizeKB: 1000
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

  const handleDeleteLogo = async () => {
    if (!business) return

    try {
      setIsDeletingLogo(true)

      // 1. Eliminar del storage si existe una URL
      if (business.logo_url) {
        try {
          const fileName = business.logo_url.split('/').slice(-3).join('/')
          await supabase.storage.from('business-images').remove([fileName])
        } catch (storageError) {
          console.warn('No se pudo eliminar el logo del storage:', storageError)
        }
      }

      // 2. Actualizar base de datos
      const { error } = await supabase
        .from('businesses')
        .update({ logo_url: null })
        .eq('id', business.id)

      if (error) throw error

      // 3. Actualizar estado local
      setBusiness({ ...business, logo_url: undefined })
      setLogoPreview(null)
      setLogoFile(null)

      toast({
        title: 'Logo eliminado',
        description: 'El logo se ha eliminado correctamente.'
      })
    } catch (error) {
      console.error('Error deleting logo:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar el logo.'
      })
    } finally {
      setIsDeletingLogo(false)
      setShowDeleteLogoConfirm(false)
    }
  }

  const handleDeleteCover = async () => {
    if (!business) return

    try {
      setIsDeletingCover(true)

      // 1. Eliminar del storage si existe una URL
      if (business.cover_image_url) {
        try {
          const fileName = business.cover_image_url.split('/').slice(-3).join('/')
          await supabase.storage.from('business-images').remove([fileName])
        } catch (storageError) {
          console.warn('No se pudo eliminar la portada del storage:', storageError)
        }
      }

      // 2. Actualizar base de datos
      const { error } = await supabase
        .from('businesses')
        .update({ cover_image_url: null })
        .eq('id', business.id)

      if (error) throw error

      // 3. Actualizar estado local
      setBusiness({ ...business, cover_image_url: undefined })
      setCoverPreview(null)
      setCoverFile(null)

      toast({
        title: 'Portada eliminada',
        description: 'La imagen de portada se ha eliminado correctamente.'
      })
    } catch (error) {
      console.error('Error deleting cover:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la portada.'
      })
    } finally {
      setIsDeletingCover(false)
      setShowDeleteCoverConfirm(false)
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
    <div className="min-h-screen bg-transparent">
      {/* Integrated Header - Compacted */}
      <div className="w-full px-6 pt-6 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5 relative pl-6">
            <div className="absolute left-0 w-1 h-8 bg-orange-500 rounded-full mt-1" />
            <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600/80">
              Configuración de Negocio
            </span>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">
              {navigationItems.find(item => item.id === activeSection)?.label || 'Ajustes'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Settings className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 animate-[spin_4s_linear_infinite]" />
              </div>
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                {business?.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Compacted */}
      <div className="w-full px-6 py-2">
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

        <div className="flex gap-6 items-start">
          {/* Sidebar Navigation - Sticky & Compacter */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6 space-y-2">
              <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl rounded-[1.75rem] border border-gray-100 dark:border-gray-800 p-2 shadow-sm">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[1.125rem] text-xs font-bold
                        transition-all duration-300 relative group
                        ${isActive
                          ? 'bg-orange-600 text-white shadow-[0_8px_16px_-4px_rgba(234,88,12,0.3)]'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-orange-600'
                        }
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300
                        ${isActive 
                          ? 'bg-white/20' 
                          : 'bg-gray-50 dark:bg-gray-800 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/20'
                        }
                      `}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-orange-600'}`} />
                      </div>
                      <span className="flex-1 text-left tracking-tight">{item.label}</span>
                      {isActive && (
                        <div className="w-1 h-1 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1 min-w-0 w-full lg:w-auto">
            {/* Profile Section - Compacted */}
            {activeSection === 'profile' && (
              <form onSubmit={handleSubmitInfo(onSubmitInfo)} className="space-y-4">
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-0.5 relative pl-5">
                        <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                        <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                          General
                        </span>
                        <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                          Información del Negocio
                        </CardTitle>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAccountModal(true)}
                        title="Seguridad de la cuenta"
                        className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 hover:text-orange-600 transition-colors py-1 px-2 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/20"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Gestionar Cuenta</span>
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
                      {/* Logo Upload Section - Shorter */}
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Logo</Label>
                        <div className="flex lg:flex-col items-center gap-3">
                          <div className="relative group">
                            <div className="w-24 h-24 rounded-[1.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-orange-200 dark:group-hover:border-orange-800">
                              {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                              ) : (
                                <Building className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="w-8 h-8 text-white hover:bg-white/20 rounded-full"
                                  onClick={() => logoInputRef.current?.click()}
                                >
                                  <Camera className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            {uploadingLogo && (
                              <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-[1.5rem] flex items-center justify-center">
                                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex lg:flex-row gap-2">
                             <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo}
                              className="h-8 px-3 rounded-lg border-orange-200 dark:border-orange-800 text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all active:scale-95"
                            >
                              <Upload className="w-3 h-3 mr-1.5" />
                              Cambiar
                            </Button>

                            {(logoPreview || business?.logo_url) && (
                              <AlertDialog open={showDeleteLogoConfirm} onOpenChange={setShowDeleteLogoConfirm}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (logoFile) {
                                      removeLogo()
                                    } else {
                                      setShowDeleteLogoConfirm(true)
                                    }
                                  }}
                                  className="h-8 px-3 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                >
                                  <Trash2 className="w-3 h-3 mr-1.5" />
                                  Quitar
                                </Button>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                      </div>
                                      <AlertDialogTitle>Eliminar Logo</AlertDialogTitle>
                                    </div>
                                    <AlertDialogDescription>
                                      ¿Estás seguro de que deseas eliminar el logo de tu negocio? Esta acción no se puede deshacer.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="mt-4 gap-2">
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={handleDeleteLogo}
                                      disabled={isDeletingLogo}
                                      className="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                                    >
                                      {isDeletingLogo ? 'Eliminando...' : 'Eliminar Permanentemente'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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

                      {/* Form Fields - Compacted */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Name */}
                          <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Nombre *
                            </Label>
                            <Input
                              id="name"
                              {...registerInfo('name')}
                              className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                              placeholder="Ej: Salón de Belleza María"
                            />
                            {errorsInfo.name && (
                              <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">{errorsInfo.name.message}</p>
                            )}
                          </div>

                          {/* Phone */}
                          <div className="space-y-1.5">
                            <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Teléfono</Label>
                            <Input
                              id="phone"
                              type="tel"
                              {...registerInfo('phone', {
                                onChange: (e) => {
                                  const value = e.target.value.replace(/\D/g, '')
                                  e.target.value = value
                                }
                              })}
                              className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                              placeholder="0987654321"
                              maxLength={10}
                            />
                            {errorsInfo.phone && (
                              <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wider">{errorsInfo.phone.message}</p>
                            )}
                          </div>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                          <Label htmlFor="business_category_id" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Categoría *
                          </Label>
                          <Select
                            value={watchInfo('business_category_id') || ''}
                            onValueChange={(value) => setValue('business_category_id', value, { shouldValidate: true })}
                          >
                            <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm">
                              <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-gray-100 dark:border-gray-800 shadow-2xl">
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id} className="rounded-lg m-1 text-xs">
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Email */}
                          <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              {...registerInfo('email')}
                              className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                              placeholder="contacto@negocio.com"
                            />
                          </div>

                          {/* Website */}
                          <div className="space-y-1.5">
                            <Label htmlFor="website" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sitio Web</Label>
                            <Input
                              id="website"
                              {...registerInfo('website')}
                              className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                              placeholder="https://tunegocio.com"
                            />
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                          <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descripción</Label>
                          <Textarea
                            id="description"
                            {...registerInfo('description')}
                            placeholder="Describe tu negocio..."
                            rows={2}
                            className="rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 resize-none p-3 text-xs"
                          />
                          <div className="flex justify-between items-center">
                             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Máx 500 caracteres</p>
                             {errorsInfo.description && (
                               <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider">{errorsInfo.description.message}</p>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* Sticky Action Bar - Compact */}
                <div className="sticky bottom-4 z-20 flex justify-end">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                </div>
              </form>
            )}

            {/* Account Management Modal — rendered outside the form to avoid nesting issues */}
            {showAccountModal && (
              <AccountManagementModal
                open={showAccountModal}
                onClose={() => setShowAccountModal(false)}
                businessName={business?.name || 'Mi Negocio'}
              />
            )}

            {/* Visual Identity Section - Compacted */}
            {activeSection === 'visual' && (
              <form onSubmit={handleSubmitInfo(onSubmitInfo)} className="space-y-4">
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex flex-col gap-0.5 relative pl-5">
                      <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                        Marca
                      </span>
                      <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        Imagen de Portada
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-4">
                    <div className="flex items-start gap-4 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-800/30 rounded-xl p-3">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Info className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-orange-950 dark:text-orange-200 uppercase tracking-widest">Requisitos</p>
                        <p className="text-[10px] font-medium text-orange-800/80 dark:text-orange-300/80 leading-tight">
                          JPG, PNG, WebP • 2000x1000px (2:1) • Máx: 10MB
                        </p>
                      </div>
                    </div>

                    <div 
                      onClick={() => !uploadingCover && coverInputRef.current?.click()}
                      className={`group relative w-full aspect-[21/7] border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center transition-all hover:border-orange-200 dark:hover:border-orange-800 cursor-pointer ${uploadingCover ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                         {coverPreview ? (
                          <>
                            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                <Button
                                 type="button"
                                 size="icon"
                                 variant="ghost"
                                 className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/40"
                                 onClick={(e) => {
                                   e.stopPropagation()
                                   coverInputRef.current?.click()
                                 }}
                               >
                                 <Upload className="w-5 h-5" />
                               </Button>

                               <AlertDialog open={showDeleteCoverConfirm} onOpenChange={setShowDeleteCoverConfirm}>
                                 <Button
                                   type="button"
                                   size="icon"
                                   variant="ghost"
                                   className="w-10 h-10 rounded-full bg-red-500/20 text-red-100 hover:bg-red-500/40"
                                   onClick={(e) => {
                                     e.stopPropagation()
                                     if (coverFile) {
                                       removeCover()
                                     } else {
                                       setShowDeleteCoverConfirm(true)
                                     }
                                   }}
                                 >
                                   <X className="w-5 h-5" />
                                 </Button>
                                 <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                   <AlertDialogHeader>
                                     <div className="flex items-center gap-3 mb-2">
                                       <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                         <AlertCircle className="w-5 h-5 text-red-600" />
                                       </div>
                                       <AlertDialogTitle>Eliminar Portada</AlertDialogTitle>
                                     </div>
                                     <AlertDialogDescription>
                                       ¿Estás seguro de que deseas eliminar la imagen de portada de tu negocio? Esta acción no se puede deshacer.
                                     </AlertDialogDescription>
                                   </AlertDialogHeader>
                                   <AlertDialogFooter className="mt-4 gap-2">
                                     <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction
                                       onClick={(e) => {
                                         e.stopPropagation()
                                         handleDeleteCover()
                                       }}
                                       disabled={isDeletingCover}
                                       className="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                                     >
                                       {isDeletingCover ? 'Eliminando...' : 'Eliminar Permanentemente'}
                                     </AlertDialogAction>
                                   </AlertDialogFooter>
                                 </AlertDialogContent>
                               </AlertDialog>
                             </div>
                          </>
                        ) : (
                          <div className="text-center group-hover:scale-110 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center mx-auto mb-3 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20">
                              <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-orange-600 transition-colors" />
                            </div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-orange-600">Haz clic para subir portada</p>
                          </div>
                        )}

                        {uploadingCover && (
                          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row gap-2">
                         <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => coverInputRef.current?.click()}
                          disabled={uploadingCover}
                          className="h-8 px-3 rounded-lg border-orange-200 dark:border-orange-800 text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all active:scale-95"
                        >
                          <Upload className="w-3 h-3 mr-1.5" />
                          {coverPreview ? 'Cambiar Portada' : 'Subir Portada'}
                        </Button>

                        {(coverPreview || business?.cover_image_url) && (
                          <AlertDialog open={showDeleteCoverConfirm} onOpenChange={setShowDeleteCoverConfirm}>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (coverFile) {
                                  removeCover()
                                } else {
                                  setShowDeleteCoverConfirm(true)
                                }
                              }}
                              className="h-8 px-3 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                            >
                              <Trash2 className="w-3 h-3 mr-1.5" />
                              Quitar
                            </Button>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                  </div>
                                  <AlertDialogTitle>Eliminar Portada</AlertDialogTitle>
                                </div>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar la portada de tu negocio? Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-4 gap-2">
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeleteCover}
                                  disabled={isDeletingCover}
                                  className="bg-red-600 hover:bg-red-700 text-white shadow-red-600/20"
                                >
                                  {isDeletingCover ? 'Eliminando...' : 'Eliminar Permanentemente'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                      
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleCoverSelect}
                        className="hidden"
                      />
                  </CardContent>
                </Card>

                {/* Photo Gallery */}
                {business && (
                  <BusinessPhotoGallery businessId={business.id} />
                )}

                <div className="sticky bottom-4 z-20 flex justify-end">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                </div>
              </form>
            )}

            {/* Location Section - Compacted */}
            {activeSection === 'location' && (
              <form onSubmit={handleSubmitInfo(onSubmitInfo)} className="space-y-4">
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex flex-col gap-0.5 relative pl-5">
                      <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                        Geolocalización
                      </span>
                      <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        Ubicación del Negocio
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-4">
                    {locationData.address && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-800/30">
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                          <MapPin className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-orange-950 dark:text-orange-200 uppercase tracking-widest">Punto Seleccionado</p>
                          <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 truncate">
                            {locationData.address}
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm relative group">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Sticky Action Bar - Compact */}
                <div className="sticky bottom-4 z-20 flex justify-end">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                </div>
              </form>
            )}

            {/* Policies Section - Compacted */}
            {activeSection === 'policies' && (
              <form onSubmit={handleSubmitAdvanced(onSubmitAdvanced)} className="space-y-4">
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex flex-col gap-0.5 relative pl-5">
                      <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                        Seguridad
                      </span>
                      <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        Políticas de Cancelación
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Horas de anticipación */}
                      <div className="space-y-1.5">
                        <Label htmlFor="cancellation_policy_hours" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Anticipación (Horas)
                        </Label>
                        <div className="relative">
                          <Input
                            id="cancellation_policy_hours"
                            type="number"
                            min="0"
                            max="168"
                            className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                            {...registerAdvanced('cancellation_policy_hours', { valueAsNumber: true })}
                          />
                          {touchedAdvanced.cancellation_policy_hours && !errorsAdvanced.cancellation_policy_hours && (
                            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                          Máximo 168h (7 días)
                        </p>
                        {errorsAdvanced.cancellation_policy_hours && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1">{errorsAdvanced.cancellation_policy_hours.message}</p>
                        )}
                      </div>

                      {/* Permitir cancelación - Disabled with Premium Badge */}
                      <div className="space-y-1.5 opacity-60">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                          Autocancelación
                          <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">Pronto</span>
                        </Label>
                        <div className="h-10 px-3 rounded-xl bg-gray-50/30 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2 cursor-not-allowed">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <span className="text-xs font-bold text-gray-400">Deshabilitado</span>
                        </div>
                      </div>

                      {/* Permitir reagendar - Disabled with Premium Badge */}
                      <div className="space-y-1.5 opacity-60">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center justify-between">
                          Reagendar
                          <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">Pronto</span>
                        </Label>
                        <div className="h-10 px-3 rounded-xl bg-gray-50/30 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2 cursor-not-allowed">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <span className="text-xs font-bold text-gray-400">Deshabilitado</span>
                        </div>
                      </div>

                      {/* Texto de política - Full Width */}
                      <div className="md:col-span-2 lg:col-span-3 space-y-1.5">
                        <Label htmlFor="cancellation_policy_text" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Texto Legal de la Política
                        </Label>
                        <Textarea
                          id="cancellation_policy_text"
                          {...registerAdvanced('cancellation_policy_text')}
                          rows={2}
                          className="rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 resize-none p-3 text-xs"
                          placeholder="Describe tus reglas de cancelación..."
                        />
                         <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Se mostrará al cliente antes de confirmar</p>
                        {errorsAdvanced.cancellation_policy_text && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1">{errorsAdvanced.cancellation_policy_text.message}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cancellation Limit Settings - Premium Integrated */}
                {business && (
                  <CancellationLimitSettings 
                    businessId={business.id}
                    onLimitChange={(limit) => setValueAdvanced('max_monthly_cancellations', limit)}
                    onEnabledChange={(enabled) => setValueAdvanced('enable_cancellation_blocking', enabled)}
                  />
                )}

                {/* Sticky Action Bar - Compact */}
                <div className="sticky bottom-4 z-20 flex justify-end">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                </div>
              </form>
            )}

            {/* Booking Section - Compacted */}
            {activeSection === 'booking' && (
              <form onSubmit={handleSubmitAdvanced(onSubmitAdvanced)} className="space-y-4">
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex flex-col gap-0.5 relative pl-5">
                      <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                        Disponibilidad
                      </span>
                      <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        Restricciones de Reserva
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Anticipación mínima */}
                      <div className="space-y-1.5">
                        <Label htmlFor="min_booking_hours" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Anticipación Mínima (Horas)
                        </Label>
                        <div className="relative">
                          <Input
                            id="min_booking_hours"
                            type="number"
                            min="0"
                            max="72"
                            className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                            {...registerAdvanced('min_booking_hours', { valueAsNumber: true })}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Máximo 72h (3 días)</p>
                        {errorsAdvanced.min_booking_hours && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1">{errorsAdvanced.min_booking_hours.message}</p>
                        )}
                      </div>

                      {/* Días máximos */}
                      <div className="space-y-1.5">
                        <Label htmlFor="max_booking_days" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Futuro Máximo (Días)
                        </Label>
                        <div className="relative">
                          <Input
                            id="max_booking_days"
                            type="number"
                            min="1"
                            max="365"
                            className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm"
                            {...registerAdvanced('max_booking_days', { valueAsNumber: true })}
                          />
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Máximo 365d (1 año)</p>
                        {errorsAdvanced.max_booking_days && (
                          <p className="text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1">{errorsAdvanced.max_booking_days.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Badge Summary - Compact */}
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-800/80 dark:text-blue-300/80">
                        <span>Reservas desde</span>
                        <span className="bg-white/80 dark:bg-white/10 px-1.5 py-0.5 rounded text-orange-600">{watchAdvanced('min_booking_hours')}h</span>
                        <span>hasta</span>
                        <span className="bg-white/80 dark:bg-white/10 px-1.5 py-0.5 rounded text-orange-600">{watchAdvanced('max_booking_days')}d</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sticky Action Bar - Compact */}
                <div className="sticky bottom-4 z-20 flex justify-end">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
                </div>
              </form>
            )}

            {/* Special Hours Section */}
            {activeSection === 'special-hours' && (
              <div className="space-y-4">
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex flex-col gap-0.5 relative pl-5">
                      <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                        Disponibilidad
                      </span>
                      <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        Horarios Especiales y Feriados
                      </CardTitle>
                    </div>
                    <CardDescription className="px-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                      Gestiona días cerrados, feriados y horarios especiales
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 pt-4">
                    <div className="flex items-start gap-3 bg-orange-50/50 dark:bg-orange-900/10 border border-orange-100/50 dark:border-orange-800/30 rounded-xl p-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                        <Info className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-[10px] font-medium text-orange-800/80 dark:text-orange-300/80 leading-tight">
                        Configura días especiales donde tu negocio tendrá horarios diferentes o estará cerrado. Estos horarios tienen prioridad sobre los horarios regulares.
                      </p>
                    </div>

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
                <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
                  <CardHeader className="px-6 pt-6 pb-2">
                    <div className="flex flex-col gap-0.5 relative pl-5">
                      <div className="absolute left-0 w-1 h-6 bg-orange-500 rounded-full mt-0.5" />
                      <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-orange-600">
                        Comunicación Inteligente
                      </span>
                      <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                        Recordatorios Automáticos
                      </CardTitle>
                    </div>
                    <CardDescription className="px-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                      Reduce el ausentismo notificando a tus clientes antes de su cita
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-5">
                    {/* Activar recordatorios - Toggle Premium */}
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-50/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Bell className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <Label htmlFor="enable_reminders" className="text-[12px] font-black uppercase tracking-widest text-gray-900 dark:text-gray-100 cursor-pointer">
                            Estado del Sistema
                          </Label>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Activar notificaciones push/email</p>
                        </div>
                      </div>
                      <Switch
                        id="enable_reminders"
                        checked={enableReminders}
                        onCheckedChange={(checked: boolean) => setValueAdvanced('enable_reminders', checked, { shouldDirty: true })}
                        className="scale-110"
                      />
                    </div>

                    {enableReminders && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Horas antes */}
                          <div className="space-y-1.5">
                            <Label htmlFor="reminder_hours_before" className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                              Anticipación de Envío
                            </Label>
                            <div className="relative group">
                              <Input
                                id="reminder_hours_before"
                                type="number"
                                min="1"
                                max="168"
                                className="h-10 rounded-xl bg-gray-50/50 dark:bg-gray-800/50 border-gray-50 dark:border-gray-700/50 focus:ring-orange-500/20 text-sm font-black transition-all group-hover:border-orange-200"
                                {...registerAdvanced('reminder_hours_before', { valueAsNumber: true })}
                              />
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Horas</span>
                                {touchedAdvanced.reminder_hours_before && !errorsAdvanced.reminder_hours_before && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                            </div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
                              Sugerido: 24h a 48h
                            </p>
                            {errorsAdvanced.reminder_hours_before && (
                              <p className="text-[10px] font-bold text-red-500 mt-1 uppercase tracking-tight">{errorsAdvanced.reminder_hours_before.message}</p>
                            )}
                          </div>

                          {/* Canales */}
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Canales de notificación</Label>
                            <div className="flex gap-2">
                              {/* Email */}
                              <div className={`flex-1 flex items-center justify-between h-10 px-3 rounded-xl border-2 transition-all duration-300 ${
                                watchAdvanced('reminder_email_enabled')
                                  ? 'border-orange-500 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-950/20'
                                  : 'border-transparent bg-gray-50/50 dark:bg-gray-800/50'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-1.5 h-1.5 rounded-full ${watchAdvanced('reminder_email_enabled') ? 'bg-orange-500' : 'bg-gray-300'}`} />
                                  <span className={`text-[11px] font-black uppercase tracking-widest ${watchAdvanced('reminder_email_enabled') ? 'text-orange-900 dark:text-orange-200' : 'text-gray-400'}`}>Email</span>
                                </div>
                                <Switch
                                  checked={watchAdvanced('reminder_email_enabled')}
                                  onCheckedChange={(checked: boolean) => setValueAdvanced('reminder_email_enabled', checked, { shouldDirty: true })}
                                  className="scale-90"
                                />
                              </div>

                              {/* SMS / Push Placeholder */}
                              <div className="flex-1 flex items-center justify-between h-10 px-3 rounded-xl bg-gray-100/30 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-700 opacity-60 overflow-hidden">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">PRÓXIMAMENTE</span>
                                  <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">SMS & PUSH</span>
                                </div>
                                <div className="w-8 h-4 rounded-full bg-gray-200 dark:bg-gray-800" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Vista previa con Badge - Premium Recap */}
                        <div className="flex items-center gap-4 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <Info className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-blue-950 dark:text-blue-200 uppercase tracking-widest">Resumen del Recordatorio</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">El cliente recibirá un recordatorio</span>
                              <Badge variant="secondary" className="bg-blue-200/50 dark:bg-blue-800/30 text-blue-900 dark:text-blue-200 text-[10px] font-black uppercase tracking-widest border-0">
                                {watchAdvanced('reminder_hours_before')} Horas
                              </Badge>
                              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tight">antes de su turno vía</span>
                              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 text-[10px] font-black uppercase tracking-widest border-0">
                                {watchAdvanced('reminder_email_enabled') ? 'Email' : 'Ninguno'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sticky Action Bar - Standardized */}
                <div className="sticky bottom-4 z-20 flex justify-end">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
        <ImageCropperEasy
          imageFile={originalLogoFile}
          onSave={handleLogoCropSave}
          onCancel={handleLogoCropCancel}
          aspectRatio={1}
          maxWidth={500}
          maxHeight={500}
        />
      )}

      {showCoverCropper && originalCoverFile && (
        <ImageCropperEasy
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
