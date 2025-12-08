'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Search, Target } from 'lucide-react'

// Importar estilos CSS de Mapbox
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

interface LocationData {
  address: string
  latitude: number
  longitude: number
  city?: string
  country?: string
}

interface MapboxLocationPickerProps {
  onLocationSelect: (location: LocationData) => void
  initialLocation?: LocationData
  className?: string
}

export default function MapboxLocationPicker({
  onLocationSelect,
  initialLocation,
  className = ''
}: MapboxLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const marker = useRef<mapboxgl.Marker | null>(null)
  const geocoder = useRef<MapboxGeocoder | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<LocationData>(
    initialLocation || {
      address: '',
      latitude: -0.2295, // Quito, Ecuador por defecto
      longitude: -78.5249,
    }
  )

  // Configurar Mapbox token
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Verificar que el token de Mapbox esté configurado
    if (!mapboxgl.accessToken) {
      console.error('Mapbox access token no está configurado')
      setMapError(true)
      setIsLoading(false)
      return
    }

    try {
      // Inicializar mapa
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11', // Estilo claro para mejor UX
        center: [currentLocation.longitude, currentLocation.latitude],
        zoom: 13,
        attributionControl: false,
      })
    } catch (error) {
      console.error('Error inicializando Mapbox:', error)
      setMapError(true)
      setIsLoading(false)
      return
    }

    // Crear marker arrastrable
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: '#ea580c', // Naranja para negocio
    })
      .setLngLat([currentLocation.longitude, currentLocation.latitude])
      .addTo(map.current)

    // Configurar geocoder
    geocoder.current = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl as any,
      countries: 'ec', // Limitado a Ecuador
      placeholder: 'Buscar dirección en Ecuador...',
      bbox: [-81.0, -5.0, -75.0, 2.0], // Bounding box de Ecuador
    })

    // Manejar eventos del marker
    marker.current.on('dragend', () => {
      if (!marker.current) return
      const lngLat = marker.current.getLngLat()
      handleLocationUpdate(lngLat.lat, lngLat.lng)
    })

    // Manejar clicks en el mapa
    map.current.on('click', (e) => {
      if (!marker.current) return
      const { lat, lng } = e.lngLat
      marker.current.setLngLat([lng, lat])
      handleLocationUpdate(lat, lng)
    })

    // Manejar resultados del geocoder
    geocoder.current.on('result', (e) => {
      const { center, place_name } = e.result
      const [lng, lat] = center

      if (marker.current) {
        marker.current.setLngLat([lng, lat])
      }

      if (map.current) {
        map.current.flyTo({ center: [lng, lat], zoom: 15 })
      }

      const locationData: LocationData = {
        address: place_name,
        latitude: lat,
        longitude: lng,
      }

      setCurrentLocation(locationData)
      onLocationSelect(locationData)
    })

    map.current.on('load', () => {
      setIsLoading(false)
    })

    // Limpiar al desmontar
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Función para actualizar ubicación con reverse geocoding
  const handleLocationUpdate = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxgl.accessToken}&country=ec&language=es`
      )

      const data = await response.json()
      const address = data.features[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`

      const locationData: LocationData = {
        address,
        latitude: lat,
        longitude: lng,
      }

      setCurrentLocation(locationData)
      onLocationSelect(locationData)
    } catch (error) {
      console.error('Error al obtener dirección:', error)
      // Fallback con coordenadas
      const locationData: LocationData = {
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: lat,
        longitude: lng,
      }

      setCurrentLocation(locationData)
      onLocationSelect(locationData)
    }
  }

  // Función para obtener ubicación actual del usuario
  const getCurrentLocation = () => {
    setIsLoading(true)

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords

          if (marker.current) {
            marker.current.setLngLat([longitude, latitude])
          }

          if (map.current) {
            map.current.flyTo({ center: [longitude, latitude], zoom: 15 })
          }

          handleLocationUpdate(latitude, longitude)
          setIsLoading(false)
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error)
          setIsLoading(false)
        }
      )
    } else {
      setIsLoading(false)
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Geocoder y controles */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
          Ubicación del Negocio *
        </Label>
        {!mapError && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            <Target className="w-4 h-4 mr-2" />
            Mi ubicación
          </Button>
        )}
      </div>

      {/* Campo manual de dirección cuando hay error con Mapbox */}
      {mapError ? (
        <div className="space-y-2">
          <Input
            placeholder="Ingresa la dirección de tu negocio manualmente"
            value={currentLocation.address}
            onChange={(e) => {
              const newLocation = { ...currentLocation, address: e.target.value }
              setCurrentLocation(newLocation)
              onLocationSelect(newLocation)
            }}
            className="h-9 text-sm bg-white/50 backdrop-blur-sm border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 hover:border-gray-300 transition-all"
          />
          <p className="text-xs text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-200 dark:border-amber-700">
            ⚠️ El mapa no está disponible. Ingresa tu dirección manualmente.
          </p>
        </div>
      ) : (
        /* Campo de búsqueda personalizado */
        <div
          id="geocoder-container"
          className="geocoder-container"
          ref={(el) => {
            if (el && geocoder.current && !el.hasChildNodes()) {
              el.appendChild(geocoder.current.onAdd(map.current!))
            }
          }}
        />
      )}

      {/* Mapa */}
      {!mapError && (
        <div className="relative">
          <div
            ref={mapContainer}
            className="w-full h-48 md:h-64 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
          />

          {isLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cargando mapa...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instrucciones compactas */}
      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <span className="font-medium text-orange-600 dark:text-orange-400">💡</span>
        {mapError ? (
          <span>Ingresa la dirección completa de tu negocio</span>
        ) : (
          <span>Busca, haz clic en el mapa o arrastra el pin naranja para ajustar</span>
        )}
      </div>

      <style jsx global>{`
        .mapboxgl-ctrl-geocoder {
          width: 100% !important;
          max-width: none !important;
          box-shadow: none !important;
          border: 1px solid #e5e7eb !important;
          border-radius: 0.5rem !important;
          font-size: 0.875rem !important;
        }

        .mapboxgl-ctrl-geocoder input {
          height: 2.25rem !important;
          padding-left: 2.5rem !important;
          background-color: rgba(255, 255, 255, 0.5) !important;
          backdrop-filter: blur(4px) !important;
          border: none !important;
          font-size: 0.875rem !important;
          pointer-events: auto !important;
        }

        [data-theme='dark'] .mapboxgl-ctrl-geocoder {
          border: 1px solid #374151 !important;
        }

        [data-theme='dark'] .mapboxgl-ctrl-geocoder input {
          background-color: rgba(55, 65, 81, 0.5) !important;
        }

        .mapboxgl-ctrl-geocoder input:focus {
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(234, 88, 12, 0.2) !important;
        }

        .mapboxgl-ctrl-geocoder .suggestions {
          border-radius: 0.5rem !important;
          border: 1px solid #e5e7eb !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
          margin-top: 0.25rem !important;
        }

        [data-theme='dark'] .mapboxgl-ctrl-geocoder .suggestions {
          border: 1px solid #374151 !important;
          background-color: #1f2937 !important;
        }

        [data-theme='dark'] .mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--suggestion {
          background-color: #1f2937 !important;
          color: #e5e7eb !important;
        }

        [data-theme='dark'] .mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--suggestion-active,
        [data-theme='dark'] .mapboxgl-ctrl-geocoder .mapboxgl-ctrl-geocoder--suggestion:hover {
          background-color: #374151 !important;
          color: #f9fafb !important;
        }

        .geocoder-container {
          position: relative;
          z-index: 1;
        }

        .mapboxgl-ctrl-geocoder--icon {
          fill: #9ca3af !important;
        }
      `}</style>
    </div>
  )
}