'use client'

import React, { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  RotateCw, RotateCcw, ZoomIn, ZoomOut,
  Check, X, UserCircle
} from 'lucide-react'

// Helper function to get the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues
    image.src = url
  })

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<File | null> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = (rotation * Math.PI) / 180

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)

  // draw rotated image
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  )

  // set canvas width to final desired crop size - this will clear existing context
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0)

  // As a blob
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], 'cropped.png', { type: 'image/png' }))
      } else {
        resolve(null)
      }
    }, 'image/png')
  })
}

const rotateSize = (width: number, height: number, rotation: number) => {
  const rotRad = (rotation * Math.PI) / 180
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

// Component Props
interface BusinessImageCropperProps {
  imageFile: File
  onSave: (croppedFile: File) => void
  onCancel: () => void
  maxWidth?: number
  maxHeight?: number
}

export default function BusinessImageCropper({
  imageFile,
  onSave,
  onCancel,
  maxWidth = 400,
  maxHeight = 400
}: BusinessImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [imageUrl, setImageUrl] = useState<string>('')

  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [imageFile])

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageUrl) return

    try {
      const croppedImage = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation
      )
      if (croppedImage) {
        onSave(croppedImage)
      }
    } catch (e) {
      console.error(e)
    }
  }
  
  if (!imageUrl) {
    return null;
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center shadow-sm">
              <UserCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span>Ajustar Foto del Empleado</span>
          </CardTitle>
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
            {maxWidth}x{maxHeight}px
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-0">
        <div className="relative w-full aspect-square max-w-lg mx-auto bg-gray-100 rounded-2xl overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="w-full max-w-lg mx-auto space-y-4 pt-4">
            {/* Zoom */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-orange-600" />
                Zoom
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(1, z - 0.1))}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
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
                  size="icon"
                  onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Rotación */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-orange-600" />
                Rotación
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation(r => r - 1)}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Slider
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0])}
                  min={0}
                  max={360}
                  step={1}
                  className="flex-1 [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation(r => r + 1)}
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-orange-100 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto border-2 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            <Check className="w-4 h-4 mr-2" />
            Guardar Foto
          </Button>
        </div>
      </CardContent>
    </div>
  )
}
