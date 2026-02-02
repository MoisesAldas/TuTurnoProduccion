import { cancelAppointmentAsBusiness } from "@/lib/appointments/cancellation";
import { createClient } from "@/lib/supabaseClient";

/**
 * Adaptador para cancelación de citas desde el dashboard del negocio
 * Maneja la lógica completa: cancelación + notificaciones + actualización UI
 */
export async function handleBusinessCancellation(params: {
  appointmentId: string;
  businessOwnerId: string;
  cancelReason?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { appointmentId, businessOwnerId, cancelReason, onSuccess, onError } =
    params;

  try {
    // 1. Cancelar la cita con tracking de quién canceló (negocio)
    const { error: cancelError } = await cancelAppointmentAsBusiness(
      appointmentId,
      businessOwnerId,
      cancelReason,
    );

    if (cancelError) {
      throw new Error(cancelError.message);
    }

    // 2. Enviar notificaciones al cliente
    try {
      await fetch("/api/send-cancellation-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          cancellationReason: cancelReason,
          cancelledByBusiness: true, // Flag para indicar que fue el negocio
        }),
      });
    } catch (emailError) {
      console.error("Error sending cancellation emails:", emailError);
      // No bloqueamos la operación si el email falla
    }

    // 3. Callback de éxito
    if (onSuccess) {
      onSuccess();
    }

    return { success: true };
  } catch (error) {
    console.error("Error in handleBusinessCancellation:", error);
    if (onError) {
      onError(error as Error);
    }
    return { success: false, error };
  }
}

/**
 * Verifica si una cita puede ser cancelada por el negocio
 */
export async function canBusinessCancelAppointment(
  appointmentId: string,
  businessId: string,
): Promise<{
  canCancel: boolean;
  reason?: string;
}> {
  try {
    const supabase = createClient();

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("status, business_id")
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return { canCancel: false, reason: "Cita no encontrada" };
    }

    // Verificar que la cita pertenece al negocio
    if (appointment.business_id !== businessId) {
      return {
        canCancel: false,
        reason: "Esta cita no pertenece a tu negocio",
      };
    }

    // Verificar si la cita ya está cancelada
    if (appointment.status === "cancelled") {
      return { canCancel: false, reason: "La cita ya está cancelada" };
    }

    // Verificar si la cita ya fue completada
    if (appointment.status === "completed") {
      return {
        canCancel: false,
        reason: "No se puede cancelar una cita completada",
      };
    }

    return { canCancel: true };
  } catch (error) {
    console.error("Error checking if business can cancel:", error);
    return { canCancel: false, reason: "Error al verificar permisos" };
  }
}

/**
 * Obtiene el owner_id de un negocio
 */
export async function getBusinessOwnerId(
  businessId: string,
): Promise<string | null> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", businessId)
      .single();

    if (error || !data) {
      console.error("Error getting business owner:", error);
      return null;
    }

    return data.owner_id;
  } catch (error) {
    console.error("Error in getBusinessOwnerId:", error);
    return null;
  }
}
