'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { Search, MapPin, Star, Filter, Map, Building2, Sparkles, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { getCategoryIcon } from '@/lib/categoryIcons'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/logo'
import FilterSheet from '@/components/FilterSheet'

// Lazy load Mapbox to save 500KB on initial bundle
const MarketplaceMap = dynamic(() => import('@/components/MarketplaceMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full mx-auto mb-2"></div>
        <p className="text-sm text-gray-500">Cargando mapa...</p>
      </div>
    </div>
  )
})

interface BusinessCategory {
  id: string
  name: string
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
  average_rating?: number
  review_count?: number
}

export default function MarketplacePage() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [categories, setCategories] = useState<BusinessCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [ratingFilter, setRatingFilter] = useState<number>(0)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

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
      const { data, error } = await supabase.from('business_categories').select('*').order('name', { ascending: true })
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: businessError } = await supabase
        .from('businesses')
        .select(`*, business_categories (*)`)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (businessError) throw businessError

      // Optimización: Fetch ratings en paralelo
      const businessesWithReviews = await Promise.all(
        (data || []).map(async (business) => {
          const [avgResult, countResult] = await Promise.all([
            supabase.rpc('get_business_average_rating', { p_business_id: business.id }),
            supabase.rpc('get_business_review_count', { p_business_id: business.id })
          ])
          return {
            ...business,
            average_rating: avgResult.data || 0,
            review_count: countResult.data || 0
          }
        })
      )

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
    return businesses.filter(business => {
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           business.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           business.business_categories?.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || business.business_category_id === selectedCategory
      const matchesRating = ratingFilter === 0 || (business.average_rating || 0) >= ratingFilter
      return matchesSearch && matchesCategory && matchesRating
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
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="w-full md:w-auto flex-shrink-0">
                        <Link href="/">
                            <Logo color="emerald" size="md" />
                        </Link>
                    </div>
                    <div className="w-full flex-grow relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Buscar por nombre, ubicación o categoría..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-full h-12 text-base focus:ring-emerald-500"
                        />
                    </div>
                    <div className="w-full md:w-auto relative">
                        <Button variant="outline" className="w-full h-12" onClick={() => setIsFilterSheetOpen(true)}>
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {activeFiltersCount > 0 && (
                                <Badge className="ml-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button
                        variant={!selectedCategory ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('')}
                        className={`flex-shrink-0 ${!selectedCategory ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Todos
                    </Button>
                    {categories.map((category) => (
                        <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedCategory(category.id)}
                            className={`flex-shrink-0 ${selectedCategory === category.id ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                        >
                            {category.name}
                        </Button>
                    ))}
                </div>
            </div>
        </header>

        <div className="flex-grow grid grid-cols-1 lg:grid-cols-5 overflow-hidden">
            <div className="lg:col-span-2 overflow-y-auto border-r border-gray-200">
                <div className="p-4">
                    <div className="px-2 mb-4 flex items-center justify-between">
                        <h2 className="font-semibold text-gray-800">{filteredBusinesses.length} resultados</h2>
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
                        <div className="flex flex-col items-center justify-center py-12 px-4">
                            <Building2 className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="font-semibold text-gray-700 mb-2">No se encontraron negocios</h3>
                            <p className="text-sm text-gray-500 text-center">
                                Intenta ajustar los filtros o la búsqueda
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filteredBusinesses.map(business => (
                                <div
                                    key={business.id}
                                    ref={el => { cardRefs.current[business.id] = el }}
                                >
                                    <BusinessCard
                                        business={business}
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

        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
            <Button className="rounded-full shadow-lg bg-gray-900 hover:bg-gray-800 text-white" size="lg">
                <Map className="w-5 h-5 mr-2" />
                Mapa
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

const BusinessCard = React.memo(({ business, isHovered, onMouseEnter, onMouseLeave }: { business: Business, isHovered: boolean, onMouseEnter: () => void, onMouseLeave: () => void }) => {
    const CategoryIcon = useMemo(
        () => getCategoryIcon(business.business_categories?.name),
        [business.business_categories?.name]
    )

    return (
      <Link href={`/business/${business.id}`}>
        <Card
            className={`group transition-all duration-200 cursor-pointer overflow-hidden h-full flex flex-col ${isHovered ? 'shadow-2xl border-emerald-500 scale-[1.02]' : 'hover:shadow-xl hover:border-emerald-300'}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="w-full">
                <AspectRatio ratio={16 / 10}>
                    {business.cover_image_url ? (
                        <Image src={business.cover_image_url} alt={business.name} layout="fill" className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized={true} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-100">
                            <Building2 className="w-10 h-10 text-slate-300" />
                        </div>
                    )}
                </AspectRatio>
            </div>
            <CardContent className="p-4 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-2">
                    <CategoryIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-medium text-gray-600">{business.business_categories?.name || 'Negocio'}</span>
                </div>
                <h3 className="font-bold text-lg text-gray-900 group-hover:text-emerald-700 transition-colors truncate">{business.name}</h3>
                <p className="text-sm text-gray-500 truncate mt-1">{business.address}</p>
                <div className="flex-grow"></div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    {business.average_rating && business.average_rating > 0 ? (
                        <Badge variant="outline" className="font-bold border-amber-300 bg-amber-50 text-amber-800">
                            <Star className="w-4 h-4 mr-1.5 text-amber-500 fill-amber-500" />
                            {business.average_rating.toFixed(1)}
                            <span className="ml-1.5 text-gray-500 font-normal text-xs">({business.review_count})</span>
                        </Badge>
                    ) : (
                        <Badge variant="secondary" className="text-xs">Sin reseñas</Badge>
                    )}
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