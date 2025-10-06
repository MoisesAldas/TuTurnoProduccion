'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, Star, Clock, Filter, Grid, List, LogOut, Sparkles, TrendingUp, Users, ArrowRight } from 'lucide-react'
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

export default function MarketplacePage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { authState, signOut } = useAuth()
  const supabase = createClient()

  const businessCategories = [
    { value: 'salon', label: 'Salón de Belleza', emoji: '💇' },
    { value: 'barbershop', label: 'Barbería', emoji: '✂️' },
    { value: 'spa', label: 'Spa', emoji: '🧖' },
    { value: 'nail_salon', label: 'Uñas', emoji: '💅' },
    { value: 'massage', label: 'Masajes', emoji: '💆' },
    { value: 'gym', label: 'Gimnasio', emoji: '🏋️' },
    { value: 'clinic', label: 'Clínica', emoji: '🏥' },
    { value: 'other', label: 'Otros', emoji: '📍' }
  ]

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching businesses:', error)
        return
      }

      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         business.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         business.address?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = !selectedCategory || business.business_type === selectedCategory

    return matchesSearch && matchesCategory
  })

  const getCategoryInfo = (type: string) => {
    return businessCategories.find(cat => cat.value === type) || { label: type, emoji: '📍' }
  }

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
            {/* Logo Premium - Enhanced Design */}
            <div className="flex items-center">
              <Link href="/" className="group relative">
                {/* Background Glow Effect */}
                <div className="absolute -inset-2 bg-white/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>

                {/* Main Logo Text */}
                <span className="relative text-4xl font-black text-white group-hover:scale-110 group-hover:tracking-wider transition-all duration-500
                  bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text
                  drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]
                  group-hover:drop-shadow-[0_0_40px_rgba(255,255,255,0.8)]
                  group-hover:text-shadow-lg
                  filter group-hover:brightness-125">

                  {/* Animated underline */}
                  TuTurno
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-white/60 to-white/30 group-hover:w-full transition-all duration-700 delay-200"></span>

                  {/* Shimmer effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 delay-300"></span>
                </span>
              </Link>
            </div>

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
            {businessCategories.map((category) => (
              <Button
                key={category.value}
                variant={selectedCategory === category.value ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.value)}
                className={selectedCategory === category.value ?
                  'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105' :
                  'border-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-emerald-300 font-medium transition-all duration-300 hover:scale-105'
                }
              >
                <span className="text-lg mr-2">{category.emoji}</span>
                {category.label}
              </Button>
            ))}
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
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            : "space-y-4"
          }>
            {filteredBusinesses.map((business) => {
              const categoryInfo = getCategoryInfo(business.business_type)

              return (
                <Link key={business.id} href={`/business/${business.id}`}>
                  {viewMode === 'grid' ? (
                    // GRID VIEW - Diseño vertical moderno
                    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden border border-gray-100">
                      {/* Cover Image */}
                      <div className="relative h-48 overflow-hidden">
                        {business.cover_image_url ? (
                          <img
                            src={business.cover_image_url}
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-100 via-emerald-50 to-green-200 flex items-center justify-center">
                            <div className="text-6xl opacity-80">{categoryInfo.emoji}</div>
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>

                        {/* Category badge */}
                        <div className="absolute top-3 left-3">
                          <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700 border border-white/20">
                            {categoryInfo.emoji} {categoryInfo.label}
                          </div>
                        </div>

                        {/* Rating badge */}
                        {business.rating && (
                          <div className="absolute top-3 right-3">
                            <div className="bg-yellow-400/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold text-yellow-900 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              {business.rating}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        {/* Business name */}
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1 group-hover:text-green-600 transition-colors">
                          {business.name}
                        </h3>

                        {/* Description */}
                        {business.description && (
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                            {business.description}
                          </p>
                        )}

                        {/* Location */}
                        {business.address && (
                          <div className="flex items-center text-gray-500 text-sm mb-4">
                            <MapPin className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                            <span className="line-clamp-1">{business.address}</span>
                          </div>
                        )}

                        {/* Action button */}
                        <button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-sm hover:shadow-md">
                          Ver servicios y reservar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // LIST VIEW - Diseño horizontal moderno
                    <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 flex h-32">
                      {/* Cover Image */}
                      <div className="relative w-48 h-full overflow-hidden">
                        {business.cover_image_url ? (
                          <img
                            src={business.cover_image_url}
                            alt={business.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            sizes="192px"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-100 via-emerald-50 to-green-200 flex items-center justify-center">
                            <div className="text-4xl opacity-80">{categoryInfo.emoji}</div>
                          </div>
                        )}

                        {/* Category badge */}
                        <div className="absolute top-2 left-2">
                          <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-700">
                            {categoryInfo.emoji}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                          {/* Header */}
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-green-600 transition-colors">
                              {business.name}
                            </h3>
                            {business.rating && (
                              <div className="bg-yellow-100 px-2 py-1 rounded-full text-xs font-medium text-yellow-800 flex items-center gap-1 ml-2">
                                <Star className="w-3 h-3 fill-current text-yellow-500" />
                                {business.rating}
                              </div>
                            )}
                          </div>

                          {/* Location */}
                          {business.address && (
                            <div className="flex items-center text-gray-500 text-sm mb-2">
                              <MapPin className="w-3 h-3 mr-2 text-green-500 flex-shrink-0" />
                              <span className="line-clamp-1">{business.address}</span>
                            </div>
                          )}
                        </div>

                        {/* Action button */}
                        <button className="self-start bg-green-600 hover:bg-green-700 text-white font-medium py-1.5 px-4 rounded-lg transition-colors text-sm">
                          Ver más
                        </button>
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