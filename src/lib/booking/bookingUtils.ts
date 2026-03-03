import { Service, Employee } from "@/types/database";

/**
 * Formats a price into US dollars (Ecuador currency format).
 */
export const formatPrice = (price: number) => {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

/**
 * Formats a duration in minutes into a human-readable string (e.g., "1h 30min" or "45 min").
 */
export const formatDuration = (minutes: number) => {
  if (!minutes || isNaN(minutes) || minutes <= 0) {
    return "Duración no especificada";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`;
  }
};

/**
 * Formats a date for display in Spanish (e.g., "lunes, 1 de marzo de 2026").
 */
export const formatDate = (date: Date) => {
  return date.toLocaleDateString("es-EC", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Formats a date for database queries (YYYY-MM-DD).
 */
export const formatDateForDB = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Calculates the total duration of an appointment.
 * Mixed Model: Professionals start simultaneously if they are different.
 * Services for the same professional are sequential.
 * Total duration is the MAX of (sum of durations per specific professional).
 */
export const calculateTotalDuration = (
  selectedServices: { duration_minutes: number; id: string }[],
  serviceEmployeeAssignments: Record<string, { id: string } | null> = {},
) => {
  if (selectedServices.length === 0) return 0;

  // If no assignments yet, assume sequential as a safe fallback for the UI
  if (Object.keys(serviceEmployeeAssignments).length === 0) {
    return selectedServices.reduce(
      (sum, service) => sum + service.duration_minutes,
      0,
    );
  }

  const employeeDurations: Record<string, number> = {};

  selectedServices.forEach((service) => {
    const employee = serviceEmployeeAssignments[service.id];
    if (employee) {
      employeeDurations[employee.id] =
        (employeeDurations[employee.id] || 0) + service.duration_minutes;
    }
  });

  const durations = Object.values(employeeDurations);
  return durations.length > 0 ? Math.max(...durations) : 0;
};

/**
 * Gets the sequence of services as (employeeId, duration) pairs.
 * This MUST preserve the order of selectedServices for sequential logic.
 */
export const getSequentialServiceData = (
  selectedServices: { duration_minutes: number; id: string }[],
  serviceEmployeeAssignments: Record<string, { id: string } | null>,
) => {
  const ids: string[] = [];
  const durations: number[] = [];

  selectedServices.forEach((service) => {
    const employee = serviceEmployeeAssignments[service.id];
    if (employee) {
      ids.push(employee.id);
      durations.push(service.duration_minutes);
    }
  });

  return { ids, durations };
};

/**
 * Adaptive font size helper based on text length.
 */
export const getAdaptiveFontSize = (
  text: string,
  type: "title" | "small" = "title",
) => {
  const len = text.length;
  if (type === "title") {
    if (len > 30) return "text-xl sm:text-2xl lg:text-3xl";
    if (len > 20) return "text-2xl sm:text-3xl lg:text-4xl";
    return "text-2xl sm:text-3xl lg:text-4xl";
  }
  if (len > 50) return "text-[10px] sm:text-xs";
  if (len > 30) return "text-xs sm:text-sm";
  return "text-sm";
};
