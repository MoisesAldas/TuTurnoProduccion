'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

// Define a simplified Business type for the map
interface MapBusiness {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

interface MarketplaceMapProps {
  businesses: MapBusiness[];
  // Will add more props later for interactivity, like onMarkerHover
}

export default function MarketplaceMap({ businesses }: MarketplaceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (map.current || !mapContainer.current) return; // Initialize map only once

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || ''
    if (!mapboxgl.accessToken) {
      console.error('Mapbox token not found')
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-78.4678, -0.1807], // Default center (Quito, Ecuador)
      zoom: 12,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Create a LngLatBounds object to fit all markers.
      const bounds = new mapboxgl.LngLatBounds();

      businesses.forEach(business => {
        if (business.latitude && business.longitude) {
          // Create a custom marker
          const el = document.createElement('div');
          el.className = 'custom-marker';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.borderRadius = '50%';
          el.style.background = '#ea580c'; // Use brand orange color
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          el.style.cursor = 'pointer';

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
            .addTo(map.current!)

          // Extend the bounds to include this marker's location
          bounds.extend([business.longitude, business.latitude]);
        }
      });

      // Fit the map to the bounds if there are any markers
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 15,
        });
      }
    });

    // Clean up on unmount
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [businesses]); // Re-run if businesses change

  return <div ref={mapContainer} className="w-full h-full" />;
}
