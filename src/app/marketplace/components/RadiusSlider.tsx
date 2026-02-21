'use client'

import React from 'react'
import { MapPin } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

// Snap points for the slider (km values)
const RADIUS_OPTIONS = [1, 2, 5, 10, 15, 25, 50]

interface RadiusSliderProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  businessCount?: number
}

export default function RadiusSlider({ value, onChange, disabled, businessCount }: RadiusSliderProps) {
  const sliderIndex = RADIUS_OPTIONS.indexOf(value) !== -1
    ? RADIUS_OPTIONS.indexOf(value)
    : RADIUS_OPTIONS.findIndex(v => v >= value)

  const handleChange = (indices: number[]) => {
    const snappedKm = RADIUS_OPTIONS[indices[0]] ?? 10
    onChange(snappedKm)
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3 w-full min-w-0">
      {/* Label + Badge */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
        <span className="text-xs text-slate-600 font-medium hidden sm:inline whitespace-nowrap">Hasta</span>
        {disabled ? (
          <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
        ) : (
          <Badge
            variant="outline"
            className="border-slate-300 text-slate-700 text-xs font-semibold px-1.5 py-0 h-5 min-w-[38px] justify-center"
          >
            {value} km
          </Badge>
        )}
      </div>

      {/* Slider — slate color override, grows to fill available space */}
      <div
        className="flex-1 min-w-[60px] max-w-[160px]"
        style={{ '--primary': '222.2 47.4% 11.2%' } as React.CSSProperties}
      >
        <Slider
          min={0}
          max={RADIUS_OPTIONS.length - 1}
          step={1}
          value={[sliderIndex >= 0 ? sliderIndex : 3]}
          onValueChange={handleChange}
          disabled={disabled}
          className="cursor-pointer"
        />
      </div>

      {/* Business count — hidden on xs */}
      {typeof businessCount === 'number' && (
        <span className="hidden sm:inline text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
          {businessCount} {businessCount === 1 ? 'negocio' : 'negocios'}
        </span>
      )}
    </div>
  )
}
