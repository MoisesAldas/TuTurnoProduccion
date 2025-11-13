'use client'

import { useEffect, useRef } from 'react'
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
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

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

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Effect for adding/updating markers when businesses change
  useEffect(() => {
    if (!map.current) return;

    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds = new mapboxgl.LngLatBounds();

    businesses.forEach(business => {
      if (business.latitude && business.longitude) {
        const el = document.createElement('div');
        el.className = 'marker';
        el.innerHTML = `
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#059669" stroke="#FFFFFF" stroke-width="1.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#FFFFFF"></circle>
          </svg>
        `;
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([business.longitude, business.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
              `
              <div style="font-family: sans-serif; max-width: 220px; padding: 8px;">
                <h3 style="font-weight: 700; font-size: 1rem; margin: 0 0 4px 0; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${business.name}</h3>
                ${business.average_rating && business.average_rating > 0 ? `
                <div style="display: flex; align-items: center; gap: 4px; font-size: 0.875rem; color: #4b5563; margin-bottom: 12px;">
                  <span style="color: #f59e0b;">★</span>
                  <span style="font-weight: 600;">${business.average_rating.toFixed(1)}</span>
                  <span style="color: #6b7280;">(${business.review_count} reseñas)</span>
                </div>
                ` : '<p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 12px;">Sin reseñas aún</p>'}
                <a href="/business/${business.id}" target="_blank" style="display: block; width: 100%; padding: 8px; background-color: #059669; color: white; text-align: center; border-radius: 6px; text-decoration: none; font-weight: 600; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#047857'" onmouseout="this.style.backgroundColor='#059669'">
                  Ver Detalles
                </a>
              </div>
              `
            )
          )
          .addTo(map.current!);

        const markerElement = marker.getElement();
        markerElement.addEventListener('mouseenter', () => setHoveredBusinessId(business.id));
        markerElement.addEventListener('mouseleave', () => setHoveredBusinessId(null));
        markerElement.addEventListener('click', () => onMarkerClick(business.id)); // Add click listener
        
        markersRef.current[business.id] = marker;
        bounds.extend([business.longitude, business.latitude]);
      }
    });

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
        duration: 1000
      });
    }
  }, [businesses, setHoveredBusinessId, onMarkerClick]);

  // Effect for highlighting marker based on hover state
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const element = marker.getElement();
      if (id === hoveredBusinessId) {
        element.style.transform = 'scale(1.5)';
        element.style.zIndex = '10';
      } else {
        element.style.transform = 'scale(1)';
        element.style.zIndex = '1';
      }
    });
  }, [hoveredBusinessId]);

  return (
    <>

      <div ref={mapContainer} className="w-full h-full" />
    </>
  );
}
