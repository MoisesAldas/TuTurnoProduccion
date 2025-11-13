'use client'

import { useState, useEffect } from 'react'
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
import LocationMapModal from '@/components/LocationMapModal'
import StarRating from '@/components/StarRating'

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
    // Forzar que el body sea scrollable
    document.body.style.overflow = 'unset'
    document.body.style.paddingRight = '0px'

    // Cleanup al desmontar
    return () => {
      document.body.style.overflow = 'unset'
      document.body.style.paddingRight = '0px'
    }
  }, [])

  const fetchBusinessData = async () => {
    try {
      setLoading(true)

      // Debug: Check current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 [AUTH DEBUG] Current user:', user?.id, user?.email)

      // Fetch business details with JOIN to business_categories
      const { data: businessData, error: businessError } = await supabase
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
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/marketplace')
        return
      }

      setBusiness(businessData)

      // Check if current user is owner
      if (user && businessData.owner_id === user.id) {
        setIsOwner(true)
      }

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name')

      if (!servicesError) {
        setServices(servicesData || [])
      }

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('first_name')

      if (!employeesError) {
        setEmployees(employeesData || [])
      }

      // Fetch reviews from database
      console.log('🔍 [REVIEWS DEBUG] Fetching reviews for business:', businessId)

      const { data: reviewsData, error: reviewsError } = await supabase
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
        .order('created_at', { ascending: false })

      console.log('📊 [REVIEWS DEBUG] Raw reviews data:', reviewsData)
      console.log('❌ [REVIEWS DEBUG] Reviews error:', reviewsError)

      if (!reviewsError && reviewsData) {
        console.log('✅ [REVIEWS DEBUG] Total reviews fetched:', reviewsData.length)

        // Transform and filter reviews - Supabase returns users object
        const validReviews = (reviewsData as any[])
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
            client: review.users  // Rename 'users' to 'client' to match interface
          }))

        console.log('✅ [REVIEWS DEBUG] Valid reviews after filter:', validReviews.length)
        console.log('📝 [REVIEWS DEBUG] Valid reviews data:', validReviews)

        setReviews(validReviews)
      } else {
        console.log('❌ [REVIEWS DEBUG] No reviews data or error occurred')
        setReviews([])
      }

      // Fetch business photos
      const { data: photosData, error: photosError } = await supabase
        .from('business_photos')
        .select('id, photo_url, display_order')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (!photosError && photosData) {
        setBusinessPhotos(photosData)
      }

      // Fetch business hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('business_hours')
        .select('*')
        .eq('business_id', businessId)
        .order('day_of_week', { ascending: true })

      if (!hoursError && hoursData) {
        setBusinessHours(hoursData)
      }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del negocio...</p>
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
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">Volver al Marketplace</Button>
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
      {/* Header - Clean & Minimal */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Logo & Back */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => window.location.href = '/marketplace'}
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Marketplace</span>
              </Button>
              <div className="h-6 w-px bg-gray-200"></div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                TuTurno
              </span>
            </div>

            {/* Right: Auth Actions */}
            <div className="flex items-center gap-2">
              {authState?.user ? (
                <>
                  <Link href="/dashboard/client">
                    <Button variant="outline" size="sm" className="hidden sm:flex">
                      Mi Dashboard
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/client/login">
                    <Button variant="ghost" size="sm">
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/client/register">
                    <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
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
          <div className="mb-8">
            {/* Title and Rating */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{business.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                {business.rating && (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900">{business.rating}</span>
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
                      <span className="text-gray-500">({business.total_reviews || 0})</span>
                    </div>
                    <span className="text-gray-400">•</span>
                  </>
                )}
                <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1.5">
                  <CategoryIcon className="w-3.5 h-3.5" />
                  {categoryName}
                </Badge>
              </div>
              {business.address && (
                <p className="text-gray-600 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {business.address}
                </p>
              )}
            </div>

            {/* Photo Grid - 2 Photos only (1 large + 1 small) */}
            <div className="grid grid-cols-3 gap-2 mb-8" style={{ height: '500px' }}>
              {/* Large Photo (Left - 2/3 width) */}
              <div
                className="col-span-2 relative rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                onClick={() => {
                  setSelectedPhotoIndex(0)
                  setShowPhotoGallery(true)
                }}
              >
                {(business.cover_image_url || businessPhotos[0]) ? (
                  <img
                    src={business.cover_image_url || businessPhotos[0]?.photo_url}
                    alt={business.name}
                    className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Sparkles className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Small Photo (Right - 1/3 width) with overlay button */}
              <div
                className="col-span-1 relative rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                onClick={() => {
                  setSelectedPhotoIndex(1)
                  setShowPhotoGallery(true)
                }}
              >
                {businessPhotos[0] ? (
                  <>
                    <img
                      src={businessPhotos[0].photo_url}
                      alt={`${business.name}`}
                      className="w-full h-full object-cover hover:opacity-95 transition-opacity"
                    />
                    {/* Show "Ver más" button if there are more photos */}
                    {(businessPhotos.length > 1 || business.cover_image_url) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <button
                          className="bg-white text-gray-900 px-3 py-1.5 rounded-md font-medium hover:bg-gray-100 transition-colors text-sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPhotoIndex(0)
                            setShowPhotoGallery(true)
                          }}
                        >
                          Ver más
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2-Column Layout: Content + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">

              {/* Services Section */}
              <section id="services">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Servicios</h2>

                {services.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay servicios disponibles
                    </h3>
                    <p className="text-gray-500">
                      Este negocio aún no ha publicado sus servicios.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Category Tabs */}
                    {serviceCategories.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-gray-200 scrollbar-hide">
                        {serviceCategories.map((category, index) => (
                          <button
                            key={`category-${index}-${category}`}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors ${
                              selectedCategory === category
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {category === 'all' ? 'Todos' : category}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Services List */}
                    <div className="space-y-3">
                      {filteredServices.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-start justify-between p-5 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1.5">
                              {service.name}
                            </h3>
                            <span className="text-lg font-bold text-gray-900 mb-2 block">
                              {formatPrice(service.price)}
                            </span>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(service.duration_minutes)}</span>
                            </div>
                          </div>
                          <Button
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 h-auto rounded-xl font-medium"
                            onClick={() => handleBookAppointment(service.id)}
                          >
                            Reservar
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Show message if no services in category */}
                    {filteredServices.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        No hay servicios en esta categoría.
                      </div>
                    )}
                  </>
                )}
              </section>

              {/* Team Section */}
              <section id="team">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Equipo</h2>

                {employees.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay información del equipo
                    </h3>
                    <p className="text-gray-500">
                      Este negocio aún no ha publicado información sobre su equipo.
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-6 overflow-x-auto pb-4">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex flex-col items-center flex-shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 mb-2">
                          {employee.avatar_url ? (
                            <img
                              src={employee.avatar_url}
                              alt={`${employee.first_name} ${employee.last_name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <Users className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 text-sm text-center">
                          {employee.first_name}
                        </p>
                        {employee.position && (
                          <p className="text-xs text-gray-500 text-center">{employee.position}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Reviews Section */}
              <section id="reviews">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Reseñas</h2>
                {/* Reviews Summary Card */}
                {reviews.length > 0 && (
                  <Card className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">
                            Calificación General
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="text-4xl font-bold text-amber-600">
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
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
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
                        <Card key={review.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {/* Client Avatar */}
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Acerca de</h2>
                <div className="prose max-w-none">
                  {business.description ? (
                    <p className="text-gray-700 leading-relaxed">{business.description}</p>
                  ) : (
                    <p className="text-gray-500 italic">No hay información adicional disponible.</p>
                  )}
                </div>
              </section>

              {/* Map Section */}
              {business.latitude && business.longitude && (
                <section id="location" className="mt-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Ubicación</h2>
                  <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm" style={{ height: '400px' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.google.com/maps?q=${business.latitude},${business.longitude}&hl=es&z=15&output=embed`}
                    />
                  </div>
                  {business.address && (
                    <p className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {business.address}
                    </p>
                  )}
                </section>
              )}

              {/* Business Information Section */}
              <section id="info" className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Información adicional</h2>

                <div className="space-y-6">
                  {/* Business Hours */}
                  {businessHours.length > 0 && (
                    <Card className="border border-gray-200">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-emerald-600" />
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
                            <Badge variant="outline" className="text-xs">
                              <Ban className="w-3 h-3 mr-1" />
                              Cancelación permitida
                            </Badge>
                          )}
                          {business.allow_client_reschedule && (
                            <Badge variant="outline" className="text-xs">
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
                            <a href={`tel:${business.phone}`} className="text-gray-700 hover:text-emerald-600 transition-colors">
                              {business.phone}
                            </a>
                          </div>
                        )}
                        {business.email && (
                          <div className="flex items-start gap-3 text-sm">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <a href={`mailto:${business.email}`} className="text-gray-700 hover:text-emerald-600 transition-colors">
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
                              className="text-gray-700 hover:text-emerald-600 transition-colors"
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

            {/* Sidebar - Sticky */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* CTA Card */}
                <Card className="border-2 border-gray-200">
                  <CardContent className="p-6">
                    <Button
                      size="lg"
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold mb-4"
                      onClick={() => handleBookAppointment()}
                    >
                      Reservar ahora
                    </Button>

                    {/* Quick Info */}
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      {business.address && (
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900 mb-1">Ubicación</p>
                            <p className="text-gray-600">{business.address}</p>
                            {business.latitude && business.longitude && (
                              <button
                                onClick={() => setShowLocationModal(true)}
                                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-1"
                              >
                                Ver en mapa
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {business.phone && (
                        <div className="flex items-start gap-3 text-sm">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900 mb-1">Teléfono</p>
                            <a
                              href={`tel:${business.phone}`}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              {business.phone}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Business Info Card */}
                <Card className="border border-gray-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Información del negocio</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                      <div className="flex justify-between items-center">
                        <span>Categoría</span>
                        <span className="font-medium text-gray-900 flex items-center gap-1.5">
                          <CategoryIcon className="w-4 h-4" />
                          {categoryName}
                        </span>
                      </div>
                      {business.rating && (
                        <div className="flex justify-between">
                          <span>Calificación</span>
                          <span className="font-medium text-gray-900">{business.rating} ⭐</span>
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

      {/* Photo Gallery Modal */}
      <Dialog open={showPhotoGallery} onOpenChange={setShowPhotoGallery}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden bg-black/95 backdrop-blur-xl border-none">
          {/* Close Button */}
          <button
            onClick={() => setShowPhotoGallery(false)}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Photo Counter */}
          <div className="absolute top-4 left-4 z-50 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
            {selectedPhotoIndex + 1} / {(business.cover_image_url ? 1 : 0) + businessPhotos.length}
          </div>

          {/* Main Photo */}
          <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
            {(() => {
              const allPhotos = [
                ...(business.cover_image_url ? [{ id: 'cover', photo_url: business.cover_image_url }] : []),
                ...businessPhotos
              ]
              const currentPhoto = allPhotos[selectedPhotoIndex]

              return currentPhoto ? (
                <img
                  src={currentPhoto.photo_url}
                  alt={`${business.name} - Foto ${selectedPhotoIndex + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : null
            })()}

            {/* Navigation Arrows */}
            {((business.cover_image_url ? 1 : 0) + businessPhotos.length) > 1 && (
              <>
                <button
                  onClick={() => {
                    const totalPhotos = (business.cover_image_url ? 1 : 0) + businessPhotos.length
                    setSelectedPhotoIndex((prev) => (prev === 0 ? totalPhotos - 1 : prev - 1))
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110 z-10"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <button
                  onClick={() => {
                    const totalPhotos = (business.cover_image_url ? 1 : 0) + businessPhotos.length
                    setSelectedPhotoIndex((prev) => (prev === totalPhotos - 1 ? 0 : prev + 1))
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110 z-10"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {((business.cover_image_url ? 1 : 0) + businessPhotos.length) > 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex gap-2 overflow-x-auto justify-center scrollbar-hide">
                  {[
                    ...(business.cover_image_url ? [{ id: 'cover', photo_url: business.cover_image_url }] : []),
                    ...businessPhotos
                  ].map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-3 transition-all duration-300 ${
                        index === selectedPhotoIndex
                          ? 'border-white shadow-xl scale-110'
                          : 'border-white/30 hover:border-white/60 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.photo_url}
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}