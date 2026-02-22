'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapRadiusLayer } from '@/app/marketplace/hooks/useMapRadiusLayer'

interface BusinessHours {
  day_of_week: number
  open_time: string
  close_time: string
  is_closed: boolean
}

interface MapBusiness {
  id: string
  name: string
  latitude?: number
  longitude?: number
  address?: string
  average_rating?: number
  review_count?: number
  cover_image_url?: string
  distance_km?: number
  business_categories?: { name: string } | null
  business_hours?: BusinessHours[]
}

interface UserCoords {
  lat: number
  lon: number
}

interface MarketplaceMapProps {
  businesses: MapBusiness[]
  hoveredBusinessId: string | null
  setHoveredBusinessId: (id: string | null) => void
  onMarkerClick: (id: string) => void
  userCoords?: UserCoords | null
  radiusKm?: number
  showRadius?: boolean
}

// Inline status calculator for use in popup HTML generation
function getStatusInfo(businessHours?: BusinessHours[]): { isOpen: boolean; message: string } | null {
  if (!businessHours || businessHours.length === 0) return null
  const now = new Date()
  const currentDay = now.getDay()
  const currentTime = now.toTimeString().substring(0, 5)

  const formatTo12h = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const ampm = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`
  }

  const todayHours = businessHours.find(h => h.day_of_week === currentDay)
  if (!todayHours || todayHours.is_closed) {
    for (let i = 1; i <= 7; i++) {
      const nextDay = (currentDay + i) % 7
      const nextDayHours = businessHours.find(h => h.day_of_week === nextDay)
      if (nextDayHours && !nextDayHours.is_closed) {
        return { isOpen: false, message: `Abre a las ${formatTo12h(nextDayHours.open_time.substring(0, 5))}` }
      }
    }
    return { isOpen: false, message: 'Cerrado' }
  }

  const openTime = todayHours.open_time.substring(0, 5)
  const closeTime = todayHours.close_time.substring(0, 5)

  if (currentTime >= openTime && currentTime < closeTime) {
    return { isOpen: true, message: `Abierto · cierra a las ${formatTo12h(closeTime)}` }
  } else if (currentTime < openTime) {
    return { isOpen: false, message: `Abre a las ${formatTo12h(openTime)}` }
  } else {
    const tomorrowHours = businessHours.find(h => h.day_of_week === (currentDay + 1) % 7)
    if (tomorrowHours && !tomorrowHours.is_closed) {
      return { isOpen: false, message: `Abre a las ${formatTo12h(tomorrowHours.open_time.substring(0, 5))}` }
    }
    return { isOpen: false, message: 'Cerrado' }
  }
}

function buildPopupHTML(business: MapBusiness): string {
  const status = getStatusInfo(business.business_hours)
  const hasRating = (business.average_rating ?? 0) > 0
  const categoryName = business.business_categories?.name ?? ''
  const distanceText = business.distance_km != null ? `${business.distance_km.toFixed(1)} km` : ''

  const imageSection = business.cover_image_url
    ? `<div style="width:100%;height:140px;overflow:hidden;position:relative;flex-shrink:0;border-radius:1.5rem 1.5rem 0 0;">
        <img src="${business.cover_image_url}" alt="${business.name}"
          style="width:100%;height:100%;object-fit:cover;display:block;" />
        ${categoryName ? `<span style="position:absolute;top:10px;left:10px;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);padding:3px 10px;border-radius:99px;font-size:9px;font-weight:900;color:#020617;text-transform:uppercase;letter-spacing:0.05em;box-shadow:0 2px 8px rgba(0,0,0,0.1);">${categoryName}</span>` : ''}
      </div>`
    : categoryName
      ? `<div style="background:#f8fafc;padding:12px 14px;border-bottom:1px solid #f1f5f9;border-radius:1.5rem 1.5rem 0 0;">
          <span style="font-size:9px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;">${categoryName}</span>
        </div>`
      : ''

  const statusHTML = status
    ? `<span style="display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;background:${status.isOpen ? '#ecfdf5' : '#fff1f2'};color:${status.isOpen ? '#065f46' : '#9f1239'};border:1px solid ${status.isOpen ? '#d1fae5' : '#ffe4e6'};">
        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${status.isOpen ? '#10b981' : '#f43f5e'};"></span>${status.isOpen ? 'Abierto' : status.message}
      </span>`
    : ''

  const ratingHTML = hasRating
    ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#fffbeb;border:1px solid #fef3c7;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:900;color:#92400e;box-shadow:0 2px 6px rgba(146,64,14,0.05);">
        <span style="color:#f59e0b;">★</span> ${(business.average_rating ?? 0).toFixed(1)}
        <span style="font-weight:600;color:#b45309;opacity:0.7;">(${business.review_count})</span>
      </span>`
    : `<span style="font-size:11px;color:#94a3b8;font-weight:600;italic">Sin reseñas</span>`

  const distHTML = distanceText
    ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#020617;color:#fff;padding:4px 12px;border-radius:99px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.02em;box-shadow:0 4px 12px rgba(2,6,23,0.15);">
        ${distanceText}
      </span>`
    : ''

  const addressHTML = business.address
    ? `<p style="font-size:11px;color:#64748b;margin:0 0 16px 0;line-height:1.5;font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-style:italic;">${business.address}</p>`
    : ''

  return `
    <div class="bp-card" style="border-radius:1.5rem;overflow:hidden;background:#fff;">
      ${imageSection}
      <div style="padding:16px 20px 20px;">
        <h3 style="font-weight:900;font-size:17px;margin:0 0 10px 0;color:#020617;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em;">${business.name}</h3>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          ${statusHTML}
          ${distHTML}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
          ${ratingHTML}
        </div>
        ${addressHTML}
        <a href="/business/${business.id}"
          style="display:block;width:100%;padding:12px 0;background:#020617;color:#fff;text-align:center;border-radius:14px;text-decoration:none;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;box-sizing:border-box;transition:all 0.3s ease;box-shadow:0 4px 12px rgba(2,6,23,0.1);"
          onmouseover="this.style.background='#ea580c';this.style.transform='translateY(-2px)'"
          onmouseout="this.style.background='#020617';this.style.transform='translateY(0)'">
          Ver Perfil
        </a>
      </div>
    </div>
  `
}

export default function MarketplaceMap({
  businesses,
  hoveredBusinessId,
  setHoveredBusinessId,
  onMarkerClick,
  userCoords,
  radiusKm = 10,
  showRadius = false,
}: MarketplaceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitializedBoundsRef = useRef(false)
  const [mapLoaded, setMapLoaded] = useState(false)

  useMapRadiusLayer({
    mapRef: map,
    mapLoaded,
    centerLon: userCoords?.lon ?? null,
    centerLat: userCoords?.lat ?? null,
    radiusKm,
    visible: showRadius,
  })

  const setHoveredBusinessIdRef = useRef(setHoveredBusinessId)
  const onMarkerClickRef = useRef(onMarkerClick)
  const prevBusinessIdsRef = useRef<string>('')

  useEffect(() => {
    setHoveredBusinessIdRef.current = setHoveredBusinessId
  }, [setHoveredBusinessId])

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick
  }, [onMarkerClick])

  // Initialize map
  useEffect(() => {
    if (map.current || !mapContainer.current) return

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
    if (!mapboxgl.accessToken) {
      console.error('Mapbox token not found')
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-78.4678, -0.1807],
      zoom: 12,
    })

    map.current.on('load', () => {
      console.log('🗺️ MarketplaceMap: Map loaded, ready for markers')
      setMapLoaded(true)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      setMapLoaded(false)
    }
  }, [])

  // Add/update markers when businesses change
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const currentMarkerIds = Object.keys(markersRef.current)
    const newBusinessIds = businesses.filter(b => b.latitude && b.longitude).map(b => b.id)
    const newBusinessIdsHash = newBusinessIds.sort().join(',')

    if (prevBusinessIdsRef.current === newBusinessIdsHash) {
      console.log('🛑 MarketplaceMap: Business list unchanged, skipping marker recreation')
      return
    }

    console.log('🔄 MarketplaceMap: Business list changed, updating markers')
    prevBusinessIdsRef.current = newBusinessIdsHash

    currentMarkerIds.forEach(id => {
      if (!newBusinessIds.includes(id)) {
        markersRef.current[id].remove()
        delete markersRef.current[id]
      }
    })

    let boundsChanged = false
    const bounds = new mapboxgl.LngLatBounds()

    businesses.forEach(business => {
      if (business.latitude && business.longitude) {
        if (markersRef.current[business.id]) {
          bounds.extend([business.longitude, business.latitude])
          return
        }

        boundsChanged = true

        const el = document.createElement('div')
        el.className = 'marker'
        el.style.cursor = 'pointer'

        const innerWrapper = document.createElement('div')
        innerWrapper.className = 'marker-inner'
        innerWrapper.style.transformOrigin = 'center bottom'
        innerWrapper.style.transition = 'transform 0.2s ease-out'
        innerWrapper.innerHTML = `
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#0f172a" stroke="#FFFFFF" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
          </svg>
        `
        el.appendChild(innerWrapper)

        const marker = new mapboxgl.Marker(el)
          .setLngLat([business.longitude, business.latitude])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              closeButton: false,
              closeOnClick: false,
              className: 'business-popup',
            }).setHTML(buildPopupHTML(business))
          )
          .addTo(map.current!)

        const markerElement = marker.getElement()
        if (!marker.getPopup()) return

        markerElement.addEventListener('mouseenter', () => {
          setHoveredBusinessIdRef.current(business.id)
        })
        markerElement.addEventListener('mouseleave', () => {
          setHoveredBusinessIdRef.current(null)
        })
        markerElement.addEventListener('click', e => {
          e.stopPropagation()
          marker.togglePopup()
          onMarkerClickRef.current(business.id)
        })

        markersRef.current[business.id] = marker
        bounds.extend([business.longitude, business.latitude])
      }
    })

    if (boundsChanged && !bounds.isEmpty() && !hasInitializedBoundsRef.current) {
      hasInitializedBoundsRef.current = true
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 })
    }
  }, [businesses, mapLoaded])

  // User location marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !userCoords) return

    if (userMarkerRef.current) {
      userMarkerRef.current.remove()
      userMarkerRef.current = null
    }

    const el = document.createElement('div')
    el.style.cssText = `
      width: 20px; height: 20px; border-radius: 50%;
      background: #2563eb; border: 3px solid white;
      box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
      animation: user-pulse 1.8s infinite;
      cursor: default;
    `

    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([userCoords.lon, userCoords.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 20, closeButton: false })
          .setHTML('<div style="font-size:13px; font-weight:600; padding:4px 8px; color:#1e293b;">📍 Tú estás aquí</div>')
      )
      .addTo(map.current!)

    if (!hasInitializedBoundsRef.current) {
      map.current.flyTo({ center: [userCoords.lon, userCoords.lat], zoom: 13, duration: 1200, essential: true })
    }

    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove()
        userMarkerRef.current = null
      }
    }
  }, [userCoords, mapLoaded])

  // Highlight marker on hover
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const element = marker.getElement()
      const innerElement = element.querySelector('.marker-inner') as HTMLElement
      if (!innerElement) return
      if (id === hoveredBusinessId) {
        innerElement.style.transform = 'scale(1.3)'
        element.style.zIndex = '10'
      } else {
        innerElement.style.transform = 'scale(1)'
        element.style.zIndex = '1'
      }
    })
  }, [hoveredBusinessId])

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      <style jsx global>{`
        .mapboxgl-popup {
          z-index: 999 !important;
        }
        .business-popup .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 16px !important;
          overflow: hidden !important;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(15, 23, 42, 0.08) !important;
          border: 1px solid #e2e8f0 !important;
          width: 264px !important;
          background: #ffffff !important;
        }
        .business-popup .mapboxgl-popup-tip {
          border-top-color: #ffffff !important;
        }
        .bp-card {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #ffffff;
          color: #0f172a;
        }
        @keyframes user-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70%  { box-shadow: 0 0 0 12px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>
    </>
  )
}
