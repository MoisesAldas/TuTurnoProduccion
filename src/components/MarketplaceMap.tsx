'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapBusiness {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  average_rating?: number;
  review_count?: number;
}

interface MarketplaceMapProps {
  businesses: MapBusiness[];
  hoveredBusinessId: string | null;
  setHoveredBusinessId: (id: string | null) => void;
  onMarkerClick: (id: string) => void; // New prop for click events
}

export default function MarketplaceMap({ businesses, hoveredBusinessId, setHoveredBusinessId, onMarkerClick }: MarketplaceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedBoundsRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Use refs to store latest callback functions to avoid recreating markers
  const setHoveredBusinessIdRef = useRef(setHoveredBusinessId);
  const onMarkerClickRef = useRef(onMarkerClick);

  // Store previous business IDs to detect real changes
  const prevBusinessIdsRef = useRef<string>('');

  // Keep refs up to date
  useEffect(() => {
    setHoveredBusinessIdRef.current = setHoveredBusinessId;
  }, [setHoveredBusinessId]);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  // Effect for initializing the map
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

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
    });

    // Wait for map to be fully loaded before adding markers
    map.current.on('load', () => {
      console.log('🗺️ MarketplaceMap: Map loaded, ready for markers');
      setMapLoaded(true);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      setMapLoaded(false);
    };
  }, []);

  // Effect for adding/updating markers when businesses change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Get current marker IDs and create a hash to detect real changes
    const currentMarkerIds = Object.keys(markersRef.current);
    const newBusinessIds = businesses
      .filter(b => b.latitude && b.longitude)
      .map(b => b.id);

    // Create a sorted string hash of business IDs to detect if list actually changed
    const newBusinessIdsHash = newBusinessIds.sort().join(',');

    // If the business list hasn't actually changed, skip everything
    if (prevBusinessIdsRef.current === newBusinessIdsHash) {
      console.log('🛑 MarketplaceMap: Business list unchanged, skipping marker recreation');
      return;
    }

    console.log('🔄 MarketplaceMap: Business list changed, updating markers');
    // Update the previous hash
    prevBusinessIdsRef.current = newBusinessIdsHash;

    // Remove markers that are no longer in the business list
    currentMarkerIds.forEach(id => {
      if (!newBusinessIds.includes(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Only fit bounds if markers were actually added or removed
    let boundsChanged = false;
    const bounds = new mapboxgl.LngLatBounds();

    businesses.forEach(business => {
      if (business.latitude && business.longitude) {
        // Skip if marker already exists
        if (markersRef.current[business.id]) {
          bounds.extend([business.longitude, business.latitude]);
          return;
        }

        boundsChanged = true;

        const el = document.createElement('div');
        el.className = 'marker';
        el.style.cursor = 'pointer';

        // Create an inner wrapper for scaling to avoid interfering with Mapbox positioning
        const innerWrapper = document.createElement('div');
        innerWrapper.className = 'marker-inner';
        innerWrapper.style.transformOrigin = 'center bottom';
        innerWrapper.style.transition = 'transform 0.2s ease-out';
        innerWrapper.innerHTML = `
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#0f172a" stroke="#FFFFFF" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
          </svg>
        `;
        el.appendChild(innerWrapper);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([business.longitude, business.latitude])
          .setPopup(
            new mapboxgl.Popup({
              offset: 25,
              closeButton: false,
              closeOnClick: false,
              className: 'business-popup'
            }).setHTML(
              `
              <div style="font-family: sans-serif; min-width: 220px; padding: 12px;">
                <h3 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 8px 0; color: #1f2937; line-height: 1.3;">${business.name}</h3>
                ${business.average_rating && business.average_rating > 0 ? `
                <div style="display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: #4b5563; margin-bottom: 12px;">
                  <span style="color: #f59e0b; font-size: 1rem;">★</span>
                  <span style="font-weight: 700; color: #1f2937;">${business.average_rating.toFixed(1)}</span>
                  <span style="color: #9ca3af;">(${business.review_count} reseñas)</span>
                </div>
                ` : '<p style="font-size: 0.875rem; color: #9ca3af; margin-bottom: 12px;">Sin reseñas aún</p>'}
                ${business.address ? `<p style="font-size: 0.8125rem; color: #6b7280; margin-bottom: 12px; line-height: 1.4;">${business.address}</p>` : ''}
                <a href="/business/${business.id}" style="display: block; width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; text-align: center; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: all 0.2s; box-shadow: 0 2px 4px rgba(15, 23, 42, 0.2);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(15, 23, 42, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(15, 23, 42, 0.2)'">
                  Ver Detalles →
                </a>
              </div>
              `
            )
          )
          .addTo(map.current!);

        const markerElement = marker.getElement();
        const popup = marker.getPopup();

        // Validar que el popup exista
        if (!popup) return;

        // Hover: solo resaltar el marcador (sin abrir popup)
        markerElement.addEventListener('mouseenter', () => {
          setHoveredBusinessIdRef.current(business.id);
        });

        // Salir: quitar resaltado
        markerElement.addEventListener('mouseleave', () => {
          setHoveredBusinessIdRef.current(null);
        });

        // Click: abrir/cerrar popup y scroll a la card
        markerElement.addEventListener('click', (e) => {
          e.stopPropagation();
          // Toggle popup
          marker.togglePopup();
          // Scroll a la card
          onMarkerClickRef.current(business.id);
        });

        markersRef.current[business.id] = marker;
        bounds.extend([business.longitude, business.latitude]);
      }
    });

    // Only fit bounds if markers were actually added or removed AND it's the first time
    if (boundsChanged && !bounds.isEmpty() && !hasInitializedBoundsRef.current) {
      hasInitializedBoundsRef.current = true;
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 1000
      });
    }
  }, [businesses, mapLoaded]); // Depend on businesses and mapLoaded

  // Effect for highlighting marker based on hover state
  useEffect(() => {
    console.log('🎯 MarketplaceMap: Hover state changed to:', hoveredBusinessId);
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const element = marker.getElement();
      const innerElement = element.querySelector('.marker-inner') as HTMLElement;

      if (!innerElement) return;

      if (id === hoveredBusinessId) {
        // Scale the inner wrapper, not the outer container (avoids Mapbox positioning conflicts)
        innerElement.style.transform = 'scale(1.3)';
        element.style.zIndex = '10';
      } else {
        innerElement.style.transform = 'scale(1)';
        element.style.zIndex = '1';
      }
    });
  }, [hoveredBusinessId]);

  return (
    <>
      <div ref={mapContainer} className="w-full h-full" />
      <style jsx global>{`
        .mapboxgl-popup {
          z-index: 999 !important;
        }
        .mapboxgl-popup-content {
          z-index: 1000 !important;
        }
      `}</style>
    </>
  );
}
