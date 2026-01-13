import { useState, useEffect } from "react";

/**
 * Custom hook para determinar si una cita ya ha comenzado
 *
 * @param appointmentDate - Fecha de la cita (formato: YYYY-MM-DD)
 * @param startTime - Hora de inicio (formato: HH:MM:SS o HH:MM)
 * @returns {boolean} true si la cita ya comenzó, false si aún no
 *
 * @example
 * const canTakeAction = useAppointmentStarted('2026-01-12', '15:00:00')
 *
 * <Button disabled={!canTakeAction}>
 *   Finalizar
 * </Button>
 */
export function useAppointmentStarted(
  appointmentDate: string,
  startTime: string
): boolean {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const checkIfStarted = () => {
      const now = new Date();

      // Crear fecha/hora de inicio de la cita
      // Formato esperado: appointmentDate = "2026-01-12", startTime = "15:00:00"
      const appointmentDateTime = new Date(
        `${appointmentDate}T${startTime.substring(0, 5)}`
      );

      // La cita ha comenzado si la hora actual >= hora de inicio
      setHasStarted(now >= appointmentDateTime);
    };

    // Verificar inmediatamente
    checkIfStarted();

    // Actualizar cada minuto para mantener sincronizado
    const interval = setInterval(checkIfStarted, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [appointmentDate, startTime]);

  return hasStarted;
}
