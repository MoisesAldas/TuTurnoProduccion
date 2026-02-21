'use client'

import React from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GeolocationStatus } from '../hooks/useGeolocation'

interface GeolocationPromptProps {
  status: GeolocationStatus
  onRequest: () => void
  onDismiss: () => void
}

export default function GeolocationPrompt({
  status,
  onRequest,
  onDismiss,
}: GeolocationPromptProps) {

  // Mostrar solo mientras está pendiente o idle
  if (status === 'granted' || status === 'denied') return null

  return (
    <div className="flex-shrink-0 bg-blue-50 border-b border-blue-100">
      <div className="container mx-auto px-3 sm:px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          
          {/* Icon + Text */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3 h-3 text-blue-600" />
            </div>
            <p className="text-xs sm:text-sm text-blue-800 font-medium truncate">
              {status === 'pending' ? (
                "Obteniendo tu ubicación..."
              ) : (
                <>
                  <span className="hidden sm:inline">
                    ¿Quieres ver los negocios más cercanos a ti?
                  </span>
                  <span className="sm:hidden">
                    ¿Ver negocios cercanos?
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {status === 'idle' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}

            <Button
              size="sm"
              onClick={onRequest}
              disabled={status === 'pending'}
              className="h-7 px-2.5 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium whitespace-nowrap"
            >
              {status === 'pending' ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  <span className="hidden sm:inline">Localizando...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Usar mi ubicación</span>
                  <span className="sm:hidden">Usar ubicación</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}