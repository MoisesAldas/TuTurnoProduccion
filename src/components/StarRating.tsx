'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  className?: string
}

/**
 * StarRating Component
 *
 * Displays and optionally allows selection of star ratings (1-5)
 * Used for both displaying existing ratings and collecting new ratings
 *
 * @param rating - Current rating value (0-5)
 * @param onRatingChange - Callback when rating is changed (interactive mode)
 * @param readonly - If true, stars are display-only (default: false)
 * @param size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 * @param showCount - If true, shows rating number next to stars (default: false)
 * @param className - Additional CSS classes
 */
export default function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = 'md',
  showCount = false,
  className
}: StarRatingProps) {
  const isInteractive = !readonly && onRatingChange

  // Size configurations
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const handleStarClick = (starValue: number) => {
    if (isInteractive) {
      onRatingChange(starValue)
    }
  }

  const handleStarHover = (starValue: number) => {
    if (isInteractive) {
      // Could add hover state here if needed
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = starValue <= rating

        return (
          <button
            key={starValue}
            type="button"
            onClick={() => handleStarClick(starValue)}
            onMouseEnter={() => handleStarHover(starValue)}
            disabled={!isInteractive}
            className={cn(
              'transition-all',
              isInteractive && 'cursor-pointer hover:scale-110',
              !isInteractive && 'cursor-default'
            )}
            aria-label={`${starValue} ${starValue === 1 ? 'estrella' : 'estrellas'}`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                'transition-colors',
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-none text-gray-300',
                isInteractive && isFilled && 'hover:fill-amber-500 hover:text-amber-500',
                isInteractive && !isFilled && 'hover:text-amber-300'
              )}
            />
          </button>
        )
      })}

      {showCount && (
        <span className={cn(
          'font-medium text-gray-700 ml-1',
          textSizeClasses[size]
        )}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
