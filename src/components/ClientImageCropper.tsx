'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  RotateCw, RotateCcw, ZoomIn, ZoomOut, Move,
  Check, X, Circle, User
} from 'lucide-react'

interface ClientImageCropperProps {
  imageFile: File
  onSave: (croppedFile: File) => void
  onCancel: () => void
  maxWidth?: number
  maxHeight?: number
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export default function ClientImageCropper({
  imageFile,
  onSave,
  onCancel,
  maxWidth = 400,
  maxHeight = 400
}: ClientImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [scale, setScale] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageUrl, setImageUrl] = useState<string>('')
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0 })

  // Cargar imagen
  React.useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      setImageUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [imageFile])

  // Configurar área de crop inicial cuando la imagen se carga
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return

    const img = imageRef.current
    const containerWidth = 400
    const containerHeight = 400

    // Calcular escala inicial para que la imagen quepa en el contenedor
    const scaleX = containerWidth / img.naturalWidth
    const scaleY = containerHeight / img.naturalHeight
    const initialScale = Math.min(scaleX, scaleY, 1)

    setScale(initialScale)

    // Configurar área de crop inicial circular (centrada)
    const cropSize = Math.min(250, img.naturalWidth * initialScale, img.naturalHeight * initialScale)
    setCropArea({
      x: (containerWidth - cropSize) / 2,
      y: (containerHeight - cropSize) / 2,
      width: cropSize,
      height: cropSize
    })

    setImageLoaded(true)
  }, [])

  // Manejar zoom
  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(3, prev + delta)))
  }

  // Manejar rotación
  const handleRotate = (degrees: number) => {
    setRotation(prev => (prev + degrees) % 360)
  }

  // Manejar drag del área de crop
  const handleCropMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect()
    if (!rect) return

    setIsDragging(true)
    setDragStart({
      x: e.clientX - rect.left - cropArea.x,
      y: e.clientY - rect.top - cropArea.y
    })
  }

  // Manejar drag de la imagen
  const handleImageMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect()
    if (!rect) return

    setIsDraggingImage(true)
    setImageDragStart({
      x: e.clientX - rect.left - imagePosition.x,
      y: e.clientY - rect.top - imagePosition.y
    })
  }

  // Agregar eventos globales para mejor control
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Mover área de crop
        const rect = document.querySelector('.crop-container')?.getBoundingClientRect()
        if (!rect) return

        const newX = e.clientX - rect.left - dragStart.x
        const newY = e.clientY - rect.top - dragStart.y

        // Limitar dentro del contenedor
        const maxX = 400 - cropArea.width
        const maxY = 400 - cropArea.height

        setCropArea(prev => ({
          ...prev,
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY))
        }))
      } else if (isDraggingImage) {
        // Mover imagen
        const rect = document.querySelector('.crop-container')?.getBoundingClientRect()
        if (!rect) return

        const newX = e.clientX - rect.left - imageDragStart.x
        const newY = e.clientY - rect.top - imageDragStart.y

        setImagePosition({ x: newX, y: newY })
      }
    }

    const handleGlobalMouseUp = () => {
      setIsDragging(false)
      setIsDraggingImage(false)
    }

    if (isDragging || isDraggingImage) {
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, isDraggingImage, dragStart, imageDragStart, cropArea.width, cropArea.height])

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsDraggingImage(false)
  }

  // Ajustar tamaño del crop (siempre cuadrado para avatar)
  const handleCropSizeChange = (newSize: number[]) => {
    const size = newSize[0]
    setCropArea(prev => ({
      ...prev,
      width: size,
      height: size
    }))
  }

  // Generar imagen croppeada
  const handleSave = async () => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current

    // Configurar canvas con el tamaño final deseado
    canvas.width = maxWidth
    canvas.height = maxHeight

    // Limpiar canvas con fondo blanco
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Calcular el tamaño de la imagen escalada en el contenedor de 400x400
    const containerWidth = 400
    const containerHeight = 400

    // Calcular la escala inicial que se aplicó para mostrar la imagen
    const displayScaleX = containerWidth / img.naturalWidth
    const displayScaleY = containerHeight / img.naturalHeight
    const displayScale = Math.min(displayScaleX, displayScaleY, 1)

    // Tamaño de la imagen mostrada en pantalla
    const displayedWidth = img.naturalWidth * displayScale * scale
    const displayedHeight = img.naturalHeight * displayScale * scale

    // Posición de la imagen en el contenedor (centrada + offset de pan)
    const imageX = (containerWidth - displayedWidth) / 2 + imagePosition.x
    const imageY = (containerHeight - displayedHeight) / 2 + imagePosition.y

    // Convertir coordenadas del área de crop a coordenadas de la imagen original
    const cropRelativeX = (cropArea.x - imageX) / displayedWidth
    const cropRelativeY = (cropArea.y - imageY) / displayedHeight
    const cropRelativeWidth = cropArea.width / displayedWidth
    const cropRelativeHeight = cropArea.height / displayedHeight

    // Calcular coordenadas en la imagen original
    const sourceX = cropRelativeX * img.naturalWidth
    const sourceY = cropRelativeY * img.naturalHeight
    const sourceWidth = cropRelativeWidth * img.naturalWidth
    const sourceHeight = cropRelativeHeight * img.naturalHeight

    // Validar que las coordenadas estén dentro de los límites
    const validSourceX = Math.max(0, Math.min(sourceX, img.naturalWidth))
    const validSourceY = Math.max(0, Math.min(sourceY, img.naturalHeight))
    const validSourceWidth = Math.min(sourceWidth, img.naturalWidth - validSourceX)
    const validSourceHeight = Math.min(sourceHeight, img.naturalHeight - validSourceY)

    // Aplicar rotación si es necesaria
    if (rotation !== 0) {
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)

      // Dibujar la porción croppeada con rotación
      ctx.drawImage(
        img,
        validSourceX,
        validSourceY,
        validSourceWidth,
        validSourceHeight,
        -canvas.width / 2,
        -canvas.height / 2,
        canvas.width,
        canvas.height
      )

      ctx.restore()
    } else {
      // Dibujar sin rotación
      ctx.drawImage(
        img,
        validSourceX,
        validSourceY,
        validSourceWidth,
        validSourceHeight,
        0,
        0,
        canvas.width,
        canvas.height
      )
    }

    // Convertir a blob y crear archivo
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile.name, {
          type: imageFile.type,
          lastModified: Date.now()
        })
        onSave(croppedFile)
      }
    }, imageFile.type, 0.98)
  }

  return (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl text-gray-900">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <span>Ajustar Foto de Perfil</span>
          </CardTitle>
          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
            {maxWidth}x{maxHeight}px
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-0">
        {/* Editor de imagen */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vista previa con crop circular */}
          <div className="flex-1">
            <div
              className="crop-container relative w-full aspect-square max-w-[400px] mx-auto border-2 border-emerald-200 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg"
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {imageUrl && (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                    transformOrigin: 'center'
                  }}
                  onLoad={handleImageLoad}
                  onMouseDown={handleImageMouseDown}
                  draggable={false}
                />
              )}

              {/* Indicador de arrastre de imagen */}
              {isDraggingImage && (
                <div className="absolute top-3 right-3 bg-white border border-emerald-300 text-emerald-700 text-sm px-3 py-1.5 rounded-lg shadow-lg backdrop-blur-sm">
                  <Move className="w-3.5 h-3.5 inline mr-1.5" />
                  Moviendo imagen...
                </div>
              )}

              {/* Área de crop circular */}
              {imageLoaded && (
                <div
                  className="absolute border-4 border-emerald-500 rounded-full bg-emerald-500/10 cursor-move hover:bg-emerald-500/20 transition-all shadow-xl backdrop-blur-sm"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  }}
                  onMouseDown={handleCropMouseDown}
                >
                  <div className="absolute inset-0 border-4 border-white border-dashed rounded-full"></div>
                  <div className="absolute top-3 left-3 bg-white border-2 border-emerald-400 text-emerald-700 text-xs px-2 py-1 rounded-full shadow-md">
                    <Move className="w-3 h-3 inline mr-1" />
                    Recorte
                  </div>
                </div>
              )}

              {/* Overlay fuera del área de crop */}
              {imageLoaded && (
                <>
                  {/* Top */}
                  <div
                    className="absolute top-0 left-0 w-full bg-black/40 backdrop-blur-[2px]"
                    style={{ height: cropArea.y }}
                  />
                  {/* Bottom */}
                  <div
                    className="absolute left-0 w-full bg-black/40 backdrop-blur-[2px]"
                    style={{
                      top: cropArea.y + cropArea.height,
                      height: 400 - cropArea.y - cropArea.height
                    }}
                  />
                  {/* Left */}
                  <div
                    className="absolute left-0 bg-black/40 backdrop-blur-[2px]"
                    style={{
                      top: cropArea.y,
                      width: cropArea.x,
                      height: cropArea.height
                    }}
                  />
                  {/* Right */}
                  <div
                    className="absolute bg-black/40 backdrop-blur-[2px]"
                    style={{
                      top: cropArea.y,
                      left: cropArea.x + cropArea.width,
                      width: 400 - cropArea.x - cropArea.width,
                      height: cropArea.height
                    }}
                  />
                </>
              )}
            </div>

            {/* Tip de uso */}
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm text-emerald-800">
              <span className="font-semibold">💡 Tip:</span> Arrastra la imagen para posicionarla. Mueve el círculo verde para ajustar el área de recorte.
            </div>
          </div>

          {/* Controles */}
          <div className="w-full lg:w-80 space-y-4">
            {/* Tamaño del crop */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Circle className="w-4 h-4 text-emerald-600" />
                Tamaño del recorte
              </Label>
              <Slider
                value={[cropArea.width]}
                onValueChange={handleCropSizeChange}
                min={100}
                max={350}
                step={10}
                className="w-full [&_[role=slider]]:bg-emerald-600 [&_[role=slider]]:border-emerald-600"
              />
              <div className="text-sm text-emerald-600 font-medium">
                {Math.round(cropArea.width)}px de diámetro
              </div>
            </div>

            {/* Zoom */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <ZoomIn className="w-4 h-4 text-emerald-600" />
                Zoom
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleZoom(-0.1)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <Slider
                  value={[scale]}
                  onValueChange={(value) => setScale(value[0])}
                  min={0.1}
                  max={3}
                  step={0.1}
                  className="flex-1 [&_[role=slider]]:bg-emerald-600 [&_[role=slider]]:border-emerald-600"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleZoom(0.1)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                {Math.round(scale * 100)}%
              </div>
            </div>

            {/* Rotación */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-600" />
                Rotación
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate(-90)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Slider
                  value={[rotation]}
                  onValueChange={(value) => setRotation(value[0])}
                  min={0}
                  max={360}
                  step={1}
                  className="flex-1 [&_[role=slider]]:bg-emerald-600 [&_[role=slider]]:border-emerald-600"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRotate(90)}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm text-emerald-600 font-medium">
                {rotation}°
              </div>
            </div>

            {/* Posición de la imagen */}
            <div className="space-y-2 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-xl border border-emerald-200">
              <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Move className="w-4 h-4 text-emerald-600" />
                Centrar Imagen
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImagePosition({ x: 0, y: 0 })}
                className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
              >
                Resetear Posición
              </Button>
              <div className="text-xs text-emerald-700">
                X: {Math.round(imagePosition.x)}px, Y: {Math.round(imagePosition.y)}px
              </div>
            </div>
          </div>
        </div>

        {/* Canvas oculto para generar la imagen final */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Botones de acción */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-emerald-100">
          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full sm:w-auto border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={!imageLoaded}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Check className="w-4 h-4 mr-2" />
            Guardar Foto
          </Button>
        </div>
      </CardContent>
    </div>
  )
}
