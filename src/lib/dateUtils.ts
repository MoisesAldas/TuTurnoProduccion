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
    return dateString;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  // Usar hora del mediodía (12:00) para evitar problemas de zona horaria
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Formatea una Date a string YYYY-MM-DD sin conversión de zona horaria
 * @param date - Date object
 * @returns Fecha en formato YYYY-MM-DD
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Convierte Date a string YYYY-MM-DD sin problemas de zona horaria
 * Alternativa a .toISOString().split('T')[0] que causa problemas
 * @param date - Date object
 * @returns Fecha en formato YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  return formatDateString(date);
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
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
): string {
  const date = parseDateString(dateString);
  const formatted = date.toLocaleDateString("es-ES", options);
  // Capitalizar primera letra
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Translates English month abbreviations/names to Spanish
 * Useful for translating date labels from SQL functions that return English dates
 * @param dateLabel - Date label in English format (e.g., "05 Jan", "Jan 2025", "January 2025")
 * @returns Translated date label in Spanish
 */
export function translateDateLabel(dateLabel: string): string {
  if (!dateLabel || dateLabel === "N/A") return dateLabel;

  const monthTranslations: Record<string, string> = {
    // Abbreviated months
    Jan: "Ene",
    Feb: "Feb",
    Mar: "Mar",
    Apr: "Abr",
    May: "May",
    Jun: "Jun",
    Jul: "Jul",
    Aug: "Ago",
    Sep: "Sep",
    Oct: "Oct",
    Nov: "Nov",
    Dec: "Dic",
    // Full month names
    January: "Enero",
    February: "Febrero",
    March: "Marzo",
    April: "Abril",
    June: "Junio",
    July: "Julio",
    August: "Agosto",
    September: "Septiembre",
    October: "Octubre",
    November: "Noviembre",
    December: "Diciembre",
  };

  let translatedLabel = dateLabel;

  // Replace each English month with its Spanish equivalent
  Object.entries(monthTranslations).forEach(([english, spanish]) => {
    const regex = new RegExp(`\\b${english}\\b`, "g");
    translatedLabel = translatedLabel.replace(regex, spanish);
  });

  return translatedLabel;
}
