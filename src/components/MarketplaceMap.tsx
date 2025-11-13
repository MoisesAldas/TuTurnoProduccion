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
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({})
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
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
                <a href="/business/${business.id}" style="display: block; width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; text-align: center; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.875rem; transition: all 0.2s; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);" onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(5, 150, 105, 0.3)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(5, 150, 105, 0.2)'">
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

        // Función para cerrar el popup después de 3 segundos
        const scheduleClose = () => {
          // Limpiar timer anterior si existe
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
          }

          // Programar cierre en 3 segundos
          closeTimerRef.current = setTimeout(() => {
            if (popup && popup.isOpen()) {
              popup.remove();
            }
            setHoveredBusinessId(null);
          }, 3000);
        };

        // Función para cancelar el cierre programado
        const cancelClose = () => {
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
        };

        // Hover: abrir popup y resaltar
        markerElement.addEventListener('mouseenter', () => {
          setHoveredBusinessId(business.id);
          if (popup && !popup.isOpen()) {
            marker.togglePopup();
          }
          cancelClose(); // Cancelar cierre si vuelve a entrar
        });

        // Salir: programar cierre en 5 segundos
        markerElement.addEventListener('mouseleave', () => {
          scheduleClose();
        });

        // Agregar listeners al popup para mantenerlo abierto cuando el mouse está sobre él
        if (popup) {
          popup.on('open', () => {
            const popupElement = popup.getElement();
            if (popupElement) {
              popupElement.addEventListener('mouseenter', cancelClose);
              popupElement.addEventListener('mouseleave', scheduleClose);
            }
          });
        }

        // Click: scroll a la card (el popup ya está abierto por hover)
        markerElement.addEventListener('click', () => {
          onMarkerClick(business.id);
        });

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
