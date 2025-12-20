'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Check, X, Maximize2, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageCropperEasyProps {
  imageFile: File
  onSave: (croppedFile: File) => void
  onCancel: () => void
  aspectRatio?: number // 1 = cuadrado, 2 = 2:1, etc.
  maxWidth?: number
  maxHeight?: number
}

interface Point {
  x: number
  y: number
}

interface Area {
  x: number
  y: number
  width: number
  height: number
}

export default function ImageCropperEasy({
  imageFile,
  onSave,
  onCancel,
  aspectRatio = 1,
  maxWidth = 400,
  maxHeight = 400
}: ImageCropperEasyProps) {
  const [imageSrc, setImageSrc] = useState<string>('')
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  // Cargar imagen
  React.useEffect(() => {
    if (imageFile) {
      const reader = new FileReader()
      reader.onload = () => {
        setImageSrc(reader.result as string)
      }
      reader.readAsDataURL(imageFile)
    }
  }, [imageFile])

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      return null
    }

    // Calcular aspect ratio del área recortada
    const cropAspectRatio = pixelCrop.width / pixelCrop.height

    // Calcular dimensiones finales manteniendo aspect ratio
    let finalWidth = maxWidth
    let finalHeight = maxHeight

    if (cropAspectRatio > (maxWidth / maxHeight)) {
      finalWidth = maxWidth
      finalHeight = Math.round(maxWidth / cropAspectRatio)
    } else {
      finalHeight = maxHeight
      finalWidth = Math.round(maxHeight * cropAspectRatio)
    }

    canvas.width = finalWidth
    canvas.height = finalHeight

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      finalWidth,
      finalHeight
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob)
      }, imageFile.type, 0.98)
    })
  }

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    try {
      setSaving(true)
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        })
        onSave(croppedFile)
      }
    } catch (error) {
      console.error('Error cropping image:', error)
    } finally {
      setSaving(false)
    }
  }

  // Calcular dimensiones finales para preview
  const getFinalDimensions = () => {
    if (!croppedAreaPixels) return { width: maxWidth, height: maxHeight }

    const cropAspectRatio = croppedAreaPixels.width / croppedAreaPixels.height
    let finalWidth = maxWidth
    let finalHeight = maxHeight

    if (cropAspectRatio > (maxWidth / maxHeight)) {
      finalWidth = maxWidth
      finalHeight = Math.round(maxWidth / cropAspectRatio)
    } else {
      finalHeight = maxHeight
      finalWidth = Math.round(maxHeight * cropAspectRatio)
    }

    return { width: finalWidth, height: finalHeight }
  }

  const finalDimensions = getFinalDimensions()

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <Card
        className="w-full max-w-3xl my-auto shadow-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-gray-900 dark:text-gray-50">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 dark:bg-orange-900/50 rounded-lg flex items-center justify-center">
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <span>Recortar Imagen</span>
            </CardTitle>
            <div className="flex gap-2">
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
                {aspectRatio === 1 ? 'Cuadrado 1:1' : aspectRatio === 2 ? 'Banner 2:1' : `${aspectRatio}:1`}
              </Badge>
              <Badge className="bg-orange-100 hover:bg-orange-100 text-orange-700 border-orange-200 hidden sm:inline-flex dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
                Máx. {maxWidth}x{maxHeight}px
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {/* Cropper */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Vista previa con cropper */}
            <div className="flex-1">
              <div className="relative w-full aspect-square max-w-[500px] mx-auto border-2 border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md">
                {imageSrc && (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspectRatio}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    style={{
                      containerStyle: {
                        backgroundColor: '#f3f4f6',
                      },
                      cropAreaStyle: {
                        border: '2px solid #ea580c',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                      },
                    }}
                  />
                )}
              </div>
            </div>

            {/* Controles */}
            <div className="w-full lg:w-80 space-y-3 sm:space-y-4">
              {/* Zoom */}
              <div className="space-y-2 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  Zoom
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={1}
                    max={3}
                    step={0.1}
                    className="flex-1 [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium">
                  {Math.round(zoom * 100)}%
                </div>
              </div>

              {/* Instrucciones */}
              <div className="space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                   Instrucciones
                </Label>
                <div className="text-xs text-orange-800 dark:text-orange-300 space-y-1">
                  <p>• Arrastra la imagen para posicionarla</p>
                  <p>• Usa el zoom para ajustar el tamaño</p>
                  <p>• En móvil: pellizca para hacer zoom</p>
                </div>
              </div>

              {/* Vista previa final */}
              <div className="space-y-2 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Tamaño final
                </Label>
                <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium">
                    Dimensiones: <span className="text-orange-600 dark:text-orange-400">{finalDimensions.width} x {finalDimensions.height}px</span>
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Formato: {imageFile.type.split('/')[1].toUpperCase()}
                  </p>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    Máximo: {maxWidth}x{maxHeight}px
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={saving}
              className="w-full sm:w-auto border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="hidden sm:inline">Procesando...</span>
                  <span className="sm:hidden">Espera...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Aplicar Recorte</span>
                  <span className="sm:hidden">Aplicar</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
