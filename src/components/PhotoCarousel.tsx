'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Photo {
  id: string
  photo_url: string
  display_order: number
}

interface PhotoCarouselProps {
  photos: Photo[]
  coverImage?: string | null
  businessName: string
}

export default function PhotoCarousel({ photos, coverImage, businessName }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Combinar cover image con fotos de galería
  const allPhotos = [
    ...(coverImage ? [{ id: 'cover', photo_url: coverImage, display_order: -1 }] : []),
    ...photos
  ]

  // No mostrar carrusel si no hay fotos
  if (allPhotos.length === 0) return null

  const goToPrevious = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? allPhotos.length - 1 : prevIndex - 1
    )
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const goToNext = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex((prevIndex) =>
      prevIndex === allPhotos.length - 1 ? 0 : prevIndex + 1
    )
    setTimeout(() => setIsTransitioning(false), 300)
  }

  const goToSlide = (index: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setCurrentIndex(index)
    setTimeout(() => setIsTransitioning(false), 300)
  }

  // Auto-play (opcional)
  useEffect(() => {
    if (allPhotos.length <= 1) return

    const interval = setInterval(() => {
      goToNext()
    }, 5000) // Cambiar cada 5 segundos

    return () => clearInterval(interval)
  }, [currentIndex, allPhotos.length])

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div className="max-w-6xl mx-auto">
        <div className="relative w-full" style={{ aspectRatio: '2.2/1' }}>
          {/* Main Image */}
          {allPhotos.map((photo, index) => (
            <div
              key={photo.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentIndex ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                pointerEvents: index === currentIndex ? 'auto' : 'none'
              }}
            >
              <img
                src={photo.photo_url}
                alt={`${businessName} - Foto ${index + 1}`}
                className="w-full h-full object-cover"
                loading={index === 0 ? 'eager' : 'lazy'}
                fetchPriority={index === 0 ? 'high' : 'auto'}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 1152px, 1280px"
              />
            </div>
          ))}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none"></div>

          {/* Navigation Buttons */}
          {allPhotos.length > 1 && (
            <>
              {/* Previous Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                disabled={isTransitioning}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-50 z-10"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>

              {/* Next Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                disabled={isTransitioning}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 sm:w-12 sm:h-12 backdrop-blur-sm transition-all hover:scale-110 disabled:opacity-50 z-10"
                aria-label="Siguiente foto"
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
            </>
          )}

          {/* Dot Indicators */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {allPhotos.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  disabled={isTransitioning}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentIndex
                      ? 'w-8 h-2 bg-white'
                      : 'w-2 h-2 bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Ir a foto ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Photo Counter */}
          {allPhotos.length > 1 && (
            <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium z-10">
              {currentIndex + 1} / {allPhotos.length}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
