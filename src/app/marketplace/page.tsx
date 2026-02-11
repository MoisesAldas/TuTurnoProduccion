'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Search, MapPin, Star, Filter, Map, Building2, Sparkles, ChevronRight, AlertCircle, RefreshCw, ArrowLeft, List, X, ChevronDown, Check } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { getCategoryIcon } from '@/lib/categoryIcons'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Logo from '@/components/logo'
import FilterSheet from '@/components/FilterSheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// SEO Metadata (Note: This needs to be in a Server Component in layout.tsx or a wrapper)
// For client components, we'll add meta tags via next/head in useEffect

// Lazy load Mapbox to save 500KB on initial bundle
const MarketplaceMap = dynamic(() => import('@/components/MarketplaceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Cargando mapa...</p>
      </div>
    </div>
  )
})

interface BusinessCategory {
  id: string
  name: string
}

interface BusinessHours {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

interface BusinessRatingSummary {
  business_id: string
  average_rating: number
  review_count: number
}

interface Business {
  id: string
  name: string
  description?: string
  address?: string
  latitude?: number
  longitude?: number
  business_category_id?: string
  cover_image_url?: string
  business_categories?: BusinessCategory
  business_hours?: BusinessHours[]
  business_ratings_summary?: BusinessRatingSummary
  average_rating?: number
  review_count?: number
}

// Helper function to calculate business open/closed status
const getBusinessStatus = (businessHours?: BusinessHours[]) => {
  if (!businessHours || businessHours.length === 0) return null

  const now = new Date()
  const currentDay = now.getDay()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = now.toTimeString().substring(0, 5)

  const todayHours = businessHours.find(h => h.day_of_week === currentDay)

  // Helper to format time to 12h format
  const formatTo12h = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const ampm = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  // Helper to calculate hours until opening
  const getHoursUntilOpen = (openTime: string) => {
    const [openHour, openMinute] = openTime.split(':').map(Number)
    const nowMinutes = currentHour * 60 + currentMinute
    const openMinutes = openHour * 60 + openMinute
    const diffMinutes = openMinutes - nowMinutes
    const hours = Math.ceil(diffMinutes / 60)
    return hours
  }

  if (!todayHours || todayHours.is_closed) {
    // Find next open day
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7
      const nextDayHours = businessHours.find(h => h.day_of_week === nextDay)
      if (nextDayHours && !nextDayHours.is_closed) {
        const openTime12h = formatTo12h(nextDayHours.open_time.substring(0, 5))
        return { isOpen: false, message: `Cerrado · abre a las ${openTime12h}` }
      }
    }
    return { isOpen: false, message: 'Cerrado' }
  }

  const openTime = todayHours.open_time.substring(0, 5)
  const closeTime = todayHours.close_time.substring(0, 5)

  if (currentTime >= openTime && currentTime < closeTime) {
    return { isOpen: true, message: 'Abierto ahora' }
  } else if (currentTime < openTime) {
    const hoursUntil = getHoursUntilOpen(openTime)
    if (hoursUntil <= 12) {
      return { isOpen: false, message: `Cerrado · abre en ${hoursUntil} ${hoursUntil === 1 ? 'hora' : 'horas'}` }
    } else {
      const openTime12h = formatTo12h(openTime)
      return { isOpen: false, message: `Cerrado · abre a las ${openTime12h}` }
    }
  } else {
    // Closed for today, find tomorrow's hours
    const tomorrowDay = (currentDay + 1) % 7
    const tomorrowHours = businessHours.find(h => h.day_of_week === tomorrowDay)
    if (tomorrowHours && !tomorrowHours.is_closed) {
      const openTime12h = formatTo12h(tomorrowHours.open_time.substring(0, 5))
      return { isOpen: false, message: `Cerrado · abre a las ${openTime12h}` }
    }
    return { isOpen: false, message: 'Cerrado' }
  }
}

export default function MarketplacePage() {
  const router = useRouter()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Mobile Map State
  const [showMobileMap, setShowMobileMap] = useState(false)

  // Interaction States
  const [hoveredBusinessId, setHoveredBusinessId] = useState<string | null>(null)
  const [clickedBusinessId, setClickedBusinessId] = useState<string | null>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Memoize callbacks to prevent unnecessary re-renders
  const handleSetHoveredBusinessId = useCallback((id: string | null) => {
    setHoveredBusinessId(id)
  }, [])

  const handleMarkerClick = useCallback((id: string) => {
    setClickedBusinessId(id)
  }, [])

  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
    fetchBusinesses()
  }, [])

  // Fix: Asegurar que el body sea scrollable al montar/desmontar
  useEffect(() => {
    const forceScroll = () => {
      document.body.style.removeProperty('overflow')
      document.body.style.removeProperty('padding-right')
      document.documentElement.style.removeProperty('overflow')
      document.documentElement.style.removeProperty('padding-right')
    }

    forceScroll()

    const timers = [
      setTimeout(forceScroll, 0),
      setTimeout(forceScroll, 50),
      setTimeout(forceScroll, 100)
    ]

    return () => {
      timers.forEach(timer => clearTimeout(timer))
      forceScroll()
    }
  }, [])

  useEffect(() => {
    if (clickedBusinessId && cardRefs.current[clickedBusinessId]) {
      cardRefs.current[clickedBusinessId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setHoveredBusinessId(clickedBusinessId);
      const timer = setTimeout(() => {
        setHoveredBusinessId(null);
        setClickedBusinessId(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [clickedBusinessId]);

  const fetchCategories = async () => {
    try {
      // Check localStorage cache first (1 hour expiry)
      const CACHE_KEY = 'marketplace_categories'
      const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour in milliseconds
      
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData)
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY
        
        if (!isExpired) {
          setCategories(data)
          return // Use cached data
        }
      }

      // Fetch from database if no cache or expired
      const { data, error } = await supabase.from('business_categories').select('*').order('name', { ascending: true })
      if (error) throw error
      
      // Update state and cache
      setCategories(data || [])
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data || [],
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch businesses and ratings in parallel (2 queries instead of 100+)
      const [businessesRes, ratingsRes] = await Promise.all([
        supabase
          .from('businesses')
          .select(`
            *, 
            business_categories (*), 
            business_hours (day_of_week, open_time, close_time, is_closed)
          `)
          .eq('is_active', true)
          .eq('is_suspended', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('business_ratings_summary')
          .select('business_id, average_rating, review_count')
      ])

      if (businessesRes.error) throw businessesRes.error

      // Crear un objeto de ratings por business_id para acceso rápido
      const ratingsMap: Record<string, { average_rating: number; review_count: number }> = {}
      for (const rating of ratingsRes.data || []) {
        ratingsMap[rating.business_id] = {
          average_rating: rating.average_rating,
          review_count: rating.review_count
        }
      }

      // Combinar businesses con sus ratings
      const businessesWithReviews = (businessesRes.data || []).map(business => {
        const ratings = ratingsMap[business.id]
        return {
          ...business,
          average_rating: ratings?.average_rating || 0,
          review_count: ratings?.review_count || 0
        }
      })

      setBusinesses(businessesWithReviews)
    } catch (err) {
      console.error('Error fetching businesses:', err)
      setError('No se pudieron cargar los negocios. Por favor, intenta recargar la página.')
    } finally {
      setLoading(false)
    }
  }

  // Memoize filtered businesses to avoid recalculating on every render
  const filteredBusinesses = useMemo(() => {
    const filtered = businesses.filter(business => {
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           business.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           business.business_categories?.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || business.business_category_id === selectedCategory
      const matchesRating = ratingFilter === 0 || (business.average_rating || 0) >= ratingFilter
      return matchesSearch && matchesCategory && matchesRating
    })
    
    // Sort by rating (highest first), then by review count
    return filtered.sort((a, b) => {
      const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0)
      if (ratingDiff !== 0) return ratingDiff
      return (b.review_count || 0) - (a.review_count || 0)
    })
  }, [businesses, searchQuery, selectedCategory, ratingFilter])

  // Memoize filter count
  const activeFiltersCount = useMemo(() => {
    return [
      selectedCategory ? 1 : 0,
      ratingFilter > 0 ? 1 : 0
    ].reduce((sum, val) => sum + val, 0)
  }, [selectedCategory, ratingFilter])

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50">
        <header className="flex-shrink-0 bg-white border-b border-gray-200 z-20 shadow-sm">
            <div className="container mx-auto px-4 space-y-3 py-4">
                <div className="flex flex-col md:flex-row items-center gap-3">
                    {/* Back Button + Logo */}
                    <div className="w-full md:w-auto flex items-center gap-3 flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.back()}
                            className="h-10 px-3 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            <span className="hidden sm:inline">Volver</span>
                        </Button>
                        <div className="h-6 w-px bg-gray-200" />
                        <Link href="/">
                            <Logo color="slate" size="sm" className="md:hidden" />
                            <Logo color="slate" size="md" className="hidden md:block" />
                        </Link>
                    </div>
                    {/* Search Input */}
                    <div className="w-full flex-grow relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-slate-900" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre, ubicación o categoría..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full h-12 text-base bg-gray-50 border-gray-200 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20 transition-all duration-200"
                        />
                    </div>
                    {/* Category Dropdown */}
                    <div className="w-full md:w-auto">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button   variant="outline"
  className="
    w-full h-12
    border-gray-300
    text-gray-700
    hover:border-slate-400
    hover:bg-slate-100
    hover:text-gray-900
    transition-all
    duration-300
    ease-out
  ">
                                    {selectedCategory 
                                        ? categories.find(c => c.id === selectedCategory)?.name 
                                        : 'Todas las categorías'}
                                    <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem 
                                    onClick={() => setSelectedCategory('')}
                                    className="cursor-pointer"
                                >
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Todas las categorías
                                    {!selectedCategory && <Check className="w-4 h-4 ml-auto" />}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {categories.map((category) => {
                                    const CategoryIcon = getCategoryIcon(category.name)
                                    const isSelected = selectedCategory === category.id
                                    return (
                                        <DropdownMenuItem
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category.id)}
                                            className="cursor-pointer"
                                        >
                                            <CategoryIcon className="w-4 h-4 mr-2" />
                                            {category.name}
                                            {isSelected && <Check className="w-4 h-4 ml-auto" />}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    {/* Filter Button */}
                    <div className="w-full md:w-auto relative">
                        <Button  variant="outline"
  className="
    w-full h-12
    border-gray-300
    text-gray-700
    hover:border-slate-400
    hover:bg-slate-100
    hover:text-gray-900
    transition-all
    duration-300
    ease-out
  " onClick={() => setIsFilterSheetOpen(true)}>
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {activeFiltersCount > 0 && (
                                <Badge className="ml-2 bg-slate-900 hover:bg-slate-800 text-white">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </header>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
            <div className="lg:col-span-2 overflow-y-auto border-r border-gray-200">
                <div className="p-4">
                    <div className="px-2 mb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {filteredBusinesses.length}
                                    <span className="font-normal text-gray-500 ml-1">
                                        {filteredBusinesses.length === 1 ? 'negocio' : 'negocios'}
                                    </span>
                                </h2>

                                {/* Filtros activos como chips */}
                                {(selectedCategory || ratingFilter > 0) && (
                                    <div className="hidden sm:flex items-center gap-2">
                                        {selectedCategory && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-700 text-xs font-medium rounded-full">
                                                {categories.find(c => c.id === selectedCategory)?.name}
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setSelectedCategory('') }}
                                                    className="ml-0.5 hover:text-slate-900"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                        {ratingFilter > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                                                <Star className="w-3 h-3 fill-current" />
                                                {ratingFilter}+
                                                <button
                                                    onClick={(e) => { e.preventDefault(); setRatingFilter(0) }}
                                                    className="ml-0.5 hover:text-amber-900"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Botón limpiar todos */}
                            {(selectedCategory || ratingFilter > 0 || searchQuery) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('')
                                        setSelectedCategory('')
                                        setRatingFilter(0)
                                    }}
                                    className="text-xs text-gray-500 hover:text-slate-900 transition-colors"
                                >
                                    Limpiar todo
                                </button>
                            )}
                        </div>
                    </div>

                    {error ? (
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-red-900 mb-1">Error al cargar negocios</h3>
                                        <p className="text-sm text-red-700 mb-4">{error}</p>
                                        <Button
                                            onClick={fetchBusinesses}
                                            variant="outline"
                                            size="sm"
                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                        >
                                            <RefreshCw className="w-4 h-4 mr-2" />
                                            Reintentar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[...Array(6)].map((_, i) => <BusinessCardSkeleton key={i} />)}
                        </div>
                    ) : filteredBusinesses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-6">
                            {/* Icono con fondo */}
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-slate-100 rounded-full blur-xl opacity-60"></div>
                                <div className="relative w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-slate-100">
                                    <Search className="w-10 h-10 text-slate-400" />
                                </div>
                            </div>

                            <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                                No encontramos resultados
                            </h3>

                            <p className="text-gray-500 text-center max-w-sm mb-6 leading-relaxed">
                                No hay negocios que coincidan con tu búsqueda
                                {searchQuery && (
                                    <span className="block mt-1">
                                        para "<span className="font-medium text-gray-700">{searchQuery}</span>"
                                    </span>
                                )}
                            </p>

                            {/* Acciones */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                {(searchQuery || selectedCategory || ratingFilter > 0) && (
                                    <Button
                                        onClick={() => {
                                            setSearchQuery('')
                                            setSelectedCategory('')
                                            setRatingFilter(0)
                                        }}
                                        variant="outline"
                                        className="border-slate-200 text-slate-900 hover:bg-slate-50"
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Limpiar filtros
                                    </Button>
                                )}
                                <Button
                                    onClick={fetchBusinesses}
                                    className="bg-slate-900 hover:bg-slate-800 text-white"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Recargar
                                </Button>
                            </div>

                            {/* Sugerencias */}
                            <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-md">
                                <p className="text-xs text-gray-400 text-center uppercase tracking-wider mb-3">
                                    Sugerencias
                                </p>
                                <ul className="text-sm text-gray-500 space-y-2">
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                        Verifica la ortografía de tu búsqueda
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                        Prueba con términos más generales
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
                                        Explora diferentes categorías
                                    </li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredBusinesses.map((business, index) => (
                                <div
                                    key={business.id}
                                    ref={el => { cardRefs.current[business.id] = el }}
                                >
                                    <BusinessCard
                                        business={business}
                                        index={index}
                                        isHovered={hoveredBusinessId === business.id || clickedBusinessId === business.id}
                                        onMouseEnter={() => setHoveredBusinessId(business.id)}
                                        onMouseLeave={() => setHoveredBusinessId(null)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="hidden lg:block lg:col-span-3 relative">
                <MarketplaceMap
                    businesses={filteredBusinesses}
                    hoveredBusinessId={hoveredBusinessId}
                    setHoveredBusinessId={handleSetHoveredBusinessId}
                    onMarkerClick={handleMarkerClick}
                />
            </div>
        </div>

        {/* Mobile Map Overlay */}
        {showMobileMap && (
            <div className="lg:hidden fixed inset-0 z-40 bg-white">
                <div className="absolute top-4 left-4 z-50">
                    <Button
                        onClick={() => setShowMobileMap(false)}
                        variant="outline"
                        size="sm"
                        className="rounded-full bg-white shadow-lg border-gray-200 hover:bg-gray-50 h-10 px-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver a lista
                    </Button>
                </div>
                <MarketplaceMap
                    businesses={filteredBusinesses}
                    hoveredBusinessId={hoveredBusinessId}
                    setHoveredBusinessId={handleSetHoveredBusinessId}
                    onMarkerClick={(id) => {
                        handleMarkerClick(id)
                        setShowMobileMap(false)
                    }}
                />
            </div>
        )}

        {/* Mobile Toggle Button */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <Button
                onClick={() => setShowMobileMap(!showMobileMap)}
                className="rounded-full shadow-xl bg-slate-900 hover:bg-slate-800 text-white px-6 h-12 font-medium transition-all duration-200 active:scale-95"
                size="lg"
            >
                {showMobileMap ? (
                    <>
                        <List className="w-5 h-5 mr-2" />
                        Ver Lista
                    </>
                ) : (
                    <>
                        <Map className="w-5 h-5 mr-2" />
                        Ver Mapa
                    </>
                )}
            </Button>
        </div>

        <FilterSheet
            isOpen={isFilterSheetOpen}
            onOpenChange={setIsFilterSheetOpen}
            ratingFilter={ratingFilter}
            setRatingFilter={setRatingFilter}
        />
    </div>
  )
}

const BusinessCard = React.memo(({ business, isHovered, onMouseEnter, onMouseLeave, index }: { business: Business, isHovered: boolean, onMouseEnter: () => void, onMouseLeave: () => void, index: number }) => {
    const CategoryIcon = useMemo(
        () => getCategoryIcon(business.business_categories?.name),
        [business.business_categories?.name]
    )

    const businessStatus = useMemo(
        () => getBusinessStatus(business.business_hours),
        [business.business_hours]
    )

    // Priorizar primeras 6 imágenes (above the fold)
    const shouldPrioritize = index < 6

    return (
      <Link href={`/business/${business.id}`}>
        <Card
            className={`group relative overflow-hidden h-full flex flex-col bg-white border border-gray-100 transition-all duration-300 ease-out cursor-pointer ${
                isHovered
                    ? 'shadow-xl shadow-slate-900/10 border-slate-400 -translate-y-1'
                    : 'hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 hover:-translate-y-0.5'
            }`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Overlay sutil en hover */}
            <div className={`absolute inset-0 bg-slate-900/[0.02] pointer-events-none transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

            <div className="relative w-full overflow-hidden">
                <AspectRatio ratio={16 / 10}>
                    {business.cover_image_url ? (
                        <>
                            <Image 
                                src={business.cover_image_url} 
                                alt={business.name}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                                priority={shouldPrioritize}
                                loading={shouldPrioritize ? undefined : 'lazy'}
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgZmlsbD0iI2YzZjRmNiIvPjwvc3ZnPg=="
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <Building2 className="w-10 h-10 text-gray-300" />
                        </div>
                    )}
                </AspectRatio>
                {/* Badge de categoría flotante */}
                <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                        <CategoryIcon className="w-3.5 h-3.5" />
                        {business.business_categories?.name || 'Negocio'}
                    </span>
                </div>
            </div>
            <CardContent className="p-4 flex flex-col flex-grow relative">
                <h3 className={`font-semibold text-lg leading-tight mb-1 transition-colors duration-200 truncate ${isHovered ? 'text-slate-900' : 'text-gray-900'}`}>
                    {business.name}
                </h3>
                <div className="flex items-center gap-1.5 text-gray-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <p className="text-sm truncate">{business.address || 'Sin dirección'}</p>
                </div>
                {/* Estado abierto/cerrado */}
                {businessStatus && (
                    <div className="mb-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                            businessStatus.isOpen
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                        }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${businessStatus.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
                            {businessStatus.message}
                        </span>
                    </div>
                )}
                <div className="flex-grow"></div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    {business.average_rating && business.average_rating > 0 ? (
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                <span className="font-semibold text-amber-700">{business.average_rating.toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-gray-400">({business.review_count})</span>
                        </div>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Sin reseñas aún</span>
                    )}
                    <ChevronRight className={`w-5 h-5 text-gray-300 transition-all duration-200 ${isHovered ? 'text-slate-900 translate-x-1' : 'group-hover:text-gray-400'}`} />
                </div>
            </CardContent>
        </Card>
      </Link>
    )
})

BusinessCard.displayName = 'BusinessCard'

const BusinessCardSkeleton = React.memo(() => (
    <Card className="overflow-hidden h-full flex flex-col">
        <AspectRatio ratio={16 / 10}>
            <div className="w-full h-full bg-slate-200 animate-pulse"></div>
        </AspectRatio>
        <CardContent className="p-4 space-y-3">
            <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-6 w-3/4 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
            <div className="h-8 w-2/5 bg-slate-200 rounded-full animate-pulse mt-2"></div>
        </CardContent>
    </Card>
))

BusinessCardSkeleton.displayName = 'BusinessCardSkeleton'