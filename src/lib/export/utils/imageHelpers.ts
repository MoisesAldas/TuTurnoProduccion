/**
 * Image Helpers - Utilities for handling images in exports
 * Descarga y convierte imágenes para uso en Excel y PDF
 */

/**
 * Descarga una imagen desde URL y la convierte a Base64
 * @param url - URL de la imagen
 * @returns Base64 string de la imagen
 */
export async function fetchImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'no-cache',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const blob = await response.blob()
    return await blobToBase64(blob)
  } catch (error) {
    console.error('Error fetching image:', error)
    throw error
  }
}

/**
 * Convierte un Blob a Base64
 * @param blob - Blob de la imagen
 * @returns Promise con el string Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remover el prefijo data:image/...;base64,
        const base64 = reader.result.split(',')[1]
        resolve(base64)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Determina la extensión de la imagen desde la URL
 * @param url - URL de la imagen
 * @returns Extensión (png, jpg, jpeg, etc.)
 */
export function getImageExtension(url: string): 'png' | 'jpeg' | 'gif' {
  const urlLower = url.toLowerCase()

  if (urlLower.includes('.png')) return 'png'
  if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'jpeg'
  if (urlLower.includes('.gif')) return 'gif'

  // Default to png if unable to determine
  return 'png'
}

/**
 * Crea un placeholder de logo cuando no hay imagen
 * @param businessName - Nombre del negocio
 * @returns Canvas como base64
 */
export async function createLogoPlaceholder(businessName: string): Promise<string> {
  // Crear canvas temporal
  const canvas = document.createElement('canvas')
  canvas.width = 100
  canvas.height = 100
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Fondo naranja TuTurno
  ctx.fillStyle = '#ea580c'
  ctx.fillRect(0, 0, 100, 100)

  // Texto: Iniciales del negocio
  const initials = businessName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 40px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, 50, 50)

  // Convertir a base64
  const base64 = canvas.toDataURL('image/png').split(',')[1]
  return base64
}
