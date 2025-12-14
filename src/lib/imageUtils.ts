// Utilidades para manejo y compresión de imágenes

export interface ImageCompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 a 1.0
  maxSizeKB?: number
}

export const DEFAULT_COMPRESSION_OPTIONS: ImageCompressionOptions = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 0.8,
  maxSizeKB: 500 // 500KB máximo
}

/**
 * Comprime una imagen automáticamente
 */
export const compressImage = (
  file: File,
  options: ImageCompressionOptions = DEFAULT_COMPRESSION_OPTIONS
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      // Calcular nuevas dimensiones manteniendo proporción
      const { width: newWidth, height: newHeight } = calculateNewDimensions(
        img.width,
        img.height,
        options.maxWidth || DEFAULT_COMPRESSION_OPTIONS.maxWidth!,
        options.maxHeight || DEFAULT_COMPRESSION_OPTIONS.maxHeight!
      )

      // Configurar canvas
      canvas.width = newWidth
      canvas.height = newHeight

      if (!ctx) {
        reject(new Error('No se pudo obtener contexto del canvas'))
        return
      }

      // Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // Convertir a blob con compresión
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir imagen'))
            return
          }

          // Verificar tamaño final
          const sizeKB = blob.size / 1024
          const maxSizeKB = options.maxSizeKB || DEFAULT_COMPRESSION_OPTIONS.maxSizeKB!

          if (sizeKB > maxSizeKB && (options.quality || 0.8) > 0.1) {
            // Si aún es muy grande, reducir más la calidad
            const newOptions = {
              ...options,
              quality: Math.max(0.1, (options.quality || 0.8) - 0.1)
            }
            compressImage(file, newOptions).then(resolve).catch(reject)
            return
          }

          // Crear nuevo archivo comprimido
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          })

          resolve(compressedFile)
        },
        file.type,
        options.quality || DEFAULT_COMPRESSION_OPTIONS.quality
      )
    }

    img.onerror = () => reject(new Error('Error al cargar imagen'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Calcula nuevas dimensiones manteniendo proporción
 */
export const calculateNewDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
) => {
  let { width, height } = { width: originalWidth, height: originalHeight }

  // Si la imagen es más pequeña que los límites, no cambiar
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height }
  }

  // Calcular proporción
  const aspectRatio = width / height

  if (width > height) {
    // Imagen horizontal
    width = maxWidth
    height = width / aspectRatio

    if (height > maxHeight) {
      height = maxHeight
      width = height * aspectRatio
    }
  } else {
    // Imagen vertical
    height = maxHeight
    width = height * aspectRatio

    if (width > maxWidth) {
      width = maxWidth
      height = width / aspectRatio
    }
  }

  return {
    width: Math.round(width),
    height: Math.round(height)
  }
}

/**
 * Valida tipo y tamaño de archivo
 */
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  // Validar tipo
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: 'Por favor selecciona un archivo de imagen válido' }
  }

  // Validar tamaño (10MB máximo para imagen original)
  const maxSizeMB = 10
  const fileSizeMB = file.size / (1024 * 1024)

  if (fileSizeMB > maxSizeMB) {
    return { isValid: false, error: `La imagen es muy grande. Máximo ${maxSizeMB}MB` }
  }

  return { isValid: true }
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Comprime una imagen de comprobante de pago
 * Optimizado para legibilidad de números y datos bancarios
 */
export const compressReceiptImage = async (file: File): Promise<File> => {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.90,
    maxSizeKB: 500
  })
}