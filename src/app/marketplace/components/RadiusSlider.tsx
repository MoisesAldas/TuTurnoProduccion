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
    <div className="flex items-center gap-3 w-full min-w-0">
      {/* Label + Badge */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 mb-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Radio</span>
          </div>
          {disabled ? (
            <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
          ) : (
            <Badge
              className="bg-slate-950 text-white border-0 shadow-sm font-black text-[9px] uppercase tracking-tight px-2 py-0 h-4 min-w-[38px] justify-center rounded-full"
            >
              {value} km
            </Badge>
          )}
        </div>
      </div>

      {/* Slider — slate color override, grows to fill available space */}
      <div
        className="flex-1 px-1"
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
    </div>
  )
}
