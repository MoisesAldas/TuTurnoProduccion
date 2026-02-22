'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  MapPin, Phone, Mail, Globe, Star, Clock, ArrowLeft,
  Calendar, Users, Sparkles, LogOut, ChevronLeft, ChevronRight, X,
  Scissors, Heart, Dumbbell, Activity, Building2, Info, CreditCard, Ban, RefreshCw, Bell
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import StarRating from '@/components/StarRating'
import Logo from '@/components/logo'
import BusinessSuspendedPage from '@/components/BusinessSuspendedPage'

// Lazy load map modal (includes Mapbox)
const LocationMapModal = dynamic(() => import('@/components/LocationMapModal'), {
  ssr: false,
  loading: () => <div className="text-center p-4">Cargando mapa...</div>
})

interface BusinessCategory {
  id: string
  name: string
  description?: string
  icon_url?: string
}

interface Business {
  id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  business_category_id?: string
  logo_url?: string
  cover_image_url?: string
  latitude?: number
  longitude?: number
  rating?: number
  total_reviews?: number
  is_active: boolean
  created_at: string
  business_categories?: BusinessCategory
  cancellation_policy_hours?: number
  cancellation_policy_text?: string
  allow_client_cancellation?: boolean
  allow_client_reschedule?: boolean
  min_booking_hours?: number
  max_booking_days?: number
  enable_reminders?: boolean
  reminder_hours_before?: number
  require_deposit?: boolean
  deposit_percentage?: number
}

interface BusinessHours {
  id: string
  business_id: string
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

interface Photo {
  id: string
  photo_url: string
  display_order: number
}

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
  is_active: boolean
  category?: string
}

interface Employee {
  id: string
  first_name: string
  last_name: string
  position?: string
  bio?: string
  avatar_url?: string
  is_active: boolean
}

interface Review {
  id: string
  rating: number
  comment?: string
  created_at: string
  business_reply?: string
  business_reply_at?: string
  client: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function BusinessProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [businessPhotos, setBusinessPhotos] = useState<Photo[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showPhotoGallery, setShowPhotoGallery] = useState(false)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [isSuspended, setIsSuspended] = useState(false)

  const params = useParams()
  const router = useRouter()
  const { authState, signOut } = useAuth()
  const businessId = params.id as string
  const supabase = createClient()

  // Mapeo de categorías a iconos (igual que marketplace)
  const getCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return Building2

    const iconMap: Record<string, any> = {
      'salón de belleza': Sparkles,
      'salon de belleza': Sparkles,
      'barbería': Scissors,
      'barberia': Scissors,
      'spa': Heart,
      'uñas': Sparkles,
      'masajes': Activity,
      'gimnasio': Dumbbell,
      'clínica': Activity,
      'clinica': Activity,
    }

    return iconMap[categoryName.toLowerCase()] || Building2
  }

  useEffect(() => {
    if (businessId) {
      fetchBusinessData()
    }
  }, [businessId])

  // Fix: Resetear scroll del body al montar el componente
  // Previene el bug donde el overflow:hidden queda pegado al navegar desde marketplace
  useEffect(() => {
    // Función para forzar scroll
    const forceScroll = () => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('padding-right')
    }

    // Ejecutar inmediatamente
    forceScroll()

    // Ejecutar varias veces con pequeños delays para sobrescribir cualquier cambio
    const timers = [
      setTimeout(forceScroll, 0),
      setTimeout(forceScroll, 50),
      setTimeout(forceScroll, 100),
      setTimeout(forceScroll, 200),
      setTimeout(forceScroll, 500)
    ]

    // Cleanup al desmontar
    return () => {
      timers.forEach(timer => clearTimeout(timer))
      forceScroll()
    }
  }, [])

  // Cache utilities
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
  
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null
      
      const { data, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(key)
        return null
      }
      
      return data
    } catch {
      return null
    }
  }
  
  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch {
      // Ignore cache errors
    }
  }

  const fetchBusinessData = async () => {
    try {
      setLoading(true)

      // Check cache first
      const cacheKey = `business_${businessId}`
      const cachedData = getCachedData(cacheKey)
      
      if (cachedData) {
        console.log('📦 [CACHE] Using cached data for business:', businessId)
        setBusiness(cachedData.business)
        setServices(cachedData.services || [])
        setEmployees(cachedData.employees || [])
        setReviews(cachedData.reviews || [])
        setBusinessPhotos(cachedData.photos || [])
        setBusinessHours(cachedData.hours || [])
        setLoading(false)
        return
      }

      console.log('[FETCH] Loading fresh data for business:', businessId)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('[AUTH DEBUG] Current user:', user?.id, user?.email)

      // Execute all queries in parallel with Promise.all
      const [
        businessRes,
        servicesRes,
        employeesRes,
        reviewsRes,
        photosRes,
        hoursRes
      ] = await Promise.all([
        // 1. Business details with category
        supabase
          .from('businesses')
          .select(`
            *,
            business_categories (
              id,
              name,
              description,
              icon_url
            )
          `)
          .eq('id', businessId)
          .eq('is_active', true)
          .single(),
        
        // 2. Services
        supabase
          .from('services')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('name'),
        
        // 3. Employees
        supabase
          .from('employees')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('first_name'),
        
        // 4. Reviews
        supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            business_reply,
            business_reply_at,
            client_id,
            users (
              first_name,
              last_name,
              email
            )
          `)
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        
        // 5. Photos
        supabase
          .from('business_photos')
          .select('id, photo_url, display_order')
          .eq('business_id', businessId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
        
        // 6. Business hours
        supabase
          .from('business_hours')
          .select('*')
          .eq('business_id', businessId)
          .order('day_of_week', { ascending: true })
      ])

      // Handle business data
      if (businessRes.error) {
        console.error('Error fetching business:', businessRes.error)
        router.push('/marketplace')
        return
      }

      const businessData = businessRes.data
      
      // NUEVO: Verificar si el negocio está suspendido
      if (businessData.is_suspended) {
        console.log('⛔ Business is suspended, showing suspended page')
        setIsSuspended(true)
        setLoading(false)
        return
      }
      
      setBusiness(businessData)

      // Check if current user is owner
      if (user && businessData.owner_id === user.id) {
        setIsOwner(true)
      }

      // Handle services
      const servicesData = servicesRes.data || []
      setServices(servicesData)

      // Handle employees
      const employeesData = employeesRes.data || []
      setEmployees(employeesData)

      // Handle reviews
      console.log('🔍 [REVIEWS DEBUG] Fetching reviews for business:', businessId)
      console.log('📊 [REVIEWS DEBUG] Raw reviews data:', reviewsRes.data)
      console.log('❌ [REVIEWS DEBUG] Reviews error:', reviewsRes.error)

      if (!reviewsRes.error && reviewsRes.data) {
        console.log('✅ [REVIEWS DEBUG] Total reviews fetched:', reviewsRes.data.length)

        // Transform and filter reviews
        const validReviews = (reviewsRes.data as any[])
          .filter(review => {
            const isValid = review.users !== null && review.users !== undefined
            if (!isValid) {
              console.log('⚠️ [REVIEWS DEBUG] Skipping review with null/undefined users:', review.id)
            }
            return isValid
          })
          .map(review => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            business_reply: review.business_reply,
            business_reply_at: review.business_reply_at,
            client: review.users
          }))

        console.log('✅ [REVIEWS DEBUG] Valid reviews after filter:', validReviews.length)
        console.log('📝 [REVIEWS DEBUG] Valid reviews data:', validReviews)

        setReviews(validReviews)
      } else {
        console.log('❌ [REVIEWS DEBUG] No reviews data or error occurred')
        setReviews([])
      }

      // Handle photos
      const photosData = photosRes.data || []
      setBusinessPhotos(photosData)

      // Handle hours
      const hoursData = hoursRes.data || []
      setBusinessHours(hoursData)

      // Cache the data
      setCachedData(cacheKey, {
        business: businessData,
        services: servicesData,
        employees: employeesData,
        reviews: reviewsRes.data || [],
        photos: photosData,
        hours: hoursData
      })

      console.log('✅ [CACHE] Data cached successfully')

    } catch (error) {
      console.error('Error fetching business data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (minutes: number) => {
    // Handle null, undefined, or invalid values
    if (!minutes || isNaN(minutes) || minutes <= 0) {
      return 'Duración no especificada'
    }

    if (minutes < 60) {
      return `${minutes} min`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDayName = (dayOfWeek: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[dayOfWeek]
  }

  const formatTime = (time: string) => {
    // Time comes as HH:MM:SS, we want HH:MM
    return time.substring(0, 5)
  }

  // Check if business is currently open based on business hours
  const getBusinessStatus = () => {
    if (businessHours.length === 0) return null

    const now = new Date()
    const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().substring(0, 5) // "HH:MM"

    const todayHours = businessHours.find(h => h.day_of_week === currentDay)

    if (!todayHours || todayHours.is_closed) {
      return { isOpen: false, message: 'Cerrado' }
    }

    const openTime = todayHours.open_time.substring(0, 5)
    const closeTime = todayHours.close_time.substring(0, 5)

    if (currentTime >= openTime && currentTime < closeTime) {
      return { isOpen: true, message: `Abierto · Cierra ${closeTime}` }
    } else if (currentTime < openTime) {
      return { isOpen: false, message: `Cerrado · Abre ${openTime}` }
    } else {
      return { isOpen: false, message: 'Cerrado' }
    }
  }

  const businessStatus = getBusinessStatus()

  const handleBookAppointment = (serviceId?: string) => {
    if (!authState?.user) {
      // Usuario no autenticado, redirigir a login con parámetro de retorno
      const returnUrl = serviceId
        ? `/business/${businessId}/book?service=${serviceId}`
        : `/business/${businessId}/book`
      router.push(`/auth/client/login?returnUrl=${encodeURIComponent(returnUrl)}`)
      return
    }

    // Usuario autenticado, ir directamente a la reserva
    const bookingUrl = serviceId
      ? `/business/${businessId}/book?service=${serviceId}`
      : `/business/${businessId}/book`
    router.push(bookingUrl)
  }

  const handleReplyToReview = async () => {
    if (!selectedReviewId || !replyText.trim()) return

    setSubmittingReply(true)
    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          business_reply: replyText.trim(),
          business_reply_at: new Date().toISOString()
        })
        .eq('id', selectedReviewId)

      if (error) throw error

      // Update local state
      setReviews(reviews.map(r =>
        r.id === selectedReviewId
          ? { ...r, business_reply: replyText.trim(), business_reply_at: new Date().toISOString() }
          : r
      ))

      setShowReplyModal(false)
      setReplyText('')
      setSelectedReviewId(null)
    } catch (error) {
      console.error('Error replying to review:', error)
      alert('Error al enviar la respuesta')
    } finally {
      setSubmittingReply(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-slate-200 dark:border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50 mb-2">Cargando información del negocio</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Preparando el perfil completo...</p>
        </div>
      </div>
    )
  }

  // NUEVO: Mostrar página de negocio suspendido
  if (isSuspended) {
    return <BusinessSuspendedPage />
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Negocio no encontrado</h1>
          <p className="text-gray-600 mb-4">El negocio que buscas no existe o no está disponible.</p>
          <Link href="/marketplace">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">Volver al Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }

  const CategoryIcon = getCategoryIcon(business.business_categories?.name)
  const categoryName = business.business_categories?.name || 'Sin categoría'

  // Get unique service categories (filter out null/undefined and convert to string)
  const uniqueCategories = Array.from(new Set(
    services
      .map(s => s.category)
      .filter((cat): cat is string => Boolean(cat))
  ))
  const serviceCategories = ['all', ...uniqueCategories]

  const filteredServices = selectedCategory === 'all'
    ? services
    : services.filter(s => s.category === selectedCategory)

  // Adaptive font size based on text length
  const getAdaptiveFontSize = (text: string, type: 'title' | 'small' = 'title') => {
    const len = text.length
    if (type === 'title') {
      if (len > 30) return 'text-2xl sm:text-3xl lg:text-4xl'
      if (len > 20) return 'text-3xl sm:text-4xl lg:text-5xl'
      return 'text-4xl sm:text-5xl lg:text-6xl'
    }
    // For smaller elements like addresses or category labels
    if (len > 50) return 'text-[10px] sm:text-xs'
    if (len > 30) return 'text-xs sm:text-sm'
    return 'text-sm'
  }

  const nameFontSize = getAdaptiveFontSize(business.name, 'title')
  const addressFontSize = business.address ? getAdaptiveFontSize(business.address, 'small') : 'text-sm'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Glassmorphism Premium */}
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-slate-200/40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 lg:py-2.5">
            {/* Left: Back Button + Logo */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 -ml-2 h-9 sm:h-10 px-2 sm:px-3 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all duration-300 group"
                onClick={() => window.location.href = '/marketplace'}
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest">Marketplace</span>
              </Button>
              <div className="hidden sm:block h-6 w-px bg-slate-200/60"></div>
              <Logo color="slate" size="sm" className="sm:hidden" />
              <Logo color="slate" size="md" className="hidden sm:block" />
            </div>

            {/* Right: Auth Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {authState?.user ? (
                <>
                  <Link href="/dashboard/client">
                    <Button 
                      size="sm" 
                      className="bg-slate-950 hover:bg-slate-900 text-white shadow-lg shadow-slate-950/20 rounded-xl px-5 h-10 text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    >
                      <span className="hidden sm:inline">Panel de Control</span>
                      <span className="sm:hidden text-[10px]">Panel</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={signOut}
                    className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/client/login">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-9 sm:h-10 px-2 sm:px-4 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all duration-300"
                    >
                      Ingresar
                    </Button>
                  </Link>
                  <Link href="/auth/client/register">
                    <Button
                      size="sm"
                      className="bg-slate-950 hover:bg-slate-900 text-white shadow-lg shadow-slate-950/20 rounded-xl px-3 sm:px-6 h-9 sm:h-10 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95"
                    >
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section - Title + Photos */}
          <div className="mb-8 sm:mb-12">
            {/* Hero Header Section - Asymmetric Premium Layout */}
            <div className="mb-10 lg:mb-14">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                {/* Left Side: Brand Identity */}
                <div className="relative pl-6 flex-1">
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-[0_0_12px_rgba(2,6,23,0.12)]" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] items-center uppercase tracking-[0.3em] font-black text-slate-400">
                      {categoryName}
                    </span>
                    <h1 className={`${nameFontSize} font-black tracking-tighter text-slate-950 leading-[1.1] py-1 break-words`}>
                      {business.name}
                    </h1>
                    {business.rating && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-xl shadow-sm">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(business.rating || 0)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          {business.total_reviews || 0} {business.total_reviews === 1 ? 'reseña' : 'reseñas'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Quick Info (Location & Status) */}
                <div className="flex flex-col lg:items-end lg:text-right gap-4 lg:min-w-[300px]">
                  {business.address && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Ubicación</span>
                      <button
                        onClick={() => business.latitude && business.longitude && setShowLocationModal(true)}
                        className={`${addressFontSize} font-bold text-slate-950 hover:text-slate-800 transition-colors underline decoration-slate-200 decoration-2 underline-offset-4 hover:decoration-slate-400 inline-block`}
                      >
                        {business.address}
                      </button>
                    </div>
                  )}

                  {businessStatus && (
                    <div className="flex flex-col lg:items-end gap-1">
                      <div
                        className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.15em] border-2 transition-all duration-300 ${
                          businessStatus.isOpen
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-lg shadow-emerald-500/10'
                            : 'bg-rose-50 text-rose-700 border-rose-100 shadow-lg shadow-rose-500/10'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${businessStatus.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {businessStatus.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photo Gallery Grid - Premium SaaS Style */}
            <div className="relative group/gallery">
              {(() => {
                const allPhotos = [
                  ...(business.cover_image_url ? [{ id: 'cover', photo_url: business.cover_image_url }] : []),
                  ...businessPhotos
                ]
                
                if (allPhotos.length === 0) {
                  return (
                    <div className="w-full h-[300px] sm:h-[400px] bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center gap-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sin fotos disponibles</p>
                    </div>
                  )
                }

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-4 sm:grid-rows-2 h-[350px] sm:h-[500px] lg:h-[600px] gap-3 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/40 bg-slate-100 border border-white">
                      {/* Featured Photo - Left side (2/4 columns, full height) */}
                      <div
                        className="sm:col-span-2 sm:row-span-2 relative overflow-hidden cursor-pointer group bg-slate-200 animate-pulse"
                        onClick={() => {
                          setSelectedPhotoIndex(0)
                          setShowPhotoGallery(true)
                        }}
                      >
                        <img
                          src={allPhotos[0]?.photo_url}
                          alt={`${business.name} - Principal`}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          onLoad={(e) => {
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.classList.remove('animate-pulse', 'bg-slate-200')
                              parent.classList.add('bg-slate-100')
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/5 transition-colors duration-500" />
                      </div>

                      {/* Small Photos - Right side (2x2 grid) */}
                      {[1, 2, 3, 4].map((index) => {
                        const photo = allPhotos[index]
                        const isLast = index === 4
                        const hasMore = allPhotos.length > 5

                        return (
                          <div
                            key={index}
                            className={`relative overflow-hidden cursor-pointer bg-slate-200 ${photo ? 'animate-pulse' : ''} group`}
                            onClick={() => {
                              setSelectedPhotoIndex(photo ? index : 0)
                              setShowPhotoGallery(true)
                            }}
                          >
                            {photo ? (
                              <>
                                <img
                                  src={photo.photo_url}
                                  alt={`${business.name} - Foto ${index + 1}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                  onLoad={(e) => {
                                    const container = e.currentTarget.closest('.group')
                                    if (container) {
                                      container.classList.remove('animate-pulse', 'bg-slate-200')
                                      container.classList.add('bg-slate-100')
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/10 transition-colors duration-500" />

                                {isLast && hasMore && (
                                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:bg-slate-950/70">
                                    <div className="text-white text-center">
                                      <Sparkles className="w-6 h-6 mx-auto mb-1 text-amber-400" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Ver todas</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <Sparkles className="w-8 h-8 opacity-20" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* "Ver todas las fotos" button - Desktop only */}
                    {allPhotos.length > 1 && (
                      <button
                        onClick={() => {
                          setSelectedPhotoIndex(0)
                          setShowPhotoGallery(true)
                        }}
                        className="hidden sm:flex absolute bottom-8 right-8 bg-white/90 backdrop-blur-md hover:bg-slate-950 hover:text-white text-slate-950 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-950/10 hover:shadow-slate-950/20 hover:scale-105 active:scale-95 transition-all duration-300 items-center gap-2.5 border border-white/50"
                      >
                        <Sparkles className="w-4 h-4" />
                        Todas las fotos ({allPhotos.length})
                      </button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          {/* 2-Column Layout: Content + Sidebar */}
          {/* Mobile: Content first, then sidebar below */}
          {/* Desktop: Content (2/3) + Sidebar (1/3) sticky */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-12">
            {/* Main Content - 2/3 width on desktop */}
            <div className="lg:col-span-2 space-y-8 sm:space-y-12">

              {/* Services Section - Premium Grid */}
              <section id="services">
                <div className="relative pl-6 mb-8 sm:mb-10">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-[0_0_15px_rgba(2,6,23,0.15)]" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Oferta Profesional</span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Servicios Disponibles</h2>
                  </div>
                </div>

                {services.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-[2.5rem] border border-slate-100/50 border-dashed">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <Sparkles className="w-8 h-8 text-slate-200" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Sin servicios</h3>
                    <p className="text-sm text-slate-400 font-medium">Este negocio aún no ha publicado servicios.</p>
                  </div>
                ) : (
                  <>
                    {/* Category Tabs - Refined */}
                    {serviceCategories.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        {serviceCategories.map((category, index) => (
                          <button
                            key={`category-${index}-${category}`}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-6 py-2.5 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                              selectedCategory === category
                                ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20'
                                : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                            }`}
                          >
                            {category === 'all' ? 'Ver Todos' : category}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Services List - Premium Cards */}
                    <div className="grid grid-cols-1 gap-4">
                      {filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className="group p-5 sm:p-6 bg-white border border-slate-100/40 rounded-[2rem] shadow-md hover:shadow-2xl hover:shadow-slate-200/60 hover:-translate-y-1.5 transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
                        >
                          {/* Service Info */}
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-col gap-1">
                              {service.category && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  {service.category}
                                </span>
                              )}
                              <h3 className="font-black text-slate-900 text-lg sm:text-xl leading-tight group-hover:text-slate-950 transition-colors">
                                {service.name}
                              </h3>
                            </div>
                            
                            {service.description && (
                              <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 max-w-2xl">
                                {service.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-4 pt-1">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl">
                                <Clock className="w-3.5 h-3.5 text-slate-950" />
                                <span className="text-[11px] font-black uppercase tracking-tight text-slate-600">
                                  {formatDuration(service.duration_minutes)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Price & Action */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-4 sm:min-w-[140px] pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                            <div className="flex flex-col sm:items-end">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Precio</span>
                              <span className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tighter">
                                {formatPrice(service.price)}
                              </span>
                            </div>
                            
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Empty state for filtered category */}
                    {filteredServices.length === 0 && (
                      <div className="text-center py-20 bg-slate-50/30 rounded-[2.5rem] border border-slate-100/50">
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No hay servicios en esta categoría</p>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Team Section - Premium Carousel */}
              <section id="team">
                <div className="flex flex-col gap-1 mb-8 sm:mb-10 pl-4 border-l-4 border-slate-950">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Nuestro Talento</span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Conoce al Equipo</h2>
                </div>

                {employees.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50/50 rounded-[2.5rem] border border-slate-100/50">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Equipo no disponible</h3>
                    <p className="text-sm text-slate-400 font-medium">Este negocio aún no ha presentado a su equipo.</p>
                  </div>
                ) : (
                  <>
                    {/* Horizontal scroll with snap points - Refined */}
                    <div className="flex gap-8 sm:gap-10 overflow-x-auto pt-4 pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-hide overflow-y-visible">
                      {employees.map((employee) => (
                        <div
                          key={employee.id}
                          className="group flex flex-col items-center flex-shrink-0 snap-start cursor-pointer transition-transform duration-300 hover:-translate-y-2"
                          style={{ minWidth: '130px' }}
                        >
                          {/* Avatar with Premium Styling */}
                          <div className="relative mb-4">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] overflow-hidden bg-slate-100 border-4 border-white shadow-xl shadow-slate-200/60 group-hover:shadow-slate-300 transition-all duration-500 ring-1 ring-slate-100/50">
                              {employee.avatar_url ? (
                                <img
                                  src={employee.avatar_url}
                                  alt={`${employee.first_name} ${employee.last_name}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-500"
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                                  <Users className="w-10 h-10 text-slate-200" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Name and Position */}
                          <div className="text-center space-y-1">
                            <p className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-tight group-hover:text-slate-950 transition-colors">
                              {employee.first_name}
                            </p>
                            {employee.position && (
                              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 group-hover:text-slate-500 transition-colors">
                                {employee.position}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Scroll indicator for mobile - Sleeker */}
                    {employees.length > 3 && (
                      <div className="flex items-center justify-center gap-2 mt-2 sm:hidden">
                        <div className="w-8 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className="w-1/2 h-full bg-slate-950 animate-pulse" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Desliza</span>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Reviews Section - Premium Feedback */}
              <section id="reviews" className="scroll-mt-24">
                <div className="relative pl-6 mb-8 sm:mb-10">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-[0_0_15px_rgba(2,6,23,0.15)]" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] items-center uppercase tracking-[0.2em] font-extrabold text-slate-400 border-slate-200">
                      Feedback de Clientes
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Reseñas y Experiencias</h2>
                  </div>
                </div>

                {/* Reviews Summary Card - Glassmorphism style */}
                {reviews.length > 0 && (
                  <div className="mb-10 bg-slate-50 border border-slate-100/50 rounded-[2.5rem] p-6 sm:p-10 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/20 rounded-full -translate-y-12 translate-x-12 blur-3xl opacity-50" />
                    
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8 md:gap-12">
                      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Calificación General</h3>
                        <div className="flex items-center gap-6">
                          <div className="text-6xl sm:text-7xl font-black text-slate-950 tracking-tighter">
                            {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                          </div>
                          <div className="flex flex-col gap-1">
                            <StarRating
                              rating={reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length}
                              readonly
                              size="lg"
                            />
                            <p className="text-[11px] font-black uppercase tracking-tight text-slate-500">
                              Basado en {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Rating Distribution - Clean Vertical Bars */}
                      <div className="flex-1 max-w-md w-full">
                        <div className="space-y-3">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = reviews.filter(r => r.rating === stars).length
                            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                            return (
                              <div key={stars} className="flex items-center gap-4 group">
                                <div className="flex items-center gap-1 w-10">
                                  <span className="text-[11px] font-black text-slate-950">{stars}</span>
                                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                </div>
                                <div className="flex-1 h-3 bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner">
                                  <div
                                    className="h-full bg-slate-950 transition-all duration-1000 group-hover:bg-slate-800"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="w-8 text-[11px] font-black text-slate-400 text-right">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Individual Reviews - Premium Cards */}
                <div className="grid grid-cols-1 gap-6">
                  {reviews.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-slate-100/50 border-dashed">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Star className="w-10 h-10 text-slate-200" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">Aún no hay reseñas</h3>
                      <p className="text-sm text-slate-400 font-medium mb-8 max-w-xs mx-auto">Comparte tu opinión con la comunidad después de tu primera cita.</p>
                      <Button
                        onClick={() => handleBookAppointment()}
                        className="bg-slate-950 hover:bg-slate-900 text-white rounded-xl px-8 h-12 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-950/20"
                      >
                        Agendar Primera Cita
                      </Button>
                    </div>
                  ) : (
                    reviews.map((review) => {
                      if (!review.client) return null

                      return (
                        <div key={review.id} className="group p-6 sm:p-8 bg-white border border-slate-100/50 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500">
                          <div className="flex items-start gap-6">
                            {/* Client Avatar - Initials with gradient */}
                            <div className="w-14 h-14 bg-gradient-to-br from-slate-800 to-slate-950 rounded-2xl flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-lg shadow-slate-950/20">
                              {review.client.first_name.charAt(0).toUpperCase()}
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div>
                                  <h4 className="font-black text-slate-950 text-base sm:text-lg tracking-tight">
                                    {review.client.first_name} {review.client.last_name}
                                  </h4>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {formatDate(review.created_at)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                  <StarRating rating={review.rating} readonly size="sm" />
                                </div>
                              </div>

                              {review.comment && (
                                <p className="text-slate-600 font-medium leading-relaxed text-sm sm:text-base">
                                  {review.comment}
                                </p>
                              )}

                              {/* Business Reply - Sleek Subcard */}
                              {review.business_reply && (
                                <div className="mt-4 pl-4 border-l-2 border-slate-200">
                                  <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Respuesta del negocio</p>
                                    <p className="text-sm text-slate-600 font-medium italic leading-relaxed">
                                      "{review.business_reply}"
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Reply Button (only for owner) */}
                              {isOwner && !review.business_reply && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-950 hover:bg-slate-50 rounded-xl"
                                  onClick={() => {
                                    setSelectedReviewId(review.id)
                                    setShowReplyModal(true)
                                  }}
                                >
                                  Responder
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

              {/* About Section - Premium Typography */}
              <section id="about">
                <div className="flex flex-col gap-1 mb-6 sm:mb-8 pl-4 border-l-4 border-slate-950">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Historia y Misión</span>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Acerca de {business.name}</h2>
                </div>
                <div className="bg-slate-50/50 p-6 sm:p-10 rounded-[2.5rem] border border-slate-100/50">
                  {business.description ? (
                    <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-4xl">{business.description}</p>
                  ) : (
                    <p className="text-sm sm:text-base text-slate-400 italic font-medium">No hay información adicional disponible.</p>
                  )}
                </div>
              </section>

              {/* Map Section - Premium Frame */}
              {business.latitude && business.longitude && (
                <section id="location">
                  <div className="flex flex-col gap-1 mb-6 sm:mb-8 pl-4 border-l-4 border-slate-950">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Encuéntranos</span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Ubicación Estratégica</h2>
                  </div>
                  
                  <div className="relative group/map">
                    <div
                      className="rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/40 bg-slate-100"
                      style={{ height: '400px' }}
                    >
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        src={`https://www.google.com/maps?q=${business.latitude},${business.longitude}&hl=es&z=15&output=embed`}
                        className="grayscale-[0.2] contrast-105 group-hover/map:grayscale-0 transition-all duration-700"
                      />
                    </div>
                    
                    {business.address && (
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-3xl border border-white/50 shadow-xl flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-slate-950 flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-950/20">
                            <MapPin className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Dirección Exacta</p>
                            <p className="text-sm font-bold text-slate-900">{business.address}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Business Information Section - Detailed Specs */}
              <section id="info">
                <div className="relative pl-6 mb-8 sm:mb-10">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-slate-800 to-slate-950 rounded-full shadow-[0_0_15px_rgba(2,6,23,0.15)]" />
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Detalles del Servicio</span>
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Información del Negocio</h2>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Business Hours - Premium Card */}
                  {businessHours.length > 0 && (
                    <div className="bg-white border border-slate-100/40 p-6 sm:p-8 rounded-[2rem] shadow-md hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-500 group">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-slate-950 group-hover:border-slate-950 transition-all duration-500">
                          <Clock className="w-6 h-6 text-slate-950 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="font-black text-slate-950 text-lg tracking-tight">Horarios de Atención</h3>
                      </div>
                      <div className="space-y-3">
                        {businessHours.map((hours) => (
                          <div key={hours.id} className="flex justify-between items-center text-sm py-2 border-b border-slate-50 last:border-0">
                            <span className="text-slate-500 font-black uppercase tracking-widest text-[10px]">{getDayName(hours.day_of_week)}</span>
                            {hours.is_closed ? (
                              <span className="text-rose-500 font-bold text-[11px] uppercase tracking-wider bg-rose-50 px-2 py-0.5 rounded-lg">Cerrado</span>
                            ) : (
                              <span className="text-slate-950 font-black tracking-tight">
                                {formatTime(hours.open_time)} — {formatTime(hours.close_time)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Policies & Restrictions - Combined Premium Card */}
                  <div className="flex flex-col gap-6">
                    {/* Cancellation Policy */}
                    {(business.cancellation_policy_text || business.cancellation_policy_hours) && (
                      <div className="bg-slate-50/50 border border-slate-100/50 p-6 rounded-[2rem] shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                            <Ban className="w-5 h-5 text-slate-950" />
                          </div>
                          <h3 className="font-black text-slate-950 text-base tracking-tight">Política de Cancelación</h3>
                        </div>
                        {business.cancellation_policy_hours && (
                          <p className="text-xs font-black uppercase tracking-widest text-rose-500 mb-2">
                             Antelación requerida: {business.cancellation_policy_hours} horas
                          </p>
                        )}
                        {business.cancellation_policy_text && (
                          <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">
                            {business.cancellation_policy_text}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {business.allow_client_cancellation && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-tight text-emerald-600">
                              <RefreshCw className="w-3 h-3" />
                              Cancelación permitida
                            </div>
                          )}
                          {!business.allow_client_cancellation && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-tight text-rose-500">
                              <Ban className="w-3 h-3" />
                              Cancelación no permitida
                            </div>
                          )}
                          {business.allow_client_reschedule && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-tight text-emerald-600">
                              <Calendar className="w-3 h-3" />
                              Reagendamiento permitido
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Booking Conditions */}
                    {(business.min_booking_hours || business.max_booking_days || business.require_deposit) && (
                      <div className="bg-white border border-slate-100/40 p-6 rounded-[2rem] shadow-md flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <Info className="w-5 h-5 text-slate-950" />
                          </div>
                          <h3 className="font-black text-slate-950 text-base tracking-tight">Condiciones</h3>
                        </div>
                        <div className="space-y-3">
                          {business.min_booking_hours && business.min_booking_hours > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600">
                                Anticipación: <span className="text-slate-950 font-black">{business.min_booking_hours} h</span>
                              </span>
                            </div>
                          )}
                          {business.max_booking_days && business.max_booking_days > 0 && (
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600">
                                Máximo futuro: <span className="text-slate-950 font-black">{business.max_booking_days} días</span>
                              </span>
                            </div>
                          )}
                          {business.require_deposit && business.deposit_percentage && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-100/50">
                              <CreditCard className="w-4 h-4 text-emerald-600" />
                              <span className="text-[11px] font-bold text-emerald-700">
                                Depósito: <span className="font-black">{business.deposit_percentage}%</span> requerido
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Contact Info Card - Added for completeness */}
                    <div className="bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-slate-950" />
                        </div>
                        <h3 className="font-black text-slate-950 text-base tracking-tight">Información de Contacto</h3>
                      </div>
                      <div className="space-y-4">
                        {business.address && (
                          <div className="flex items-start gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Dir:</span>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed">{business.address}</p>
                          </div>
                        )}
                        {business.phone && (
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tel:</span>
                             <p className="text-sm text-slate-950 font-black">{business.phone}</p>
                          </div>
                        )}
                        {business.email && (
                          <div className="flex items-center gap-3">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email:</span>
                             <p className="text-sm text-slate-950 font-black">{business.email}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reminders - Clean Card */}
                    {business.enable_reminders && (
                      <div className="bg-slate-50/50 border border-slate-100/50 p-6 rounded-[2rem] shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-slate-950" />
                          </div>
                          <h3 className="font-black text-slate-950 text-base tracking-tight">Otros servicios</h3>
                        </div>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          Recibirás un recordatorio <span className="text-slate-950 font-black">{business.reminder_hours_before} horas</span> antes de tu cita.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

            </div>

            {/* Sidebar - Sticky on desktop, bottom on mobile */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-6">
                {/* Main CTA Card - Premium Elevate */}
                <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-slate-200/50 hover:shadow-slate-300 transition-all duration-500 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
                  
                  <div className="relative">
                    <Button
                      size="lg"
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white font-black uppercase tracking-[0.15em] shadow-lg shadow-slate-950/20 rounded-2xl h-14 transition-all duration-300 hover:scale-[1.02] active:scale-95 text-[11px]"
                      onClick={() => handleBookAppointment()}
                    >
                      <Calendar className="w-5 h-5 mr-3" />
                      Reservar Ahora
                    </Button>

                    <div className="mt-8 space-y-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto Directo</span>
                        <div className="h-0.5 w-8 bg-slate-950 rounded-full mb-3" />
                      </div>

                      {business.phone && (
                        <a
                          href={`tel:${business.phone}`}
                          className="group flex items-center gap-4 transition-all duration-300"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-slate-950 group-hover:border-slate-950 transition-all duration-300">
                            <Phone className="w-4.5 h-4.5 text-slate-950 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Llámanos</span>
                            <span className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors uppercase tracking-tight">{business.phone}</span>
                          </div>
                        </a>
                      )}

                      {business.email && (
                        <a
                          href={`mailto:${business.email}`}
                          className="group flex items-center gap-4 transition-all duration-300"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-slate-950 group-hover:border-slate-950 transition-all duration-300">
                            <Mail className="w-4.5 h-4.5 text-slate-950 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Escríbenos</span>
                            <span className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors truncate max-w-[150px]">{business.email}</span>
                          </div>
                        </a>
                      )}

                      {business.latitude && business.longitude && (
                        <button
                          onClick={() => setShowLocationModal(true)}
                          className="group flex items-center gap-4 transition-all duration-300 w-full text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-slate-950 group-hover:border-slate-950 transition-all duration-300">
                            <MapPin className="w-4.5 h-4.5 text-slate-950 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ubicación</span>
                            <span className="text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors">Cómo llegar</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Business Stats Card - Hidden on mobile */}
                <div className="bg-slate-50/50 border border-slate-100/50 rounded-[2rem] p-6 hidden lg:block">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 border-b border-slate-200 pb-2">Estadísticas Rápidas</h3>
                  <div className="grid grid-cols-1 gap-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Especialidad</span>
                      <span className="bg-white px-3 py-1 rounded-lg border border-slate-100 text-[11px] font-black text-slate-950 uppercase tracking-tighter">
                        {categoryName}
                      </span>
                    </div>
                    {business.rating && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Experiencia</span>
                        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-100">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-[11px] font-black text-slate-950">{business.rating}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Servicios</span>
                      <span className="text-sm font-black text-slate-950">{services.length}</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA Bar - Premium Glassmorphism */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-slate-200/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] z-50 transition-all duration-300 transform translate-y-0 group-hover:translate-y-0">
        <div className="max-w-7xl mx-auto px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-6">
            {/* Price Info */}
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desde</span>
              <div className="flex flex-wrap items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-950 tracking-tighter">
                  {services.length > 0 
                    ? formatPrice(Math.min(...services.map(s => s.price)))
                    : 'N/A'}
                </span>
                {business.rating && (
                  <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded-lg border border-slate-100">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span className="text-[10px] font-black text-slate-900">{business.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Premium CTA Button */}
            <Button
              size="lg"
              className="flex-1 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-black uppercase tracking-[0.1em] shadow-xl shadow-slate-950/20 rounded-2xl h-14 text-[11px] transition-all duration-300"
              onClick={() => handleBookAppointment()}
            >
              <Calendar className="w-5 h-5 mr-2" />
              Reservar
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:hidden h-20" />
    </main>

      {/* Location Map Modal */}
      {business.latitude && business.longitude && (
        <LocationMapModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          latitude={business.latitude}
          longitude={business.longitude}
          businessName={business.name}
          address={business.address || ''}
        />
      )}

      {/* Reply to Review Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="max-w-lg">
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Responder a la reseña</h2>
              <p className="text-sm text-gray-600 mt-1">Tu respuesta será visible para todos los usuarios</p>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              disabled={submittingReply}
            />
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplyModal(false)
                  setReplyText('')
                  setSelectedReviewId(null)
                }}
                disabled={submittingReply}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReplyToReview}
                disabled={submittingReply || !replyText.trim()}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
              >
                {submittingReply ? 'Enviando...' : 'Enviar respuesta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery Modal - Premium Design */}
      <Dialog open={showPhotoGallery} onOpenChange={setShowPhotoGallery}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] sm:max-w-[95vw] sm:w-[95vw] sm:h-[95vh] p-0 gap-0 overflow-hidden bg-black/95 backdrop-blur-2xl border-none sm:rounded-2xl">
          {/* Close Button - Frosted glass style */}
          <button
            onClick={() => setShowPhotoGallery(false)}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-11 h-11 sm:w-10 sm:h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 active:bg-black/80 backdrop-blur-md border border-white/10 hover:border-white/20 rounded-full text-white/80 hover:text-white transition-all duration-200 ease-out hover:scale-105 active:scale-95"
            aria-label="Cerrar galería"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Photo Counter - Centered pill style */}
          <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-sm font-medium select-none">
            <span className="text-white">{selectedPhotoIndex + 1}</span>
            <span className="text-white/50 mx-1.5">/</span>
            <span className="text-white/70">{(business.cover_image_url ? 1 : 0) + businessPhotos.length}</span>
          </div>

          {/* Main Photo Container */}
          <div
            className="relative w-full h-full flex items-center justify-center px-2 pt-16 pb-28 sm:px-16 sm:pt-16 sm:pb-32"
            onTouchStart={(e) => {
              setTouchEnd(null)
              setTouchStart(e.targetTouches[0].clientX)
            }}
            onTouchMove={(e) => {
              setTouchEnd(e.targetTouches[0].clientX)
            }}
            onTouchEnd={() => {
              if (!touchStart || !touchEnd) return
              const distance = touchStart - touchEnd
              const minSwipeDistance = 50
              const totalPhotos = (business.cover_image_url ? 1 : 0) + businessPhotos.length

              if (distance > minSwipeDistance) {
                // Swipe left - next photo
                setSelectedPhotoIndex((prev) => (prev === totalPhotos - 1 ? 0 : prev + 1))
              } else if (distance < -minSwipeDistance) {
                // Swipe right - prev photo
                setSelectedPhotoIndex((prev) => (prev === 0 ? totalPhotos - 1 : prev - 1))
              }
            }}
          >
            {(() => {
              const allPhotos = [
                ...(business.cover_image_url ? [{ id: 'cover', photo_url: business.cover_image_url }] : []),
                ...businessPhotos
              ]
              const currentPhoto = allPhotos[selectedPhotoIndex]

              return currentPhoto ? (
                <img
                  key={`photo-${selectedPhotoIndex}`}
                  src={currentPhoto.photo_url}
                  alt={`${business.name} - Foto ${selectedPhotoIndex + 1}`}
                  loading="eager"
                  className="max-w-full max-h-full sm:max-h-[70vh] object-contain rounded-xl shadow-2xl shadow-black/50 select-none transition-opacity duration-300"
                  draggable={false}
                />
              ) : null
            })()}

            {/* Navigation Arrows - Subtle style, hidden on mobile */}
            {((business.cover_image_url ? 1 : 0) + businessPhotos.length) > 1 && (
              <>
                <button
                  onClick={() => {
                    const totalPhotos = (business.cover_image_url ? 1 : 0) + businessPhotos.length
                    setSelectedPhotoIndex((prev) => (prev === 0 ? totalPhotos - 1 : prev - 1))
                  }}
                  className="hidden sm:flex absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full border border-white/10 text-white/80 hover:text-white transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => {
                    const totalPhotos = (business.cover_image_url ? 1 : 0) + businessPhotos.length
                    setSelectedPhotoIndex((prev) => (prev === totalPhotos - 1 ? 0 : prev + 1))
                  }}
                  className="hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full border border-white/10 text-white/80 hover:text-white transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                  aria-label="Siguiente foto"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails - Frosted glass bottom bar */}
          {((business.cover_image_url ? 1 : 0) + businessPhotos.length) > 1 && (
            <div className="absolute bottom-0 left-0 right-0 z-30 bg-black/60 backdrop-blur-xl px-4 py-4 sm:px-8 sm:py-5">
              <div className="flex gap-2 sm:gap-3 overflow-x-auto justify-start sm:justify-center scrollbar-hide snap-x snap-mandatory">
                {[
                  ...(business.cover_image_url ? [{ id: 'cover', photo_url: business.cover_image_url }] : []),
                  ...businessPhotos
                ].map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoIndex(index)}
                    className={`flex-shrink-0 snap-center w-14 h-14 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden transition-all duration-300 ease-out focus:outline-none ${
                      index === selectedPhotoIndex
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black/80 scale-110 opacity-100 shadow-lg shadow-black/30'
                        : 'ring-1 ring-white/20 opacity-50 hover:opacity-80 hover:ring-white/40 hover:scale-105 active:scale-100'
                    }`}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`Miniatura ${index + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Mobile swipe hint */}
              <p className="sm:hidden text-center text-white/40 text-xs mt-3">
                Desliza en la imagen para navegar
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
