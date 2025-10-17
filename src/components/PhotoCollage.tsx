'use client'

import { useState } from 'react'
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Photo {
  id: string
  photo_url: string
  display_order: number
}

interface PhotoCollageProps {
  photos: Photo[]
  coverImage?: string | null
  businessName: string
}

export default function PhotoCollage({ photos, coverImage, businessName }: PhotoCollageProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Combinar cover image con fotos de galería
  const allPhotos = [
    ...(coverImage ? [{ id: 'cover', photo_url: coverImage, display_order: -1 }] : []),
    ...photos
  ]

  // Si no hay fotos, mostrar mensaje elegante
  if (allPhotos.length === 0) {
    return (
      <section className="relative w-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 border-b">
        <div className="max-w-7xl mx-auto">
          <div className="relative w-full flex items-center justify-center py-20 md:py-32">
            <div className="text-center px-4">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3">Sin Fotos Disponibles</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Este negocio aún no ha agregado fotos de sus instalaciones y servicios.
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // Si solo hay una foto, mostrarla en hero grande
  if (allPhotos.length === 1) {
    return (
      <>
        <section className="relative w-full overflow-hidden bg-black border-b">
          <div className="max-w-7xl mx-auto">
            <div className="relative w-full" style={{ aspectRatio: '21/9', maxHeight: '500px' }}>
              <img
                src={allPhotos[0].photo_url}
                alt={businessName}
                className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => {
                  setSelectedPhoto(allPhotos[0].photo_url)
                  setSelectedIndex(0)
                }}
                loading="eager"
                fetchpriority="high"
              />
              {/* Gradient overlay for better text contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none"></div>
            </div>
          </div>
        </section>

        <PhotoViewerModal
          photos={allPhotos}
          selectedIndex={selectedIndex}
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedIndex}
          businessName={businessName}
        />
      </>
    )
  }

  // Si hay 2-3 fotos: Hero principal + sidebar
  if (allPhotos.length <= 3) {
    return (
      <>
        <section className="relative w-full overflow-hidden bg-black border-b">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1" style={{ height: '400px' }}>
              {/* Foto principal (2/3) */}
              <div className="md:col-span-2 relative group cursor-pointer overflow-hidden" onClick={() => { setSelectedPhoto(allPhotos[0].photo_url); setSelectedIndex(0); }}>
                <img
                  src={allPhotos[0].photo_url}
                  alt={`${businessName} - Principal`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="eager"
                  fetchpriority="high"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
              </div>

              {/* Fotos secundarias (1/3) */}
              <div className="flex flex-col gap-1">
                {allPhotos.slice(1, 3).map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative group cursor-pointer overflow-hidden flex-1"
                    onClick={() => { setSelectedPhoto(photo.photo_url); setSelectedIndex(index + 1); }}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`${businessName} - ${index + 2}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <PhotoViewerModal
          photos={allPhotos}
          selectedIndex={selectedIndex}
          isOpen={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
          onNavigate={setSelectedIndex}
          businessName={businessName}
        />
      </>
    )
  }

  // 4+ fotos: Collage estilo Airbnb/Fresha
  const visiblePhotos = allPhotos.slice(0, 5)
  const remainingCount = allPhotos.length - 5

  return (
    <>
      <section className="relative w-full overflow-hidden bg-black border-b">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-1" style={{ height: '450px' }}>
            {/* Foto principal grande (2/4 ancho, full height) */}
            <div
              className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden"
              onClick={() => { setSelectedPhoto(visiblePhotos[0].photo_url); setSelectedIndex(0); }}
            >
              <img
                src={visiblePhotos[0].photo_url}
                alt={`${businessName} - Principal`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="eager"
                fetchpriority="high"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>
            </div>

            {/* Grid 2x2 a la derecha (2/4 ancho, dividido en 4 cuadrantes) */}
            {visiblePhotos.slice(1, 5).map((photo, index) => (
              <div
                key={photo.id}
                className="relative group cursor-pointer overflow-hidden"
                onClick={() => { setSelectedPhoto(photo.photo_url); setSelectedIndex(index + 1); }}
              >
                <img
                  src={photo.photo_url}
                  alt={`${businessName} - ${index + 2}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300"></div>

                {/* Badge "+X más fotos" en la última foto */}
                {index === 3 && remainingCount > 0 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <span className="text-white text-3xl font-bold">+{remainingCount}</span>
                      <p className="text-white/90 text-sm mt-1">más fotos</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Botón "Ver todas las fotos" flotante */}
          {allPhotos.length > 1 && (
            <button
              onClick={() => { setSelectedPhoto(allPhotos[0].photo_url); setSelectedIndex(0); }}
              className="absolute bottom-4 right-4 bg-white hover:bg-gray-50 text-gray-900 font-semibold px-5 py-2.5 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2 border border-gray-200"
            >
              <ImageIcon className="w-4 h-4" />
              <span>Ver todas las fotos</span>
            </button>
          )}
        </div>
      </section>

      <PhotoViewerModal
        photos={allPhotos}
        selectedIndex={selectedIndex}
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onNavigate={setSelectedIndex}
        businessName={businessName}
      />
    </>
  )
}

// Modal para ver fotos en pantalla completa
interface PhotoViewerModalProps {
  photos: Photo[]
  selectedIndex: number
  isOpen: boolean
  onClose: () => void
  onNavigate: (index: number) => void
  businessName: string
}

function PhotoViewerModal({
  photos,
  selectedIndex,
  isOpen,
  onClose,
  onNavigate,
  businessName
}: PhotoViewerModalProps) {
  const goToPrevious = () => {
    const newIndex = selectedIndex === 0 ? photos.length - 1 : selectedIndex - 1
    onNavigate(newIndex)
  }

  const goToNext = () => {
    const newIndex = selectedIndex === photos.length - 1 ? 0 : selectedIndex + 1
    onNavigate(newIndex)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 gap-0 overflow-hidden bg-black/95 backdrop-blur-xl border-none">
        {/* Header con info y close */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-6">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="text-white">
              <h3 className="font-semibold text-lg mb-1">{businessName}</h3>
              <p className="text-sm text-white/70">
                Foto {selectedIndex + 1} de {photos.length}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full w-10 h-10"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Imagen principal */}
        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12">
          <img
            src={photos[selectedIndex].photo_url}
            alt={`${businessName} - Foto ${selectedIndex + 1}`}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />

          {/* Navegación con flechas */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110 z-10"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 md:p-4 shadow-xl hover:shadow-2xl transition-all hover:scale-110 z-10"
                aria-label="Siguiente foto"
              >
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </>
          )}
        </div>

        {/* Miniaturas en la parte inferior */}
        {photos.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex gap-2 overflow-x-auto justify-center scrollbar-hide">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => onNavigate(index)}
                    className={`flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-3 transition-all duration-300 ${
                      index === selectedIndex
                        ? 'border-white shadow-xl scale-110'
                        : 'border-white/30 hover:border-white/60 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`Miniatura ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
