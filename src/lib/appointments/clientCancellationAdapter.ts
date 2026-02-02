import { cancelAppointmentAsClient } from "@/lib/appointments/cancellation";
import { createClient } from "@/lib/supabaseClient";

/**
 * Adaptador para cancelación de citas desde el dashboard del cliente
 * Maneja la lógica completa: cancelación + notificaciones + actualización UI
 */
export async function handleClientCancellation(params: {
  appointmentId: string;
  clientId: string;
  cancelReason?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const { appointmentId, clientId, cancelReason, onSuccess, onError } = params;

  try {
    // 1. Cancelar la cita con tracking de quién canceló
    const { error: cancelError } = await cancelAppointmentAsClient(
      appointmentId,
      clientId,
      cancelReason,
    );

    if (cancelError) {
      throw new Error(cancelError.message);
    }

    // 2. Enviar notificaciones (cliente + negocio)
    try {
      await fetch("/api/send-cancellation-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          cancellationReason: cancelReason,
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
    console.error("Error in handleClientCancellation:", error);
    if (onError) {
      onError(error as Error);
    }
    return { success: false, error };
  }
}

/**
 * Verifica si una cita puede ser cancelada por el cliente
 */
export async function canClientCancelAppointment(
  appointmentId: string,
): Promise<{
  canCancel: boolean;
  reason?: string;
}> {
  try {
    const supabase = createClient();

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(
        "appointment_date, start_time, status, business_id, businesses(cancellation_policy_hours, allow_client_cancellation)",
      )
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      return { canCancel: false, reason: "Cita no encontrada" };
    }

    // Verificar si el negocio permite cancelaciones
    const business = appointment.businesses as any;
    if (!business?.allow_client_cancellation) {
      return {
        canCancel: false,
        reason: "El negocio no permite cancelaciones",
      };
    }

    // Verificar si la cita ya está cancelada
    if (appointment.status === "cancelled") {
      return { canCancel: false, reason: "La cita ya está cancelada" };
    }

    // Verificar política de horas de anticipación
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.start_time}`,
    );
    const now = new Date();
    const hoursUntilAppointment =
      (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const requiredHours = business?.cancellation_policy_hours || 24;
    if (hoursUntilAppointment < requiredHours) {
      return {
        canCancel: false,
        reason: `Debes cancelar con al menos ${requiredHours} horas de anticipación`,
      };
    }

    return { canCancel: true };
  } catch (error) {
    console.error("Error checking if can cancel:", error);
    return { canCancel: false, reason: "Error al verificar permisos" };
  }
}
