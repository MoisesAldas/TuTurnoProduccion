'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Search, MapPin, Star, Filter, Map, Building2, Sparkles, ChevronRight, AlertCircle, RefreshCw, ArrowLeft, List, X, ChevronDown, Check, Navigation } from 'lucide-react'
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

// --- Proximity Feature Modules ---
import { useGeolocation } from '@/app/marketplace/hooks/useGeolocation'
import { useNearbyBusinesses } from '@/app/marketplace/hooks/useNearbyBusinesses'
import GeolocationPrompt from '@/app/marketplace/components/GeolocationPrompt'
import RadiusSlider from '@/app/marketplace/components/RadiusSlider'
import DistanceBadge from '@/app/marketplace/components/DistanceBadge'

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
  distance_km?: number // Added for proximity sorting
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

  const formatTo12h = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const ampm = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  const getHoursUntilOpen = (openTime: string) => {
    const [openHour, openMinute] = openTime.split(':').map(Number)
    const nowMinutes = currentHour * 60 + currentMinute
    const openMinutes = openHour * 60 + openMinute
    const diffMinutes = openMinutes - nowMinutes
    return Math.ceil(diffMinutes / 60)
  }

  if (!todayHours || todayHours.is_closed) {
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

  // --- Proximity State ---
  const [sortMode, setSortMode] = useState<'cercanos' | 'valorados'>('valorados')
  const [radiusKm, setRadiusKm] = useState<number>(10)

  // Hooks for proximity
  const geo = useGeolocation()
  const isGeolocationActive = geo.status === 'granted'

  const { data: nearbyBusinesses, loading: nearbyLoading } = useNearbyBusinesses({
    coords: geo.coords,
    radiusKm,
    enabled: isGeolocationActive,
  })

  // When geolocation is granted, auto-switch to nearby sort
  useEffect(() => {
    if (isGeolocationActive) {
      setSortMode('cercanos')
    }
  }, [isGeolocationActive])

  const supabase = createClient()

  const handleSetHoveredBusinessId = useCallback((id: string | null) => {
    setHoveredBusinessId(id)
  }, [])

  const handleMarkerClick = useCallback((id: string) => {
    setClickedBusinessId(id)
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchBusinesses()
  }, [])

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
      })
      setHoveredBusinessId(clickedBusinessId)
      const timer = setTimeout(() => {
        setHoveredBusinessId(null)
        setClickedBusinessId(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [clickedBusinessId])

  const fetchCategories = async () => {
    try {
      const CACHE_KEY = 'marketplace_categories'
      const CACHE_EXPIRY = 60 * 60 * 1000
      const cachedData = localStorage.getItem(CACHE_KEY)
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData)
        if (Date.now() - timestamp <= CACHE_EXPIRY) {
          setCategories(data)
          return
        }
      }
      const { data, error } = await supabase.from('business_categories').select('*').order('name', { ascending: true })
      if (error) throw error
      setCategories(data || [])
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: data || [], timestamp: Date.now() }))
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      setError(null)

      const [businessesRes, ratingsRes] = await Promise.all([
        supabase
          .from('businesses')
          .select(`*, business_categories (*), business_hours (day_of_week, open_time, close_time, is_closed)`)
          .eq('is_active', true)
          .eq('is_suspended', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('business_ratings_summary')
          .select('business_id, average_rating, review_count')
      ])

      if (businessesRes.error) throw businessesRes.error

      const ratingsMap: Record<string, { average_rating: number; review_count: number }> = {}
      for (const rating of ratingsRes.data || []) {
        ratingsMap[rating.business_id] = {
          average_rating: rating.average_rating,
          review_count: rating.review_count
        }
      }

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

  // Decide which business list to use and apply filters
  const filteredBusinesses = useMemo(() => {
    // If geolocation is active and nearby mode is selected, merge nearby data
    const baseList: Business[] = sortMode === 'cercanos' && isGeolocationActive
      ? nearbyBusinesses.map(nb => {
          // Find the full business data (with hours, categories, etc.) from the base list
          const full = businesses.find(b => b.id === nb.id)
          return full
            ? { ...full, distance_km: nb.distance_km }
            : { ...nb } as Business
        })
      : businesses

    const filtered = baseList.filter(business => {
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           business.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           business.business_categories?.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || business.business_category_id === selectedCategory
      const matchesRating = ratingFilter === 0 || (business.average_rating || 0) >= ratingFilter
      return matchesSearch && matchesCategory && matchesRating
    })

    if (sortMode === 'cercanos' && isGeolocationActive) {
      // Sort by proximity
      return filtered.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity))
    } else {
      // Sort by rating (original behavior)
      return filtered.sort((a, b) => {
        const ratingDiff = (b.average_rating || 0) - (a.average_rating || 0)
        if (ratingDiff !== 0) return ratingDiff
        return (b.review_count || 0) - (a.review_count || 0)
      })
    }
  }, [businesses, nearbyBusinesses, searchQuery, selectedCategory, ratingFilter, sortMode, isGeolocationActive])

  const activeFiltersCount = useMemo(() => {
    return [
      selectedCategory ? 1 : 0,
      ratingFilter > 0 ? 1 : 0
    ].reduce((sum, val) => sum + val, 0)
  }, [selectedCategory, ratingFilter])

  const isLoadingBusinesses = loading || (sortMode === 'cercanos' && nearbyLoading)

  return (
    <div className="h-screen w-full overflow-x-hidden flex flex-col bg-slate-50">
      {/* Header */}
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
            <div className="w-full flex-grow relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por nombre, ubicación o categoría..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 w-full h-12 text-base rounded-xl bg-slate-50 border-gray-200 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200 shadow-none transition-all duration-200"
              />
            </div>

            {/* Category + Filter row — share a single row on mobile */}
            <div className="w-full md:contents flex gap-2">
              {/* Category Dropdown */}
              <div className="flex-1 md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full h-12 px-5 rounded-xl border-gray-200 bg-white text-slate-800 font-semibold text-base shadow-none hover:bg-gray-50 hover:border-gray-300 hover:text-slate-800 transition-colors duration-200">
                      <span className="truncate max-w-[130px] sm:max-w-none">
                        {selectedCategory
                          ? categories.find(c => c.id === selectedCategory)?.name
                          : 'Categorías'}
                      </span>
                      <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setSelectedCategory('')} className="cursor-pointer">
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
              <div className="flex-1 md:w-auto relative">
                <Button variant="outline" className="w-full h-12 px-5 rounded-xl border-gray-200 bg-white text-slate-800 font-semibold text-base shadow-none hover:bg-gray-50 hover:border-gray-300 hover:text-slate-800 transition-colors duration-200" onClick={() => setIsFilterSheetOpen(true)}>
                  <Filter className="w-[18px] h-[18px] mr-2 text-slate-500 flex-shrink-0" />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <Badge className="ml-2 bg-slate-900 hover:bg-slate-800 text-white text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>


        </div>
      </header>

      {/* Geolocation Prompt Banner */}
      <GeolocationPrompt
        status={geo.status}
        onRequest={geo.request}
        onDismiss={geo.dismiss}
      />

      {/* Main Content */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
        {/* Business List */}
        <div className="lg:col-span-2 overflow-y-auto scrollbar-hide border-r border-gray-200">
          <div className="p-4">

            {/* Proximity Controls — inside left panel */}
            <AnimatePresence>
            {isGeolocationActive && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex flex-col gap-2 mb-2 pb-2 border-b border-gray-100"
              >
                {/* Sort Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start">
                  <button
                    onClick={() => setSortMode('cercanos')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      sortMode === 'cercanos'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Navigation className="w-3 h-3 flex-shrink-0" />
                    Más cercanos
                  </button>
                  <button
                    onClick={() => setSortMode('valorados')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      sortMode === 'valorados'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Star className="w-3 h-3 flex-shrink-0" />
                    Mejor valorados
                  </button>
                </div>

                {/* Radius Slider — full width row below toggle */}
                {sortMode === 'cercanos' && (
                  <div className="w-full">
                    <RadiusSlider
                      value={radiusKm}
                      onChange={setRadiusKm}
                      disabled={nearbyLoading}
                      businessCount={filteredBusinesses.length}
                    />
                  </div>
                )}
              </motion.div>
            )}
            </AnimatePresence>

            {(selectedCategory || ratingFilter > 0 || searchQuery) && (
              <div className="flex items-center justify-between px-2 mb-3">
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
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('')
                    setRatingFilter(0)
                  }}
                  className="text-xs text-gray-500 hover:text-slate-900 transition-colors ml-auto"
                >
                  Limpiar todo
                </button>
              </div>
            )}

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
            ) : isLoadingBusinesses ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => <BusinessCardSkeleton key={i} />)}
              </div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-slate-100 rounded-full blur-xl opacity-60"></div>
                  <div className="relative w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-slate-100">
                    {sortMode === 'cercanos' ? (
                      <MapPin className="w-10 h-10 text-slate-400" />
                    ) : (
                      <Search className="w-10 h-10 text-slate-400" />
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                  {sortMode === 'cercanos'
                    ? `Sin negocios en ${radiusKm} km`
                    : 'No encontramos resultados'}
                </h3>

                <p className="text-gray-500 text-center max-w-sm mb-6 leading-relaxed">
                  {sortMode === 'cercanos'
                    ? 'Intenta ampliar el radio de búsqueda para encontrar más negocios.'
                    : 'No hay negocios que coincidan con tu búsqueda.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  {sortMode === 'cercanos' && (
                    <Button
                      onClick={() => setRadiusKm(50)}
                      variant="outline"
                      className="border-slate-200 text-slate-900 hover:bg-slate-50"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Ampliar a 50 km
                    </Button>
                  )}
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
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.07 } }
                }}
              >
                {filteredBusinesses.map((business, index) => (
                  <motion.div
                    key={business.id}
                    ref={el => { cardRefs.current[business.id] = el }}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
                    }}
                  >
                    <BusinessCard
                      business={business}
                      index={index}
                      isHovered={hoveredBusinessId === business.id || clickedBusinessId === business.id}
                      onMouseEnter={() => setHoveredBusinessId(business.id)}
                      onMouseLeave={() => setHoveredBusinessId(null)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Map */}
        <motion.div
          className="hidden lg:block lg:col-span-3 relative p-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
        >
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-sm">
            <MarketplaceMap
              businesses={filteredBusinesses}
              hoveredBusinessId={hoveredBusinessId}
              setHoveredBusinessId={handleSetHoveredBusinessId}
              onMarkerClick={handleMarkerClick}
              userCoords={geo.coords}
              radiusKm={radiusKm}
              showRadius={isGeolocationActive && sortMode === 'cercanos'}
            />
          </div>
        </motion.div>
      </div>

      {/* Mobile Map Overlay */}
      <AnimatePresence>
      {showMobileMap && (
        <motion.div
          className="lg:hidden fixed inset-0 z-40 bg-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
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
            userCoords={geo.coords}
            radiusKm={radiusKm}
            showRadius={isGeolocationActive && sortMode === 'cercanos'}
          />
        </motion.div>
      )}
      </AnimatePresence>
      {/* Mobile Toggle Button */}
      <motion.div
        className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
      >
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
      </motion.div>

      <FilterSheet
        isOpen={isFilterSheetOpen}
        onOpenChange={setIsFilterSheetOpen}
        ratingFilter={ratingFilter}
        setRatingFilter={setRatingFilter}
      />
    </div>
  )
}

const BusinessCard = React.memo(({ business, isHovered, onMouseEnter, onMouseLeave, index }: {
  business: Business
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  index: number
}) => {
  const CategoryIcon = useMemo(
    () => getCategoryIcon(business.business_categories?.name),
    [business.business_categories?.name]
  )

  const businessStatus = useMemo(
    () => getBusinessStatus(business.business_hours),
    [business.business_hours]
  )

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
          {/* Category badge */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur-md text-gray-700 shadow-md">
              {business.business_categories?.name || 'Negocio'}
            </span>
          </div>
        </div>

        <CardContent className="p-4 flex flex-col flex-grow relative">
          <h3 className={`font-semibold text-lg leading-tight mb-1 transition-colors duration-200 truncate ${isHovered ? 'text-slate-900' : 'text-gray-900'}`}>
            {business.name}
          </h3>

          {/* Address */}
          <div className="flex items-center gap-1.5 text-gray-500 mb-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <p className="text-sm truncate">{business.address || 'Sin dirección'}</p>
          </div>

          {/* Distance badge — shown below address when proximity mode is active */}
          {business.distance_km !== undefined && (
            <div className="mb-2">
              <DistanceBadge distanceKm={business.distance_km} />
            </div>
          )}

          {/* Open/closed status */}
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
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                {business.average_rating.toFixed(1)}
                <span className="font-normal text-amber-600">({business.review_count})</span>
              </span>
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