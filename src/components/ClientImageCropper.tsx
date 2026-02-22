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
  Check, X, User
} from 'lucide-react'

// Helper function to get the cropped image
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
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
        resolve(new File([blob], 'image.webp', { type: 'image/webp' }))
      } else {
        resolve(null)
      }
    }, 'image/webp', 0.8)
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
interface ClientImageCropperProps {
  imageFile: File
  onSave: (croppedFile: File) => void
  onCancel: () => void
  maxWidth?: number
  maxHeight?: number
}

export default function ClientImageCropper({
  imageFile,
  onSave,
  onCancel,
  maxWidth = 400,
  maxHeight = 400
}: ClientImageCropperProps) {
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
    <div className="space-y-6 bg-white dark:bg-slate-950 rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-100 dark:border-white/5">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-4 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            <div className="w-12 h-12 bg-slate-900 dark:bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <User className="w-6 h-6 text-white dark:text-slate-900" />
            </div>
            <span>Ajustar Foto</span>
          </CardTitle>
          <Badge variant="outline" className="rounded-full px-3 py-1 border-slate-200 bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400 dark:border-white/10 font-bold text-[10px] uppercase tracking-widest">
            {maxWidth}x{maxHeight}px
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-8 p-0">
        <div className="relative w-full aspect-square max-w-lg mx-auto bg-slate-50 dark:bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-100 dark:border-white/5 shadow-inner">
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
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <ZoomIn className="w-3.5 h-3.5" />
                Nivel de Zoom
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom(z => Math.max(1, z - 0.1))}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[zoom]}
                  onValueChange={(value) => setZoom(value[0])}
                  min={1}
                  max={3}
                  step={0.1}
                  className="flex-1 [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600 dark:[&_[role=slider]]:bg-orange-500 dark:[&_[role=slider]]:border-orange-500"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setZoom(z => Math.min(3, z + 0.1))}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Rotación */}
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5" />
                Ángulo de Rotación
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation(r => r - 1)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Slider
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0])}
                  min={0}
                  max={360}
                  step={1}
                  className="flex-1 [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600 dark:[&_[role=slider]]:bg-orange-500 dark:[&_[role=slider]]:border-orange-500"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRotation(r => r + 1)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-8 border-t border-slate-100 dark:border-white/5 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-12 px-8 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="w-4 h-4 mr-2" />
            Descartar
          </Button>
          <Button
            onClick={handleSave}
            className="h-12 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all w-full sm:w-auto dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <Check className="w-4 h-4 mr-2" />
            Confirmar Foto
          </Button>
        </div>
      </CardContent>
    </div>
  )
}
