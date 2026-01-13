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

      console.log('🔄 [FETCH] Loading fresh data for business:', businessId)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 [AUTH DEBUG] Current user:', user?.id, user?.email)

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Clean & Minimal - Responsive */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Left: Back Button + Logo */}
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 sm:gap-2 -ml-2 sm:ml-0 min-h-[44px] min-w-[44px] hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
                onClick={() => window.location.href = '/marketplace'}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Marketplace</span>
              </Button>
              <div className="hidden sm:block h-6 w-px bg-gray-200"></div>
              <Logo color="slate" size="md" />
            </div>

            {/* Right: Auth Actions - Responsive */}
            <div className="flex items-center gap-1 sm:gap-2">
              {authState?.user ? (
                <>
                  <Link href="/dashboard/client">
                    <Button 
                      size="sm" 
                      className="text-xs sm:text-sm bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 px-3 py-2"
                    >
                      <span className="hidden sm:inline">Mi Dashboard</span>
                      <span className="sm:hidden">Dashboard</span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 px-2 py-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline ml-1.5 text-xs">Cerrar Sesión</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/client/login">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-sm min-h-[44px] text-gray-700 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200"
                    >
                      <span className="hidden sm:inline">Iniciar Sesión</span>
                      <span className="sm:hidden">Ingresar</span>
                    </Button>
                  </Link>
                  <Link href="/auth/client/register">
                    <Button
                      size="sm"
                      className="bg-slate-900 hover:bg-slate-800 text-white text-sm min-h-[44px] shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <span className="hidden sm:inline">Registrarse</span>
                      <span className="sm:hidden">Registro</span>
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
            {/* Title and Rating - Responsive */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
                {business.name}
              </h1>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm mb-2">
                {business.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900 text-base">{business.rating}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(business.rating || 0)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-gray-500">({business.total_reviews || 0} {business.total_reviews === 1 ? 'reseña' : 'reseñas'})</span>
                    </div>
                    <span className="hidden sm:inline text-gray-400">•</span>
                  </div>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {categoryName}
                </span>
                {businessStatus && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${
                      businessStatus.isOpen
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${businessStatus.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                    {businessStatus.message}
                  </span>
                )}
              </div>

              {business.address && (
                <button
                  onClick={() => business.latitude && business.longitude && setShowLocationModal(true)}
                  className="text-gray-600 hover:text-slate-900 flex items-center gap-2 text-sm sm:text-base group transition-colors text-left"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="line-clamp-1">{business.address}</span>
                </button>
              )}
            </div>

            {/* Photo Gallery Grid - Airbnb Style (5 photos) */}
            <div className="relative rounded-lg sm:rounded-xl overflow-hidden">
              {(() => {
                const allPhotos = [
                  ...(business.cover_image_url ? [{ id: 'cover', photo_url: business.cover_image_url }] : []),
                  ...businessPhotos
                ]
                const hasPhotos = allPhotos.length > 0

                if (!hasPhotos) {
                  // Empty state - no photos
                  return (
                    <div className="bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden aspect-[16/9] sm:aspect-[21/9] flex items-center justify-center">
                      <div className="text-center">
                        <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No hay fotos disponibles</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <>
                    {/* Mobile: Single photo with swipe indicator */}
                    <div className="block sm:hidden">
                      <div
                        className="relative cursor-pointer aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse"
                        onClick={() => {
                          setSelectedPhotoIndex(0)
                          setShowPhotoGallery(true)
                        }}
                      >
                        <img
                          src={allPhotos[0].photo_url}
                          alt={business.name}
                          loading="lazy"
                          className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                          onLoad={(e) => {
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.classList.remove('animate-pulse', 'bg-gradient-to-br', 'from-gray-100', 'to-gray-200')
                              parent.classList.add('bg-gray-100')
                            }
                          }}
                        />
                        {/* Photo counter overlay */}
                        {allPhotos.length > 1 && (
                          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {allPhotos.length} {allPhotos.length === 1 ? 'foto' : 'fotos'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tablet & Desktop: Airbnb-style grid (1 large + 4 small) */}
                    <div className="hidden sm:grid sm:grid-cols-4 gap-2 h-[400px] lg:h-[500px]">
                      {/* Large Photo - Left side (2 rows, 2 columns) */}
                      <div
                        className="col-span-2 row-span-2 relative rounded-l-xl overflow-hidden cursor-pointer bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse group"
                        onClick={() => {
                          setSelectedPhotoIndex(0)
                          setShowPhotoGallery(true)
                        }}
                      >
                        <img
                          src={allPhotos[0].photo_url}
                          alt={`${business.name} - Foto principal`}
                          loading="eager"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onLoad={(e) => {
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.classList.remove('animate-pulse', 'bg-gradient-to-br', 'from-gray-100', 'to-gray-200')
                              parent.classList.add('bg-gray-100')
                            }
                          }}
                        />
                        {/* Subtle overlay on hover */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                      </div>

                      {/* Small Photos - Right side (2x2 grid) */}
                      {[1, 2, 3, 4].map((index) => {
                        const photo = allPhotos[index]
                        const isLast = index === 4
                        const hasMore = allPhotos.length > 5

                        // Apply rounded corners conditionally
                        const roundedClass =
                          index === 2 ? 'rounded-tr-xl' :  // Top-right
                          index === 4 ? 'rounded-br-xl' :  // Bottom-right
                          ''

                        return (
                          <div
                            key={index}
                            className={`relative overflow-hidden cursor-pointer bg-gradient-to-br from-gray-100 to-gray-200 ${photo ? 'animate-pulse' : ''} group ${roundedClass}`}
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
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  onLoad={(e) => {
                                    // The parent is the <> fragment's parent div (the grid cell)
                                    const container = e.currentTarget.closest('.group')
                                    if (container) {
                                      container.classList.remove('animate-pulse', 'bg-gradient-to-br', 'from-gray-100', 'to-gray-200')
                                      container.classList.add('bg-gray-100')
                                    }
                                  }}
                                />
                                {/* Subtle overlay on hover */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

                                {/* "Ver todas" button on last photo if more photos exist */}
                                {isLast && hasMore && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="text-white text-center">
                                      <Sparkles className="w-6 h-6 mx-auto mb-1" />
                                      <span className="text-sm font-semibold">Ver todas</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Sparkles className="w-8 h-8" />
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
                        className="hidden sm:flex absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm hover:bg-white text-gray-900 px-4 py-2.5 rounded-lg font-medium text-sm shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 transition-all duration-200 items-center gap-2 border border-gray-200/80"
                      >
                        <Sparkles className="w-4 h-4" />
                        Ver todas las fotos ({allPhotos.length})
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

              {/* Services Section - CTA to Booking Page */}
              <section id="services">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Servicios</h2>

                {services.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-lg sm:rounded-xl">
                    <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      No hay servicios disponibles
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 px-4">
                      Este negocio aún no ha publicado sus servicios.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Category Tabs - Horizontal scroll on mobile */}
                    {serviceCategories.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-gray-200 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                        {serviceCategories.map((category, index) => (
                          <button
                            key={`category-${index}-${category}`}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                              selectedCategory === category
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={{ minWidth: '44px', minHeight: '44px' }} // Touch target size
                          >
                            {category === 'all' ? 'Todos' : category}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Services List - Cards stack on mobile */}
                    <div className="space-y-3 sm:space-y-4">
                      {filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className="p-4 sm:p-5 bg-white border border-gray-200 rounded-xl hover:shadow-md hover:border-slate-300 transition-all duration-200"
                        >
                          {/* Service Info */}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2 text-base sm:text-lg">
                              {service.name}
                            </h3>
                            {service.description && (
                              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                {service.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                              <span className="text-lg sm:text-xl font-bold text-slate-900">
                                {formatPrice(service.price)}
                              </span>
                              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                <span>{formatDuration(service.duration_minutes)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Empty state for filtered category */}
                    {filteredServices.length === 0 && (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                        <p className="text-sm sm:text-base">No hay servicios en esta categoría.</p>
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Team Section */}
              <section id="team">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Equipo</h2>

                {employees.length === 0 ? (
                  <div className="text-center py-12 sm:py-16 bg-gray-50 rounded-lg sm:rounded-xl">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                      No hay información del equipo
                    </h3>
                    <p className="text-sm sm:text-base text-gray-500 px-4">
                      Este negocio aún no ha publicado información sobre su equipo.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Horizontal scroll with snap points on mobile */}
                    <div className="flex gap-4 sm:gap-6 overflow-x-auto pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-hide overflow-y-visible">
                      {employees.map((employee) => (
                        <div
                          key={employee.id}
                          className="group flex flex-col items-center flex-shrink-0 snap-start cursor-pointer"
                          style={{ minWidth: '100px' }} // Consistent card width
                        >
                          {/* Avatar with gradient border */}
                          <div className="relative mb-3">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ring-2 ring-slate-100 group-hover:ring-slate-400 group-hover:scale-105 transition-all duration-200">
                              {employee.avatar_url ? (
                                <img
                                  src={employee.avatar_url}
                                  alt={`${employee.first_name} ${employee.last_name}`}
                                  loading="lazy"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Name and Position */}
                          <p className="font-medium text-gray-900 text-sm sm:text-base text-center max-w-[100px] group-hover:text-slate-900 transition-colors">
                            {employee.first_name}
                          </p>
                          {employee.position && (
                            <p className="text-xs sm:text-sm text-gray-500 text-center max-w-[100px] mt-1">
                              {employee.position}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Scroll indicator for mobile (only if more than 3 employees) */}
                    {employees.length > 3 && (
                      <p className="text-xs text-gray-400 text-center mt-2 sm:hidden">
                        Desliza para ver más →
                      </p>
                    )}
                  </>
                )}
              </section>

              {/* Reviews Section */}
              <section id="reviews">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Reseñas</h2>
                {/* Reviews Summary Card */}
                {reviews.length > 0 && (
                  <Card className="mb-6 bg-gray-50 border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Calificación General
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="text-4xl font-bold text-gray-900">
                              {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                            </div>
                            <div>
                              <StarRating
                                rating={reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length}
                                readonly
                                size="lg"
                              />
                              <p className="text-sm text-gray-600 mt-1">
                                Basado en {reviews.length} {reviews.length === 1 ? 'reseña' : 'reseñas'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Rating Distribution */}
                        <div className="hidden md:block">
                          <div className="space-y-2">
                            {[5, 4, 3, 2, 1].map((stars) => {
                              const count = reviews.filter(r => r.rating === stars).length
                              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                              return (
                                <div key={stars} className="flex items-center gap-2 text-sm">
                                  <span className="w-12 text-gray-700">{stars} ⭐</span>
                                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-400"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="w-12 text-gray-600">{count}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Individual Reviews */}
                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Star className="w-8 h-8 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No hay reseñas aún
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Sé el primero en compartir tu experiencia con este negocio.
                      </p>
                      <Button
                        className="bg-black hover:bg-neutral-800 text-white"
                        onClick={() => handleBookAppointment()}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Reservar Cita
                      </Button>
                    </div>
                  ) : (
                    reviews.map((review) => {
                      // Safety check: skip if client is null
                      if (!review.client) return null

                      return (
                        <Card key={review.id} className="hover:shadow-md hover:border-gray-300 transition-all duration-200">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {/* Client Avatar */}
                              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                {review.client.first_name.charAt(0).toUpperCase()}
                              </div>

                              {/* Review Content */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold text-gray-900">
                                      {review.client.first_name} {review.client.last_name}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                      {formatDate(review.created_at)}
                                    </p>
                                  </div>
                                  <StarRating rating={review.rating} readonly size="sm" />
                                </div>

                                {review.comment && (
                                  <p className="text-gray-700 leading-relaxed">
                                    {review.comment}
                                  </p>
                                )}

                                {/* Business Reply */}
                                {review.business_reply && (
                                  <div className="mt-4 pl-4 border-l-2 border-orange-400 bg-orange-50 p-3 rounded-r">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold text-orange-900 text-sm">Respuesta del negocio</span>
                                      {review.business_reply_at && (
                                        <span className="text-xs text-orange-600">
                                          {formatDate(review.business_reply_at)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-700 text-sm leading-relaxed">
                                      {review.business_reply}
                                    </p>
                                  </div>
                                )}

                                {/* Reply Button (only for owner) */}
                                {isOwner && !review.business_reply && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
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
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </section>

              {/* About Section */}
              <section id="about">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Acerca de</h2>
                <div className="prose max-w-none">
                  {business.description ? (
                    <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{business.description}</p>
                  ) : (
                    <p className="text-sm sm:text-base text-gray-500 italic">No hay información adicional disponible.</p>
                  )}
                </div>
              </section>

              {/* Map Section - Responsive height */}
              {business.latitude && business.longitude && (
                <section id="location">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Ubicación</h2>
                  <div
                    className="rounded-lg sm:rounded-xl overflow-hidden border border-gray-200 shadow-sm"
                    style={{ height: '300px' }}
                  >
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.google.com/maps?q=${business.latitude},${business.longitude}&hl=es&z=15&output=embed`}
                    />
                  </div>
                  {business.address && (
                    <p className="mt-3 text-sm text-gray-600 flex items-start gap-2">
                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{business.address}</span>
                    </p>
                  )}
                </section>
              )}

              {/* Business Information Section */}
              <section id="info">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Información adicional</h2>

                <div className="space-y-6">
                  {/* Business Hours */}
                  {businessHours.length > 0 && (
                    <Card className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-slate-900" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Horarios de atención</h3>
                        </div>
                        <div className="space-y-2">
                          {businessHours.map((hours) => (
                            <div key={hours.id} className="flex justify-between items-center text-sm py-1.5">
                              <span className="text-gray-700 font-medium">{getDayName(hours.day_of_week)}</span>
                              {hours.is_closed ? (
                                <span className="text-gray-500 italic">Cerrado</span>
                              ) : (
                                <span className="text-gray-900">
                                  {formatTime(hours.open_time)} - {formatTime(hours.close_time)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Cancellation Policy */}
                  {business.cancellation_policy_text && (
                    <Card className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <Ban className="w-5 h-5 text-red-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Política de cancelación</h3>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          {business.cancellation_policy_text}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {business.allow_client_cancellation && (
                            <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200">
                              <Ban className="w-3 h-3 mr-1" />
                              Cancelación permitida
                            </Badge>
                          )}
                          {business.allow_client_reschedule && (
                            <Badge className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reagendamiento permitido
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Booking Restrictions */}
                  {(business.min_booking_hours || business.max_booking_days) && (
                    <Card className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Condiciones de reserva</h3>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                          {business.min_booking_hours && business.min_booking_hours > 0 && (
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span>
                                Las reservas deben hacerse con al menos{' '}
                                <span className="font-semibold">
                                  {business.min_booking_hours} {business.min_booking_hours === 1 ? 'hora' : 'horas'}
                                </span>{' '}
                                de anticipación
                              </span>
                            </div>
                          )}
                          {business.max_booking_days && (
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span>
                                Puedes reservar con hasta{' '}
                                <span className="font-semibold">{business.max_booking_days} días</span> de anticipación
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Reminders & Deposit */}
                  {(business.enable_reminders || business.require_deposit) && (
                    <Card className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-purple-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Otros servicios</h3>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                          {business.enable_reminders && business.reminder_hours_before && (
                            <div className="flex items-start gap-2">
                              <Bell className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span>
                                Recibirás un recordatorio{' '}
                                <span className="font-semibold">
                                  {business.reminder_hours_before} {business.reminder_hours_before === 1 ? 'hora' : 'horas'}
                                </span>{' '}
                                antes de tu cita
                              </span>
                            </div>
                          )}
                          {business.require_deposit && business.deposit_percentage && business.deposit_percentage > 0 && (
                            <div className="flex items-start gap-2">
                              <CreditCard className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span>
                                Se requiere un depósito del{' '}
                                <span className="font-semibold">{business.deposit_percentage}%</span> para confirmar tu cita
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Contact Info */}
                  <Card className="border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-gray-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Información de contacto</h3>
                      </div>
                      <div className="space-y-3">
                        {business.address && (
                          <div className="flex items-start gap-3 text-sm">
                            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700">{business.address}</span>
                          </div>
                        )}
                        {business.phone && (
                          <div className="flex items-start gap-3 text-sm">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <a href={`tel:${business.phone}`} className="text-gray-700 hover:text-slate-900 transition-colors">
                              {business.phone}
                            </a>
                          </div>
                        )}
                        {business.email && (
                          <div className="flex items-start gap-3 text-sm">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <a href={`mailto:${business.email}`} className="text-gray-700 hover:text-slate-900 transition-colors">
                              {business.email}
                            </a>
                          </div>
                        )}
                        {business.website && (
                          <div className="flex items-start gap-3 text-sm">
                            <Globe className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <a
                              href={business.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-700 hover:text-slate-900 transition-colors"
                            >
                              Visitar sitio web
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>

            </div>

            {/* Sidebar - Sticky on desktop, bottom on mobile */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24 space-y-4 sm:space-y-6">
                {/* CTA Card */}
                <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-4 sm:p-6">
                    <Button
                      size="lg"
                      className="w-full bg-black hover:bg-neutral-800 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 h-12 sm:h-auto py-3 text-base sm:text-sm"
                      onClick={() => handleBookAppointment()}
                      style={{ minHeight: '44px' }} // Touch target size
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Reservar ahora
                    </Button>

                    {/* Quick Info */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 mt-4">
                      {business.address && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-slate-900 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Ubicación</p>
                            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{business.address}</p>
                            {business.latitude && business.longitude && (
                              <button
                                onClick={() => setShowLocationModal(true)}
                                className="text-slate-900 hover:text-slate-800 font-medium mt-2 inline-flex items-center gap-1 text-sm transition-colors"
                                style={{ minHeight: '44px', minWidth: '44px' }} // Touch target
                              >
                                <MapPin className="w-4 h-4" />
                                Ver en mapa
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {business.phone && (
                        <div className="flex items-start gap-3">
                          <Phone className="w-5 h-5 text-slate-900 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 mb-1 text-sm sm:text-base">Teléfono</p>
                            <a
                              href={`tel:${business.phone}`}
                              className="text-gray-600 hover:text-slate-900 font-medium transition-colors text-sm"
                              style={{ minHeight: '44px', minWidth: '44px' }} // Touch target
                            >
                              {business.phone}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Business Info Card - Hidden on mobile to reduce clutter */}
                <Card className="border border-gray-200 hidden sm:block">
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 text-sm sm:text-base">Información del negocio</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Categoría</span>
                        <span className="font-medium text-gray-900 flex items-center gap-1.5">
                          <CategoryIcon className="w-4 h-4 text-slate-900" />
                          <span className="text-xs sm:text-sm">{categoryName}</span>
                        </span>
                      </div>
                      {business.rating && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Calificación</span>
                          <span className="font-medium text-gray-900 flex items-center gap-1">
                            {business.rating}
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          </span>
                        </div>
                      )}
                      {services.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Servicios</span>
                          <span className="font-medium text-gray-900">{services.length}</span>
                        </div>
                      )}
                      {employees.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Equipo</span>
                          <span className="font-medium text-gray-900">{employees.length} {employees.length === 1 ? 'persona' : 'personas'}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA Bar - Fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/98 backdrop-blur-lg border-t border-gray-100 shadow-[0_-4px_20px_-5px_rgb(0,0,0,0.1)] z-40 safe-area-inset-bottom">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Price Range or Rating */}
            <div className="flex-1 min-w-0">
              {services.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">Desde</span>
                  <span className="text-lg font-bold text-gray-900">
                    {formatPrice(Math.min(...services.map(s => s.price)))}
                  </span>
                </div>
              )}
              {services.length === 0 && business.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-gray-900">{business.rating}</span>
                  <span className="text-sm text-gray-500">({business.total_reviews || 0})</span>
                </div>
              )}
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="bg-black hover:bg-neutral-800 active:bg-neutral-900 active:scale-95 text-white font-semibold shadow-lg hover:shadow-xl px-8 flex-shrink-0 transition-all duration-150"
              onClick={() => handleBookAppointment()}
              style={{ minHeight: '48px' }} // Larger touch target
            >
              <Calendar className="w-5 h-5 mr-2" />
              Reservar
            </Button>
          </div>
        </div>
      </div>

      {/* Add padding to bottom of main content to prevent overlap with sticky bar on mobile */}
      <div className="lg:hidden h-20" />

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