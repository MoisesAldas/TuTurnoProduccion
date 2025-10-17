'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  MapPin, Phone, Mail, Globe, Star, Clock, ArrowLeft,
  Calendar, Users, Sparkles, LogOut, ChevronLeft, ChevronRight, X
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import LocationMapModal from '@/components/LocationMapModal'

interface Business {
  id: string
  name: string
  description?: string
  address?: string
  phone?: string
  email?: string
  website?: string
  business_type: string
  logo_url?: string
  cover_image_url?: string
  latitude?: number
  longitude?: number
  rating?: number
  total_reviews?: number
  is_active: boolean
  created_at: string
  category?: {
    id: string
    name: string
  }
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
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showPhotoGallery, setShowPhotoGallery] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const params = useParams()
  const router = useRouter()
  const { authState, signOut } = useAuth()
  const businessId = params.id as string
  const supabase = createClient()

  const businessCategories = {
    'salon': { label: 'Salón de Belleza', emoji: '💇', color: 'bg-pink-100 text-pink-800' },
    'barbershop': { label: 'Barbería', emoji: '✂️', color: 'bg-blue-100 text-blue-800' },
    'spa': { label: 'Spa', emoji: '🧖', color: 'bg-purple-100 text-purple-800' },
    'nail_salon': { label: 'Uñas', emoji: '💅', color: 'bg-red-100 text-red-800' },
    'massage': { label: 'Masajes', emoji: '💆', color: 'bg-green-100 text-green-800' },
    'gym': { label: 'Gimnasio', emoji: '🏋️', color: 'bg-orange-100 text-orange-800' },
    'clinic': { label: 'Clínica', emoji: '🏥', color: 'bg-teal-100 text-teal-800' },
    'other': { label: 'Otros', emoji: '📍', color: 'bg-gray-100 text-gray-800' }
  }

  useEffect(() => {
    if (businessId) {
      fetchBusinessData()
    }
  }, [businessId])

  const fetchBusinessData = async () => {
    try {
      setLoading(true)

      // Fetch business details
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .eq('is_active', true)
        .single()

      if (businessError) {
        console.error('Error fetching business:', businessError)
        router.push('/marketplace')
        return
      }

      setBusiness(businessData)

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
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          client_id,
          users!reviews_client_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })

      if (!reviewsError && reviewsData) {
        // Transform and filter reviews - Supabase returns users as array
        const validReviews = reviewsData
          .filter((review: any) => review.users && review.users.length > 0)
          .map((review: any) => ({
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            created_at: review.created_at,
            client: review.users[0] // Extract first user from array
          }))
        setReviews(validReviews)
      } else {
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

  const getCategoryInfo = (type: string) => {
    return businessCategories[type as keyof typeof businessCategories] || businessCategories.other
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

  const categoryInfo = getCategoryInfo(business.business_type)

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
              <Link href="/marketplace">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Marketplace</span>
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-200"></div>
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                TuTurno
              </Link>
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
                <Badge className={categoryInfo.color}>
                  {categoryInfo.emoji} {categoryInfo.label}
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
                          className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {service.name}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(service.duration_minutes)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-semibold text-gray-900">
                              {formatPrice(service.price)}
                            </span>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                              onClick={() => handleBookAppointment(service.id)}
                            >
                              Reservar
                            </Button>
                          </div>
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
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Reseñas</h2>
                  {reviews.length > 0 && (
                    <div className="flex items-center gap-1 text-sm">
                      <span className="font-semibold text-gray-900">
                        {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < Math.floor(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-lg">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No hay reseñas aún
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Sé el primero en compartir tu experiencia.
                    </p>
                    <Button
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                      onClick={() => handleBookAppointment()}
                    >
                      Reservar Cita
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => {
                      // Safety check: skip if client is null
                      if (!review.client) return null

                      return (
                        <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                              {review.client.first_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-gray-900">
                                    {review.client.first_name} {review.client.last_name}
                                  </h4>
                                <p className="text-sm text-gray-500">
                                  {formatDate(review.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex mb-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'text-yellow-400 fill-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            {review.comment && (
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {review.comment}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
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

                {/* Additional Info */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Información de contacto</h3>
                  <div className="space-y-3">
                    {business.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{business.address}</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-start gap-3 text-sm">
                        <Phone className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <a href={`tel:${business.phone}`} className="text-gray-700 hover:text-gray-900">
                          {business.phone}
                        </a>
                      </div>
                    )}
                    {business.email && (
                      <div className="flex items-start gap-3 text-sm">
                        <Mail className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <a href={`mailto:${business.email}`} className="text-gray-700 hover:text-gray-900">
                          {business.email}
                        </a>
                      </div>
                    )}
                    {business.website && (
                      <div className="flex items-start gap-3 text-sm">
                        <Globe className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <a
                          href={business.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-700 hover:text-gray-900"
                        >
                          Sitio web
                        </a>
                      </div>
                    )}
                  </div>
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
                      <div className="flex justify-between">
                        <span>Categoría</span>
                        <span className="font-medium text-gray-900">{categoryInfo.label}</span>
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