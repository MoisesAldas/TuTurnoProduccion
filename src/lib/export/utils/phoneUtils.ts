/**
 * Utilidades para formateo de números de teléfono
 */

/**
 * Normaliza y formatea números de teléfono ecuatorianos para que empiecen con 09.
 * @param phone El número de teléfono a formatear.
 * @returns El número formateado o '-' si es nulo.
 */
export const formatEcuadorianPhone = (phone: string | null): string => {
  if (!phone) return "-";

  // Eliminar espacios, guiones y paréntesis
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Si empieza con +593, remover el prefijo internacional
  if (cleaned.startsWith("+593")) {
    cleaned = cleaned.substring(4);
  }

  // Si empieza con 593, remover el prefijo
  if (cleaned.startsWith("593")) {
    cleaned = cleaned.substring(3);
  }

  // Si ya empieza con 09, retornar tal cual
  if (cleaned.startsWith("09")) {
    return cleaned;
  }

  // Si empieza con 9 (sin el 0), agregar el 0
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return "0" + cleaned;
  }

  // Si tiene 10 dígitos y no empieza con 09, asumir que falta el 0
  if (cleaned.length === 10 && !cleaned.startsWith("0")) {
    return "0" + cleaned;
  }

  // Si tiene 9 dígitos, agregar el 0 al inicio
  if (cleaned.length === 9) {
    return "0" + cleaned;
  }

  // Si no cumple ningún patrón, retornar el número limpio
  return cleaned;
};

/**
 * Convierte un número de teléfono ecuatoriano al formato internacional para WhatsApp
 * @param phone - Número de teléfono (puede ser 0969380735, +593969380735, etc.)
 * @returns Número en formato WhatsApp (593969380735) o null si inválido
 *
 * @example
 * formatPhoneForWhatsApp("0969380735") // "593969380735"
 * formatPhoneForWhatsApp("+593969380735") // "593969380735"
 * formatPhoneForWhatsApp("593969380735") // "593969380735"
 * formatPhoneForWhatsApp("969380735") // "593969380735"
 */
export const formatPhoneForWhatsApp = (phone: string | null): string | null => {
  if (!phone) return null;

  // Limpiar el número (remover espacios, guiones, paréntesis)
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");

  // Si ya tiene +593, remover el +
  if (cleaned.startsWith("+593")) {
    return cleaned.substring(1); // Retorna 593XXXXXXXXX
  }

  // Si ya tiene 593 al inicio
  if (cleaned.startsWith("593")) {
    return cleaned; // Ya está en formato correcto
  }

  // Si empieza con 0 (formato local ecuatoriano: 0969380735)
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return "593" + cleaned.substring(1); // 593969380735
  }

  // Si tiene 9 dígitos y empieza con 9 (falta el 0)
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return "593" + cleaned; // 593969380735
  }

  // Si no coincide con ningún patrón válido
  return null;
};
