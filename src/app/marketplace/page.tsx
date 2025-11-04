'use client'
import "@fontsource/poppins/900.css"
import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Star, Clock, Filter, Grid, List, LogOut, Sparkles, TrendingUp, Users, ArrowRight, Scissors, Heart, Dumbbell, Activity, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import Logo from '@/components/logo'

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
  is_active: boolean
  created_at: string
  // Campos de JOIN
  business_categories?: BusinessCategory
  // Campos calculados de reviews
  average_rating?: number
  review_count?: number
}

export default function MarketplacePage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { authState, signOut } = useAuth()
  const supabase = createClient()

  // Mapeo de categorías a iconos (fallback si no hay icon_url en DB)
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
    fetchCategories()
    fetchBusinesses()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBusinesses = async () => {
    try {
      setLoading(true)

      // Traer negocios activos con JOIN a business_categories
      const { data, error } = await supabase
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
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching businesses:', error)
        return
      }

      // Para cada negocio, obtener rating y reviews usando las funciones SQL
      const businessesWithReviews = await Promise.all(
        (data || []).map(async (business) => {
          // Obtener rating promedio
          const { data: avgData } = await supabase
            .rpc('get_business_average_rating', { p_business_id: business.id })

          // Obtener número de reseñas
          const { data: countData } = await supabase
            .rpc('get_business_review_count', { p_business_id: business.id })

          return {
            ...business,
            average_rating: avgData || 0,
            review_count: countData || 0
          }
        })
      )

      setBusinesses(businessesWithReviews)
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         business.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         business.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         business.business_categories?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !selectedCategory || business.business_category_id === selectedCategory

    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-200 border-t-green-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando negocios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative overflow-hidden">
      {/* Custom Animation Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
      {/* Background Animated Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 -left-20 w-96 h-96 bg-emerald-400/8 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-teal-400/8 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-1/3 w-72 h-72 bg-cyan-400/8 rounded-full filter blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Floating Dots */}
      <div className="absolute top-1/4 left-10 animate-bounce delay-1000 pointer-events-none">
        <div className="w-4 h-4 bg-emerald-400 rounded-full opacity-40"></div>
      </div>
      <div className="absolute top-1/3 right-20 animate-bounce delay-2000 pointer-events-none">
        <div className="w-3 h-3 bg-teal-400 rounded-full opacity-30"></div>
      </div>

      {/* Transparent Header with Animations */}
      <header className="absolute top-0 left-0 right-0 z-50 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo Turnito - Modern Rounded Style */}
<Logo color="white" className="ml-10"  />



            {/* Navigation with Premium Animations */}
            <div className="flex items-center space-x-4">
              {authState.user ? (
                <>
                  <Link href="/dashboard/client">
                    <Button className="bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 hover:border-white/50 font-medium shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 group">
                      <Users className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="relative">
                        Mi Dashboard
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                      </span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={signOut}
                    className="text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-md border border-transparent hover:border-white/20 transition-all duration-500 hover:scale-110 hover:-translate-y-1 group"
                  >
                    <LogOut className="w-4 h-4 mr-2 group-hover:-translate-x-1 group-hover:rotate-12 transition-all duration-300" />
                    <span className="relative">
                      Cerrar Sesión
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                    </span>
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/client/login">
                    <Button
                      variant="ghost"
                      className="text-white/90 hover:text-white hover:bg-white/10 backdrop-blur-md border border-transparent hover:border-white/20 transition-all duration-500 hover:scale-110 hover:-translate-y-1 group"
                    >
                      <span className="relative">
                        Iniciar Sesión
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                      </span>
                    </Button>
                  </Link>
                  <Link href="/auth/client/register">
                    <Button className="bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 hover:border-white/50 text-white font-semibold shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-110 hover:-translate-y-2 group">
                      <Sparkles className="mr-2 w-5 h-5 group-hover:rotate-180 group-hover:scale-125 transition-all duration-500" />
                      <span className="relative">
                        Registrarse
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white group-hover:w-full transition-all duration-300"></span>
                      </span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Premium Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Hero Background with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700"></div>
        <div className="absolute inset-0 bg-black/10"></div>

        {/* Hero Content */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white pt-20">
          {/* Hero Badge */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-default">
              <TrendingUp className="w-4 h-4 animate-pulse" />
              <span>Más de 1,000+ servicios disponibles</span>
            </div>
          </div>

          {/* Hero Title */}
          <h1 className="text-5xl md:text-6xl lg:text-8xl font-bold mb-8 leading-tight animate-fade-in">
            <span className="block">Encuentra tu</span>
            <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 bg-clip-text text-transparent py-2">
              servicio perfecto
            </span>
          </h1>

          {/* Hero Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 mb-16 max-w-4xl mx-auto leading-relaxed animate-fade-in">
            Descubre y reserva en los mejores salones, spas y centros de belleza cerca de ti.
            <br />
            <strong className="text-white"> Calidad profesional, a un clic de distancia.</strong>
          </p>

          {/* Premium Search Bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 flex flex-col md:flex-row gap-3 max-w-4xl mx-auto shadow-2xl border border-white/20">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Buscar salones, spas, servicios o ubicación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-4 border-0 text-gray-900 placeholder-gray-500 text-lg bg-transparent focus:ring-0 focus:outline-none"
              />
            </div>
            <Button className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
              <Search className="w-5 h-5 mr-3" />
              Descubrir
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Categories Section */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Explora por
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent"> categorías</span>
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl">
                Encuentra exactamente lo que necesitas con nuestra selección curada de servicios premium
              </p>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-lg border border-gray-200">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ?
                  'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-700 hover:to-teal-700' :
                  'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ?
                  'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md hover:from-emerald-700 hover:to-teal-700' :
                  'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Premium Category Filter */}
          <div className="flex flex-wrap gap-3 mb-8 justify-center lg:justify-start">
            <Button
              variant={!selectedCategory ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('')}
              className={!selectedCategory ?
                'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105' :
                'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-emerald-300 font-medium transition-all duration-300'
              }
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Todos los servicios
            </Button>
            {categories.map((category) => {
              const CategoryIcon = getCategoryIcon(category.name)
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className={selectedCategory === category.id ?
                    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 transform hover:scale-105' :
                    'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-emerald-300 hover:text-gray-900 font-medium transition-all duration-300 hover:scale-105'
                  }
                >
                  <CategoryIcon className="w-4 h-4 mr-2" />
                  {category.name}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Premium Results Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'negocio encontrado' : 'negocios encontrados'}
              </h3>
              <p className="text-sm text-gray-600">
                {searchQuery ? `Resultados para "${searchQuery}"` : 'Todos los servicios disponibles'}
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>Calificación promedio 4.8</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 text-green-500" />
              <span>Disponible hoy</span>
            </div>
          </div>
        </div>

        {/* Premium Business Results */}
        {filteredBusinesses.length === 0 ? (
          /* Premium Empty State */
          <div className="text-center py-16 px-8">
            <div className="max-w-md mx-auto">
              {/* Animated Icon */}
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Search className="w-12 h-12 text-emerald-600" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No encontramos servicios
              </h3>

              <p className="text-gray-600 mb-8 leading-relaxed">
                No hay negocios que coincidan con tu búsqueda. Intenta con términos diferentes o explora todas nuestras categorías.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('')
                  }}
                  className="border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-medium"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Limpiar filtros
                </Button>

                <Button
                  onClick={() => setSelectedCategory('')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Ver todos
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr"
            : "space-y-4"
          }>
            {filteredBusinesses.map((business) => {
              const CategoryIcon = getCategoryIcon(business.business_categories?.name)
              const categoryName = business.business_categories?.name || 'Sin categoría'

              return (
                <Link key={business.id} href={`/business/${business.id}`}>
                  {viewMode === 'grid' ? (
                    // GRID VIEW - Diseño elegante y profesional
                    <div className="group bg-white rounded-lg overflow-hidden border-2 border-gray-200 hover:border-emerald-300 transition-all duration-200 hover:shadow-md h-full flex flex-col">
                      {/* Cover Image */}
                      <div className="relative h-48 overflow-hidden bg-gray-100 flex-shrink-0">
                        {business.cover_image_url ? (
                          <img
                            src={business.cover_image_url}
                            alt={business.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <CategoryIcon className="w-16 h-16 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4 flex flex-col flex-1">
                        {/* Business name */}
                        <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
                          {business.name}
                        </h3>

                        {/* Category */}
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                          <CategoryIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="line-clamp-1">{categoryName}</span>
                        </div>

                        {/* Location */}
                        {business.address && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-3">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="line-clamp-1">{business.address}</span>
                          </div>
                        )}

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4 mt-auto">
                          {business.average_rating && business.average_rating > 0 ? (
                            <>
                              <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>{business.average_rating.toFixed(1)}</span>
                              </div>
                              <span className="text-sm text-gray-500">({business.review_count})</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">Sin reseñas aún</span>
                          )}
                        </div>

                        {/* Action button */}
                        <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200">
                          Ver servicios
                        </button>
                      </div>
                    </div>
                  ) : (
                    // LIST VIEW - Diseño horizontal profesional
                    <div className="group bg-white rounded-lg overflow-hidden border-2 border-gray-200 hover:border-emerald-300 transition-all duration-200 hover:shadow-md flex h-36">
                      {/* Cover Image */}
                      <div className="relative w-36 h-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {business.cover_image_url ? (
                          <img
                            src={business.cover_image_url}
                            alt={business.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            sizes="144px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <CategoryIcon className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                        <div className="min-w-0">
                          {/* Business name */}
                          <h3 className="font-semibold text-lg text-gray-900 mb-1.5 line-clamp-1">
                            {business.name}
                          </h3>

                          {/* Category */}
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-1.5">
                            <CategoryIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="line-clamp-1">{categoryName}</span>
                          </div>

                          {/* Location */}
                          {business.address && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-2">
                              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="line-clamp-1">{business.address}</span>
                            </div>
                          )}

                          {/* Rating */}
                          <div className="flex items-center gap-2">
                            {business.average_rating && business.average_rating > 0 ? (
                              <>
                                <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                  <span>{business.average_rating.toFixed(1)}</span>
                                </div>
                                <span className="text-sm text-gray-500">({business.review_count})</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400">Sin reseñas</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}