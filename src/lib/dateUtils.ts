/**
 * Utilidades para manejo de fechas sin problemas de zona horaria
 *
 * PROBLEMA: new Date('2025-10-11' + 'T00:00:00') puede mostrar el día anterior
 * debido a la zona horaria local.
 *
 * SOLUCIÓN: Usar Date.UTC para trabajar en UTC y evitar conversiones de zona horaria
 */

/**
 * Convierte una fecha string (YYYY-MM-DD) a Date object SIN conversión de zona horaria
 * @param dateString - Fecha en formato YYYY-MM-DD (ej: "2025-10-11") o Date object
 * @returns Date object representando esa fecha a las 12:00 PM hora local
 */
export function parseDateString(dateString: string | Date): Date {
  // If already a Date object, return it
  if (dateString instanceof Date) {
    return dateString
  }

  const [year, month, day] = dateString.split('-').map(Number)
  // Usar hora del mediodía (12:00) para evitar problemas de zona horaria
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Formatea una Date a string YYYY-MM-DD sin conversión de zona horaria
 * @param date - Date object
 * @returns Fecha en formato YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convierte Date a string YYYY-MM-DD sin problemas de zona horaria
 * Alternativa a .toISOString().split('T')[0] que causa problemas
 * @param date - Date object
 * @returns Fecha en formato YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  return formatDateString(date)
}

/**
 * Formatea una fecha para mostrar en español (locale es-ES)
 * @param dateString - Fecha en formato YYYY-MM-DD
 * @param options - Opciones de formato (weekday, year, month, day, etc.)
 * @returns Fecha formateada en español
 */
export function formatSpanishDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }
): string {
  const date = parseDateString(dateString)
  const formatted = date.toLocaleDateString('es-ES', options)
  // Capitalizar primera letra
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
