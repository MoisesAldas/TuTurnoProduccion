'use client'

import React from 'react'
import { CheckCircle, Clock, ArrowLeft } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatPrice, formatDuration } from '@/lib/booking/bookingUtils'

interface Service {
  id: string
  name: string
  description?: string
  price: number
  duration_minutes: number
}

interface ServiceStepProps {
  services: Service[]
  selectedServices: Service[]
  handleServiceSelect: (service: Service) => void
  handleContinueToEmployee: () => void
  isBlocked?: boolean
}

export function ServiceStep({
  services,
  selectedServices,
  handleServiceSelect,
  handleContinueToEmployee,
  isBlocked
}: ServiceStepProps) {
  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Continue Button - Floating at bottom on mobile */}
      {selectedServices.length > 0 && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-10 pointer-events-none">
          <Button
            onClick={handleContinueToEmployee}
            disabled={isBlocked}
            className="pointer-events-auto bg-slate-950 hover:bg-slate-900 text-white shadow-[0_15px_30px_rgba(2,6,23,0.35)] h-14 px-8 rounded-full font-black text-sm transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <span>Continuar</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Button>
        </div>
      )}

      {/* Service List with Checkboxes - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {services.map((service) => {
          const isSelected = selectedServices.some(s => s.id === service.id)
          return (
            <Card
              key={service.id}
              className={`group cursor-pointer border-none transition-all duration-300 h-full flex flex-col ${
                isSelected 
                  ? 'ring-2 ring-slate-950 bg-white shadow-xl -translate-y-1' 
                  : 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1'
              } ${isBlocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              onClick={() => !isBlocked && handleServiceSelect(service)}
            >
              <CardContent className="p-5 lg:p-6 flex-1 flex flex-col">
                <div className="flex items-start gap-4 flex-1">
                  {/* Premium Checkbox */}
                  <div className="flex items-center pt-1 flex-shrink-0">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      isSelected
                        ? 'bg-slate-950 border-slate-950 shadow-md scale-110'
                        : 'border-slate-200 group-hover:border-slate-300'
                    }`}>
                      {isSelected && (
                        <CheckCircle className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="flex-1 flex flex-col min-h-[120px]">
                    <h3 className="font-black text-lg text-slate-950 mb-1 lg:mb-2 tracking-tight group-hover:text-slate-800 transition-colors">
                      {service.name}
                    </h3>
                    <div className="flex-1">
                      {service.description && (
                        <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 mb-4">{service.description}</p>
                      )}
                    </div>
                    
                    {/* Meta Info Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-full text-xs font-bold ring-1 ring-slate-200/50">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(service.duration_minutes)}
                      </div>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-black transition-colors ${
                        isSelected ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-950'
                      }`}>
                        {formatPrice(service.price)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
