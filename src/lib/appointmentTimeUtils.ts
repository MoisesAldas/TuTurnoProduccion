/**
 * Utilidades para manejo de fechas y horas de citas
 */

/**
 * Verifica si una cita ya ha comenzado
 *
 * @param appointmentDate - Fecha de la cita (formato: YYYY-MM-DD)
 * @param startTime - Hora de inicio (formato: HH:MM:SS o HH:MM)
 * @returns {boolean} true si la cita ya comenzó, false si aún no
 *
 * @example
 * const started = hasAppointmentStarted('2026-01-12', '15:00:00')
 */
export function hasAppointmentStarted(
  appointmentDate: string,
  startTime: string
): boolean {
  const now = new Date();

  // Crear fecha/hora de inicio de la cita
  const appointmentDateTime = new Date(
    `${appointmentDate}T${startTime.substring(0, 5)}`
  );

  // La cita ha comenzado si la hora actual >= hora de inicio
  return now >= appointmentDateTime;
}

/**
 * Calcula cuántos minutos faltan para que comience una cita
 *
 * @param appointmentDate - Fecha de la cita (formato: YYYY-MM-DD)
 * @param startTime - Hora de inicio (formato: HH:MM:SS o HH:MM)
 * @returns {number} Minutos restantes (negativo si ya pasó)
 *
 * @example
 * const minutesLeft = getMinutesUntilStart('2026-01-12', '15:00:00')
 * // -30 = comenzó hace 30 minutos
 * // 0 = está comenzando ahora
 * // 30 = comienza en 30 minutos
 */
export function getMinutesUntilStart(
  appointmentDate: string,
  startTime: string
): number {
  const now = new Date();
  const appointmentDateTime = new Date(
    `${appointmentDate}T${startTime.substring(0, 5)}`
  );

  const diffMs = appointmentDateTime.getTime() - now.getTime();
  return Math.floor(diffMs / 60000); // Convertir ms a minutos
}

/**
 * Obtiene un mensaje descriptivo del estado temporal de la cita
 *
 * @param appointmentDate - Fecha de la cita
 * @param startTime - Hora de inicio
 * @returns {string} Mensaje descriptivo
 *
 * @example
 * getAppointmentTimeStatus('2026-01-12', '15:00:00')
 * // "Comienza en 30 minutos"
 * // "Comenzó hace 15 minutos"
 * // "Comienza ahora"
 */
export function getAppointmentTimeStatus(
  appointmentDate: string,
  startTime: string
): string {
  const minutes = getMinutesUntilStart(appointmentDate, startTime);

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    return `Comienza en ${hours} ${hours === 1 ? "hora" : "horas"}`;
  } else if (minutes > 0) {
    return `Comienza en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}`;
  } else if (minutes === 0) {
    return "Comienza ahora";
  } else if (minutes > -60) {
    return `Comenzó hace ${Math.abs(minutes)} ${
      Math.abs(minutes) === 1 ? "minuto" : "minutos"
    }`;
  } else {
    const hours = Math.floor(Math.abs(minutes) / 60);
    return `Comenzó hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  }
}
