'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  MapPin, Phone, Mail, Globe, Star, Clock, ArrowLeft,
  Calendar, Users, Scissors, Sparkles, LogOut
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

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
  rating?: number
  total_reviews?: number
  is_active: boolean
  created_at: string
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
  client_name: string
  created_at: string
}

export default function BusinessProfilePage() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('services')

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
        // Debug: Log service duration values
        ('Services data:', servicesData?.map(s => ({
          name: s.name,
          duration_minutes: s.duration_minutes,
          type: typeof s.duration_minutes
        })))
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

      // TODO: Fetch reviews when reviews table is implemented
      // For now, using mock data
      setReviews([
        {
          id: '1',
          rating: 5,
          comment: 'Excelente servicio, muy profesionales y el lugar está muy limpio.',
          client_name: 'María García',
          created_at: '2024-01-15'
        },
        {
          id: '2',
          rating: 4,
          comment: 'Muy buen corte, recomendado. El personal es muy amable.',
          client_name: 'Carlos Rodríguez',
          created_at: '2024-01-10'
        }
      ])

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
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
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
            <Button>Volver al Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }

  const categoryInfo = getCategoryInfo(business.business_type)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/marketplace">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al Marketplace
                </Button>
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <Link href="/" className="text-xl font-bold text-green-600">
                TuTurno
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {authState?.user ? (
                <>
                  <Link href="/dashboard/client">
                    <Button variant="outline">Mi Dashboard</Button>
                  </Link>
                  <Button variant="ghost" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/client/login">
                    <Button variant="ghost">Iniciar Sesión</Button>
                  </Link>
                  <Link href="/auth/client/register">
                    <Button>Registrarse</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner - ULTRA Quality Design */}
      {business.cover_image_url && (
        <section className="relative w-full overflow-hidden">
          <div className="max-w-6xl mx-auto">
            <div className="relative w-full" style={{ aspectRatio: '2.2/1' }}>
              {/* Main Cover Image - ULTRA Quality */}
              <img
                src={business.cover_image_url}
                alt={business.name}
                className="w-full h-full object-cover"
                style={{ imageRendering: 'auto' }}
                loading="eager"
                fetchPriority="high"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 1152px, 1280px"
              />

              {/* Premium Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent"></div>

              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end">
                <div className="p-8 md:p-12">
                  <div className="max-w-4xl">
                    {/* Business Category Badge */}
                    <div className="mb-4">
                      <div className="inline-flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold text-gray-800 shadow-lg">
                        <span className="text-lg">{categoryInfo.emoji}</span>
                        <span>{categoryInfo.label}</span>
                      </div>
                    </div>

                    {/* Business Name - Hero Title */}
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                      {business.name}
                    </h1>

                    {/* Business Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                      {business.address && (
                        <div className="flex items-center gap-2 text-white/90 text-lg">
                          <div className="p-2 bg-white/20 backdrop-blur-md rounded-full">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <span>{business.address}</span>
                        </div>
                      )}

                      {business.rating && (
                        <div className="flex items-center gap-2 text-white/90 text-lg">
                          <div className="p-2 bg-yellow-500/20 backdrop-blur-md rounded-full">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          </div>
                          <span className="font-semibold">{business.rating}</span>
                          <span className="text-white/70">({business.total_reviews || 0} reseñas)</span>
                        </div>
                      )}
                    </div>

                    {/* Business Description */}
                    {business.description && (
                      <p className="text-white/85 text-lg md:text-xl leading-relaxed max-w-2xl mb-8">
                        {business.description}
                      </p>
                    )}

                    {/* Quick Action Button */}
                    <div className="flex items-center gap-4">
                      <Link href={`/business/${business.id}/book`}>
                        <button className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 text-white font-bold py-4 px-8 rounded-xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 text-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5" />
                            <span>Reservar Ahora</span>
                          </div>
                        </button>
                      </Link>

                      {business.phone && (
                        <a
                          href={`tel:${business.phone}`}
                          className="bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl border border-white/30 hover:border-white/50 transition-all duration-300 text-lg"
                        >
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            <span>Llamar</span>
                          </div>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Business Hero Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="w-full">
            {/* Business Info */}
            <div className="w-full">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {!business.cover_image_url && (
                      <>
                        <h1 className="text-3xl font-bold text-gray-900">{business.name}</h1>
                        <Badge className={categoryInfo.color}>
                          {categoryInfo.emoji} {categoryInfo.label}
                        </Badge>
                      </>
                    )}
                    {business.cover_image_url && (
                      <Badge className={categoryInfo.color}>
                        {categoryInfo.emoji} {categoryInfo.label}
                      </Badge>
                    )}
                  </div>

                  {business.rating && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-5 h-5 ${
                              i < Math.floor(business.rating || 0)
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-gray-900">{business.rating}</span>
                      <span className="text-gray-500">
                        ({business.total_reviews || 0} reseñas)
                      </span>
                    </div>
                  )}

                  {business.description && (
                    <p className="text-gray-600 text-lg leading-relaxed mb-4">
                      {business.description}
                    </p>
                  )}
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {business.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                      <span>{business.address}</span>
                    </div>
                  )}

                  {business.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                      <span>{business.phone}</span>
                    </div>
                  )}

                  {business.email && (
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                      <span>{business.email}</span>
                    </div>
                  )}

                  {business.website && (
                    <div className="flex items-center text-gray-600">
                      <Globe className="w-5 h-5 mr-3 text-green-600 flex-shrink-0" />
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-700 underline"
                      >
                        Sitio web
                      </a>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <Button
                    size="lg"
                    className="flex-1 min-w-[200px]"
                    onClick={() => handleBookAppointment()}
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Reservar Cita
                  </Button>
                  {business.phone && (
                    <Button variant="outline" size="lg">
                      <Phone className="w-5 h-5 mr-2" />
                      Llamar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="services">
              <Scissors className="w-4 h-4 mr-2" />
              Servicios
            </TabsTrigger>
            <TabsTrigger value="team">
              <Users className="w-4 h-4 mr-2" />
              Equipo
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" />
              Reseñas
            </TabsTrigger>
            <TabsTrigger value="info">
              <Clock className="w-4 h-4 mr-2" />
              Información
            </TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          <TabsContent value="services" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay servicios disponibles
                  </h3>
                  <p className="text-gray-500">
                    Este negocio aún no ha publicado sus servicios.
                  </p>
                </div>
              ) : (
                services.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {service.name}
                        </h3>
                        <span className="text-xl font-bold text-green-600">
                          {formatPrice(service.price)}
                        </span>
                      </div>

                      {service.description && (
                        <p className="text-gray-600 mb-4">{service.description}</p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDuration(service.duration_minutes)}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBookAppointment(service.id)}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Reservar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay información del equipo
                  </h3>
                  <p className="text-gray-500">
                    Este negocio aún no ha publicado información sobre su equipo.
                  </p>
                </div>
              ) : (
                employees.map((employee) => (
                  <Card key={employee.id}>
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                        {employee.avatar_url ? (
                          <img
                            src={employee.avatar_url}
                            alt={`${employee.first_name} ${employee.last_name}`}
                            className="w-full h-full rounded-full object-cover border-2 border-white shadow-md"
                          />
                        ) : (
                          <Users className="w-10 h-10 text-green-600" />
                        )}
                      </div>

                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {employee.first_name} {employee.last_name}
                      </h3>

                      {employee.position && (
                        <p className="text-green-600 font-medium mb-3">
                          {employee.position}
                        </p>
                      )}

                      {employee.bio && (
                        <p className="text-gray-600 text-sm">
                          {employee.bio}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay reseñas aún
                  </h3>
                  <p className="text-gray-500">
                    Sé el primero en dejar una reseña de este negocio.
                  </p>
                </div>
              ) : (
                reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {review.client_name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatDate(review.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-600">{review.comment}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Info Tab */}
          <TabsContent value="info" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Información del Negocio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Horarios de Atención</h4>
                  <p className="text-gray-600">
                    Los horarios específicos se mostrarán al seleccionar un servicio para reservar.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Políticas de Cancelación</h4>
                  <p className="text-gray-600">
                    Las cancelaciones deben realizarse con al menos 24 horas de anticipación.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Métodos de Pago</h4>
                  <p className="text-gray-600">
                    Efectivo, tarjetas de débito y crédito, transferencias bancarias.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}