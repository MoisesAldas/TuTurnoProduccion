import React from 'react'
import { AlertTriangle, Phone, MessageCircle, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface BlockedBookingMessageProps {
  businessName: string
  businessPhone?: string
  cancellationsThisMonth: number
  maxAllowed: number
  className?: string
}

/**
 * Componente para mostrar mensaje cuando un cliente está bloqueado
 * Diseño suavizado con colores neutros y borde rojo sutil
 */
export function BlockedBookingMessage({
  businessName,
  businessPhone,
  cancellationsThisMonth,
  maxAllowed,
  className = ''
}: BlockedBookingMessageProps) {
  const handleCall = () => {
    if (businessPhone) {
      window.location.href = `tel:${businessPhone}`
    }
  }

  const handleWhatsApp = () => {
    if (businessPhone) {
      const cleanPhone = businessPhone.replace(/\D/g, '')
      const message = encodeURIComponent(
        `Hola, me gustaría consultar sobre mis reservas en ${businessName}.`
      )
      window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
    }
  }

  return (
    <div className={`w-full rounded-lg border border-red-600 p-5 dark:border-red-500 ${className}`}>
      <div className="flex gap-4 items-start">
        {/* Icono Principal */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 dark:border-red-800">
            <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
              Reservas Temporalmente Bloqueadas
            </h3>
            <p className="mt-1.5 text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              Has alcanzado el límite de cancelaciones este mes (<span className="font-medium text-gray-900 dark:text-white">{cancellationsThisMonth}/{maxAllowed}</span>) en <span className="font-medium text-gray-900 dark:text-white">{businessName}</span>.
            </p>
          </div>

          <Separator className="my-4 bg-red-200 dark:bg-red-800" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Para volver a reservar, por favor contacta al negocio:
            </p>

            {businessPhone ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={handleCall}
                  className="h-9 gap-2 border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900"
                >
                  <Phone className="h-4 w-4" />
                  Llamar
                </Button>
                <Button
                  onClick={handleWhatsApp}
                  className="h-9 gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white border-none shadow-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            ) : (
              <span className="text-sm text-gray-500">
                Información de contacto no disponible
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
