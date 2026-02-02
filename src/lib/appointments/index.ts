/**
 * Módulo de Cancelaciones de Citas
 *
 * Este módulo proporciona todas las utilidades necesarias para manejar
 * cancelaciones de citas tanto del lado del cliente como del negocio.
 *
 * Incluye:
 * - Funciones base de cancelación
 * - Adaptadores para cliente y negocio
 * - Hook para verificar estado de bloqueo
 * - Componentes UI reutilizables
 */

// Funciones base
export {
  cancelAppointmentAsClient,
  cancelAppointmentAsBusiness,
} from "./cancellation";

// Adaptadores de cliente
export {
  handleClientCancellation,
  canClientCancelAppointment,
} from "./clientCancellationAdapter";

// Adaptadores de negocio
export {
  handleBusinessCancellation,
  canBusinessCancelAppointment,
  getBusinessOwnerId,
} from "./businessCancellationAdapter";

// Hooks
export {
  useClientBookingStatus,
  checkClientBookingStatus,
} from "@/hooks/useClientBookingStatus";

// Componentes UI
export { CancelAppointmentDialog } from "@/components/CancelAppointmentDialog";
export { BlockedBookingMessage } from "@/components/BlockedBookingMessage";
