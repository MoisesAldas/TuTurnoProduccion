'use client'

import { useEffect, useRef, useState } from 'react'
import { X, MapPin, Navigation, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface LocationMapModalProps {
  isOpen: boolean
  onClose: () => void
  latitude: number
  longitude: number
  businessName: string
  address: string
}

export default function LocationMapModal({
  isOpen,
  onClose,
  latitude,
  longitude,
  businessName,
  address
}: LocationMapModalProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    console.log('🗺️ LocationMapModal useEffect triggered', {
      isOpen,
      hasContainer: !!mapContainer.current,
      latitude,
      longitude
    })

    if (!isOpen) {
      return
    }

    // Limpiar mapa existente si hay uno
    if (map.current) {
      console.log('🧹 Cleaning existing map')
      map.current.remove()
      map.current = null
      marker.current = null
    }

    setIsLoading(true)

    // Wait for Dialog animation and container to be ready
    const initializeMap = () => {
      if (!mapContainer.current) {
        console.log('⚠️ Container not ready')
        setIsLoading(false)
        return
      }

      console.log('✅ Initializing map...')

      // Initialize map
      mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

      if (!mapboxgl.accessToken) {
        console.error('❌ Mapbox token not found')
        setIsLoading(false)
        return
      }

      try {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 15,
          attributionControl: false
        })

        // Add controls and marker
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
        map.current.addControl(new mapboxgl.AttributionControl({ compact: true }))

        // Create custom marker
        const el = document.createElement('div')
        el.className = 'custom-marker'
        el.style.width = '40px'
        el.style.height = '40px'
        el.style.borderRadius = '50% 50% 50% 0'
        el.style.background = '#ea580c'
        el.style.border = '3px solid white'
        el.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)'
        el.style.transform = 'rotate(-45deg)'
        el.style.cursor = 'pointer'

        marker.current = new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              `<div style="padding: 8px;">
                <h3 style="font-weight: bold; margin-bottom: 4px; color: #ea580c;">${businessName}</h3>
                <p style="font-size: 14px; color: #6b7280;">${address}</p>
              </div>`
            )
          )
          .addTo(map.current)

        map.current.on('load', () => {
          console.log('✅ Map loaded!')
          setIsLoading(false)
        })

        map.current.on('error', (e) => {
          console.error('❌ Mapbox error:', e)
          setIsLoading(false)
        })
      } catch (error) {
        console.error('❌ Error initializing map:', error)
        setIsLoading(false)
      }
    }

    const timer = setTimeout(initializeMap, 100)

    return () => {
      clearTimeout(timer)
      if (marker.current) {
        marker.current.remove()
        marker.current = null
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [isOpen, latitude, longitude, businessName, address])

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    window.open(url, '_blank')
  }

  const openInWaze = () => {
    const url = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`
    window.open(url, '_blank')
  }

  const getDirections = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const from = `${position.coords.latitude},${position.coords.longitude}`
          const to = `${latitude},${longitude}`
          const url = `https://www.google.com/maps/dir/?api=1&origin=${from}&destination=${to}`
          window.open(url, '_blank')
        },
        () => {
          // Fallback if location permission denied
          openInGoogleMaps()
        }
      )
    } else {
      openInGoogleMaps()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[95vw] sm:w-full h-[95vh] sm:h-[90vh] p-0 gap-0 overflow-hidden bg-white flex flex-col">
        {/* DialogTitle y DialogDescription ocultos pero presentes para accesibilidad */}
        <DialogHeader className="sr-only">
          <DialogTitle>Ubicación de {businessName}</DialogTitle>
          <DialogDescription>
            Mapa interactivo mostrando la ubicación de {businessName} en {address}
          </DialogDescription>
        </DialogHeader>

        {/* Header Visual */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {businessName}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 truncate">{address}</p>
            </div>
          </div>
        </div>

        {/* Map Container - flex-1 para ocupar espacio disponible */}
        <div className="flex-1 relative bg-gray-100 min-h-0">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 z-10">
              <div className="text-center px-4">
                <div className="animate-spin w-10 h-10 sm:w-12 sm:h-12 border-4 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-3 sm:mb-4 shadow-lg"></div>
                <p className="text-sm sm:text-base font-medium text-gray-700">Cargando mapa...</p>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">Preparando la ubicación</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-4 sm:py-5 border-t bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <Button
              onClick={getDirections}
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Navigation className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Cómo Llegar</span>
            </Button>
            <Button
              onClick={openInGoogleMaps}
              size="lg"
              variant="outline"
              className="w-full border-2 hover:bg-gray-50 hover:border-gray-400 transition-all"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="text-sm sm:text-base">Google Maps</span>
            </Button>
            <Button
              onClick={openInWaze}
              size="lg"
              variant="outline"
              className="w-full border-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 transition-all"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2c-4.962 0-9 4.038-9 9 0 1.549.396 3.069 1.158 4.437L12 23l7.842-7.563C20.604 14.069 21 12.549 21 11c0-4.962-4.038-9-9-9zm0 12.5c-1.933 0-3.5-1.567-3.5-3.5s1.567-3.5 3.5-3.5 3.5 1.567 3.5 3.5-1.567 3.5-3.5 3.5z"/>
              </svg>
              <span className="text-sm sm:text-base">Waze</span>
            </Button>
          </div>

          {/* Hint Text - oculto en mobile */}
          <p className="hidden sm:block text-xs text-center text-gray-500 mt-3">
            Selecciona tu aplicación favorita para navegar hasta el negocio
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
