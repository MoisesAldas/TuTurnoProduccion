import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { validateAppointmentToken } from "@/lib/tokenUtils";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, token } = await request.json();
    const appointmentId = params.id;

    // Validar parámetros
    if (!action || !token) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    if (!["accept", "cancel", "reschedule"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    // Validar token
    if (!validateAppointmentToken(appointmentId, token)) {
      return NextResponse.json(
        { error: "Token inválido o expirado" },
        { status: 403 }
      );
    }

    // Service Role Client para bypassear RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Obtener cita con detalles
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(
        `
        *,
        business:businesses(id, name, owner_id),
        users(email, first_name, last_name)
      `
      )
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error("Error fetching appointment:", appointmentError);
      return NextResponse.json(
        { error: "Cita no encontrada" },
        { status: 404 }
      );
    }

    // Validar que la cita esté en estado pending
    if (appointment.status !== "pending") {
      return NextResponse.json(
        {
          error: "Esta cita ya no está pendiente de confirmación",
          currentStatus: appointment.status,
        },
        { status: 400 }
      );
    }

    // Procesar acción
    if (action === "accept") {
      // Cambiar estado a confirmed
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointmentId);

      if (updateError) {
        console.error("Error updating appointment:", updateError);
        throw updateError;
      }

      // TODO: Enviar email al negocio notificando que el cliente aceptó
      console.log(
        "✅ Cliente aceptó los cambios - appointmentId:",
        appointmentId
      );

      return NextResponse.json({
        success: true,
        message: "Cita confirmada exitosamente",
        redirectUrl: "/dashboard/client/appointments",
      });
    }

    if (action === "cancel") {
      // Cambiar estado a cancelled
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (updateError) {
        console.error("Error cancelling appointment:", updateError);
        throw updateError;
      }

      // Enviar email de cancelación al negocio
      try {
        await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/send-cancellation-notification`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appointmentId,
              cancellationReason: "El cliente rechazó los cambios propuestos",
            }),
          }
        );
      } catch (emailError) {
        console.warn("⚠️ Failed to send cancellation email:", emailError);
      }

      console.log("❌ Cliente canceló la cita - appointmentId:", appointmentId);

      return NextResponse.json({
        success: true,
        message: "Cita cancelada exitosamente",
        redirectUrl: "/dashboard/client/appointments",
      });
    }

    if (action === "reschedule") {
      // Redirigir a la página de modificación de cita
      return NextResponse.json({
        success: true,
        message: "Redirigiendo a reprogramación",
        redirectUrl: `/dashboard/client/appointments/${appointmentId}`,
      });
    }

    return NextResponse.json(
      { error: "Acción no implementada" },
      { status: 400 }
    );
  } catch (error) {
    console.error("💥 Error in appointment respond:", error);
    return NextResponse.json(
      {
        error: "Error al procesar la respuesta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
