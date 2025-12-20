'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  RotateCw, RotateCcw, ZoomIn, ZoomOut, Move,
  Check, X, Square, Circle, Maximize2
} from 'lucide-react'

interface ImageCropperProps {
  imageFile: File
  onSave: (croppedFile: File) => void
  onCancel: () => void
  aspectRatio?: number // null = libre, 1 = cuadrado, 16/9 = rectangular, etc.
  maxWidth?: number
  maxHeight?: number
}

interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export default function ImageCropper({
  imageFile,
  onSave,
  onCancel,
  aspectRatio = 1, // Por defecto cuadrado para avatars
  maxWidth = 400,
  maxHeight = 400
}: ImageCropperProps) {
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

    // Configurar área de crop inicial (centrada)
    const cropSize = Math.min(200, img.naturalWidth * initialScale, img.naturalHeight * initialScale)
    setCropArea({
      x: (containerWidth - cropSize) / 2,
      y: (containerHeight - cropSize) / 2,
      width: cropSize,
      height: aspectRatio ? cropSize : cropSize * 0.75
    })

    setImageLoaded(true)
  }, [aspectRatio])

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

  const handleMouseMove = (e: React.MouseEvent) => {
    // Los eventos globales ahora manejan el movimiento
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsDraggingImage(false)
  }

  // Ajustar tamaño del crop
  const handleCropSizeChange = (newSize: number[]) => {
    const size = newSize[0]
    setCropArea(prev => ({
      ...prev,
      width: size,
      height: aspectRatio ? size / aspectRatio : size * 0.75
    }))
  }

  // Generar imagen croppeada
  const handleSave = async () => {
    if (!imageRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = imageRef.current

    // Calcular aspect ratio del área recortada
    const cropAspectRatio = cropArea.width / cropArea.height

    // Calcular dimensiones del canvas manteniendo el aspect ratio
    let finalWidth = maxWidth
    let finalHeight = maxHeight

    // Ajustar dimensiones para mantener el aspect ratio sin exceder límites
    if (cropAspectRatio > (maxWidth / maxHeight)) {
      // Área más ancha que el límite - ajustar por ancho
      finalWidth = maxWidth
      finalHeight = Math.round(maxWidth / cropAspectRatio)
    } else {
      // Área más alta que el límite - ajustar por altura
      finalHeight = maxHeight
      finalWidth = Math.round(maxHeight * cropAspectRatio)
    }

    // Configurar canvas con el tamaño calculado
    canvas.width = finalWidth
    canvas.height = finalHeight

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
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <Card
        className="w-full max-w-3xl my-auto shadow-lg bg-white dark:bg-gray-900"
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
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
                {aspectRatio === 1 ? 'Cuadrado' : aspectRatio ? `${aspectRatio}:1` : 'Libre'}
              </Badge>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 hidden sm:inline-flex dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800">
                {maxWidth}x{maxHeight}px
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {/* Editor de imagen */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Vista previa */}
            <div className="flex-1">
              <div
                className="crop-container relative w-full aspect-square max-w-[400px] mx-auto border-2 border-gray-300 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-xl shadow-md"
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
                  <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-xs px-2 py-1 rounded-md shadow-sm">
                    <Move className="w-3 h-3 inline mr-1" />
                    <span className="hidden sm:inline">Moviendo imagen...</span>
                    <span className="sm:hidden">Moviendo...</span>
                  </div>
                )}

                {/* Área de crop */}
                {imageLoaded && (
                  <div
                    className="absolute border-2 border-orange-500 bg-orange-500/20 cursor-move hover:bg-orange-500/30 transition-all shadow-md"
                    style={{
                      left: cropArea.x,
                      top: cropArea.y,
                      width: cropArea.width,
                      height: cropArea.height
                    }}
                    onMouseDown={handleCropMouseDown}
                  >
                    <div className="absolute inset-0 border-2 border-white dark:border-gray-800 border-dashed"></div>
                    <div className="absolute top-1 sm:top-2 left-1 sm:left-2 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md shadow-sm">
                      <Move className="w-3 h-3 inline mr-1" />
                      <span className="hidden sm:inline">Recorte</span>
                    </div>
                  </div>
                )}

                {/* Overlay fuera del área de crop */}
                {imageLoaded && (
                  <>
                    {/* Top */}
                    <div
                      className="absolute top-0 left-0 w-full bg-black/30"
                      style={{ height: cropArea.y }}
                    />
                    {/* Bottom */}
                    <div
                      className="absolute left-0 w-full bg-black/30"
                      style={{
                        top: cropArea.y + cropArea.height,
                        height: 400 - cropArea.y - cropArea.height
                      }}
                    />
                    {/* Left */}
                    <div
                      className="absolute left-0 bg-black/30"
                      style={{
                        top: cropArea.y,
                        width: cropArea.x,
                        height: cropArea.height
                      }}
                    />
                    {/* Right */}
                    <div
                      className="absolute bg-black/30"
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
            </div>

            {/* Controles */}
            <div className="w-full lg:w-80 space-y-3 sm:space-y-4">
              {/* Tamaño del crop */}
              <div className="space-y-2 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="hidden sm:inline">Tamaño del recorte</span>
                  <span className="sm:hidden">Tamaño</span>
                </Label>
                <Slider
                  value={[cropArea.width]}
                  onValueChange={handleCropSizeChange}
                  min={50}
                  max={300}
                  step={10}
                  className="w-full [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600"
                />
                <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium">
                  {Math.round(cropArea.width)} x {Math.round(cropArea.height)}px
                </div>
              </div>

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
                    onClick={() => handleZoom(-0.1)}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <Slider
                    value={[scale]}
                    onValueChange={(value) => setScale(value[0])}
                    min={0.1}
                    max={3}
                    step={0.1}
                    className="flex-1 [&_[role=slider]]:bg-orange-600 [&_[role=slider]]:border-orange-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleZoom(0.1)}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium">
                  {Math.round(scale * 100)}%
                </div>
              </div>

              {/* Rotación */}
              <div className="space-y-2 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <RotateCw className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  Rotación
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRotate(-90)}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                    size="sm"
                    onClick={() => handleRotate(90)}
                    className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <RotateCw className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 font-medium">
                  {rotation}°
                </div>
              </div>

              {/* Posición de la imagen */}
              <div className="space-y-2 bg-orange-50 dark:bg-orange-900/20 p-3 sm:p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Move className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  <span className="hidden sm:inline">Posición de la imagen</span>
                  <span className="sm:hidden">Posición</span>
                </Label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImagePosition({ x: 0, y: 0 })}
                    className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50"
                  >
                    Centrar Imagen
                  </Button>
                  <div className="text-xs text-orange-800 dark:text-orange-300 bg-white dark:bg-gray-900 p-2 rounded-md border border-orange-200 dark:border-orange-800">
                    💡 <span className="hidden sm:inline"><strong>Tip:</strong> Arrastra la imagen para posicionarla. Arrastra el área naranja para mover el recorte.</span>
                    <span className="sm:hidden"><strong>Tip:</strong> Arrastra elementos</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                    X: {Math.round(imagePosition.x)}px, Y: {Math.round(imagePosition.y)}px
                  </div>
                </div>
              </div>

              {/* Presets de aspect ratio */}
              <div className="space-y-2 bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Formato</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={aspectRatio === 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setCropArea(prev => ({ ...prev, height: prev.width }))
                    }}
                    className={aspectRatio === 1 ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}
                  >
                    <Square className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    1:1
                  </Button>
                  <Button
                    variant={aspectRatio === 2 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setCropArea(prev => ({ ...prev, height: prev.width / 2 }))
                    }}
                    className={aspectRatio === 2 ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}
                  >
                    <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    2:1
                  </Button>
                  <Button
                    variant={aspectRatio === 16/9 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setCropArea(prev => ({ ...prev, height: prev.width * 9/16 }))
                    }}
                    className={aspectRatio === 16/9 ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-sm" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}
                  >
                    <Maximize2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    16:9
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Vista previa final */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
              <Circle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="hidden sm:inline">Vista previa final</span>
              <span className="sm:hidden">Preview</span>
            </Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-gray-50 dark:bg-gray-800 p-3 sm:p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-inner">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-cover"
                  style={{ display: 'none' }}
                />
                {imageLoaded && (() => {
                  const cropAspectRatio = cropArea.width / cropArea.height
                  let finalWidth = maxWidth
                  let finalHeight = maxHeight
                  if (cropAspectRatio > (maxWidth / maxHeight)) {
                    finalWidth = maxWidth
                    finalHeight = Math.round(maxWidth / cropAspectRatio)
                  } else {
                    finalHeight = maxHeight
                    finalWidth = Math.round(maxHeight * cropAspectRatio)
                  }
                  return (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-900 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {finalWidth}x{finalHeight}
                    </div>
                  )
                })()}
              </div>
              <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                {(() => {
                  const cropAspectRatio = cropArea.width / cropArea.height
                  let finalWidth = maxWidth
                  let finalHeight = maxHeight
                  if (cropAspectRatio > (maxWidth / maxHeight)) {
                    finalWidth = maxWidth
                    finalHeight = Math.round(maxWidth / cropAspectRatio)
                  } else {
                    finalHeight = maxHeight
                    finalWidth = Math.round(maxHeight * cropAspectRatio)
                  }
                  return (
                    <>
                      <p className="font-medium">Tamaño final: <span className="text-orange-600 dark:text-orange-400">{finalWidth} x {finalHeight}px</span></p>
                      <p className="text-gray-600 dark:text-gray-400 hidden sm:block">Formato: {imageFile.type}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">Máximo: {maxWidth}x{maxHeight}px</p>
                    </>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={!imageLoaded}
              className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Check className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Aplicar Recorte</span>
              <span className="sm:hidden">Aplicar</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}