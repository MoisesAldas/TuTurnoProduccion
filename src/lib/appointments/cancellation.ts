import { createClient } from "@/lib/supabaseClient";

/**
 * Cancela una cita desde el lado del cliente
 * @param appointmentId - ID de la cita a cancelar
 * @param clientId - ID del cliente que cancela
 * @param reason - Razón opcional de la cancelación
 * @returns Error si hubo algún problema
 */
export async function cancelAppointmentAsClient(
  appointmentId: string,
  clientId: string,
  reason?: string,
) {
  const supabase = createClient();

  console.log("🔵 [cancelAppointmentAsClient] Iniciando cancelación:", {
    appointmentId,
    clientId,
    reason,
    timestamp: new Date().toISOString(),
  });

  const updateData: any = {
    status: "cancelled",
    cancelled_by: clientId,
    cancelled_at: new Date().toISOString(),
  };

  console.log("🔵 [cancelAppointmentAsClient] Datos a actualizar:", updateData);

  // Si hay razón, agregarla a las notas del cliente
  if (reason) {
    // Obtener notas actuales primero
    const { data: appointment } = await supabase
      .from("appointments")
      .select("client_notes")
      .eq("id", appointmentId)
      .single();

    const existingNotes = appointment?.client_notes || "";
    updateData.client_notes = existingNotes
      ? `${existingNotes}\n\nMotivo de cancelación: ${reason}`.trim()
      : `Motivo de cancelación: ${reason}`;
  }

  const { error, data } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", appointmentId)
    .select();

  if (error) {
    console.error("❌ [cancelAppointmentAsClient] Error:", error);
  } else {
    console.log("✅ [cancelAppointmentAsClient] Cancelación exitosa:", data);
  }

  return { error };
}

/**
 * Cancela una cita desde el lado del negocio
 * @param appointmentId - ID de la cita a cancelar
 * @param businessOwnerId - ID del dueño del negocio que cancela
 * @param reason - Razón opcional de la cancelación
 * @returns Error si hubo algún problema
 */
export async function cancelAppointmentAsBusiness(
  appointmentId: string,
  businessOwnerId: string,
  reason?: string,
) {
  const supabase = createClient();

  console.log("🟠 [cancelAppointmentAsBusiness] Iniciando cancelación:", {
    appointmentId,
    businessOwnerId,
    reason,
    timestamp: new Date().toISOString(),
  });

  const updateData: any = {
    status: "cancelled",
    cancelled_by: businessOwnerId,
    cancelled_at: new Date().toISOString(),
  };

  console.log(
    "🟠 [cancelAppointmentAsBusiness] Datos a actualizar:",
    updateData,
  );

  // Si hay razón, agregarla a las notas del negocio
  if (reason) {
    // Obtener notas actuales primero
    const { data: appointment } = await supabase
      .from("appointments")
      .select("notes")
      .eq("id", appointmentId)
      .single();

    const existingNotes = appointment?.notes || "";
    updateData.notes = existingNotes
      ? `${existingNotes}\n\nMotivo de cancelación (negocio): ${reason}`.trim()
      : `Motivo de cancelación (negocio): ${reason}`;
  }

  const { error, data } = await supabase
    .from("appointments")
    .update(updateData)
    .eq("id", appointmentId)
    .select();

  if (error) {
    console.error("❌ [cancelAppointmentAsBusiness] Error:", error);
  } else {
    console.log("✅ [cancelAppointmentAsBusiness] Cancelación exitosa:", data);
  }

  return { error };
}
