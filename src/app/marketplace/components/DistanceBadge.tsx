'use client'

import React from 'react'
import { MapPin } from 'lucide-react'

interface DistanceBadgeProps {
  distanceKm: number | null | undefined
}

export default function DistanceBadge({ distanceKm }: DistanceBadgeProps) {
  if (distanceKm === null || distanceKm === undefined) return null

  const label = distanceKm < 1
    ? '< 1 km'
    : `${distanceKm.toFixed(1)} km`

  return (
    <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
      <MapPin className="w-3 h-3 flex-shrink-0" />
      {label}
    </span>
  )
}
