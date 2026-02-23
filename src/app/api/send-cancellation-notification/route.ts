import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Interfaces
interface Business {
  name: string;
  address: string;
  owner_id: string;
}

interface Employee {
  first_name: string;
  last_name: string;
  position: string;
}

interface Client {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Service {
  name: string;
  duration_minutes: number;
}

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, cancellationReason } = await request.json();

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId es requerido" },
        { status: 400 },
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
      },
    );

    // Obtener datos de la cita
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        start_time,
        end_time,
        total_price,
        client_id,
        business_client_id,
        businesses (
          name,
          address,
          owner_id
        ),
        employees (
          first_name,
          last_name,
          position
        ),
        users!appointments_client_id_fkey (
          email,
          first_name,
          last_name,
          phone
        ),
        business_clients (
          email,
          first_name,
          last_name,
          phone
        )
      `,
      )
      .eq("id", appointmentId)
      .single();

    if (appointmentError || !appointment) {
      console.error("Error fetching appointment:", appointmentError);
      return NextResponse.json(
        { error: "Cita no encontrada" },
        { status: 404 },
      );
    }

    // Resolver cliente: prioridad users (registered) → business_clients
    // Cast a any para evitar errores de TS con la estructura de joins (a veces arrays)
    const authUser = Array.isArray(appointment.users)
      ? (appointment.users[0] as Client | null)
      : (appointment.users as any as Client | null);

    const businessClient = Array.isArray(appointment.business_clients)
      ? (appointment.business_clients[0] as Client | null)
      : (appointment.business_clients as any as Client | null);

    const client: Client | null = authUser?.email
      ? authUser
      : businessClient?.email
        ? businessClient
        : null;

    // Validar que el cliente tenga email (registered o business_client)
    // walk_in appointments tienen ambos como NULL o sin email registrado
    if (!client?.email) {
      console.log(
        "⚠️ Walk-in client or client without email detected, skipping email notification",
      );
      return NextResponse.json(
        {
          success: true,
          message: "Walk-in client (no email), no email sent",
        },
        { status: 200 },
      );
    }

    // Obtener servicios de la cita
    const { data: appointmentServices, error: servicesError } = await supabase
      .from("appointment_services")
      .select(
        `
        service_id,
        price,
        services (
          name,
          duration_minutes
        )
      `,
      )
      .eq("appointment_id", appointmentId);

    if (
      servicesError ||
      !appointmentServices ||
      appointmentServices.length === 0
    ) {
      console.error("Error fetching appointment services:", servicesError);
      return NextResponse.json(
        { error: "Servicios no encontrados" },
        { status: 404 },
      );
    }

    // Convertir arrays a objetos individuales
    const business = Array.isArray(appointment.businesses)
      ? (appointment.businesses[0] as Business)
      : (appointment.businesses as Business);

    const employee = Array.isArray(appointment.employees)
      ? (appointment.employees[0] as Employee)
      : (appointment.employees as Employee);

    // Procesar TODOS los servicios
    const services = appointmentServices.map((as) => {
      const service = Array.isArray(as.services)
        ? (as.services[0] as Service)
        : (as.services as Service);

      return {
        name: service.name,
        price: as.price,
        duration: service.duration_minutes,
      };
    });

    // Calcular totales
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

    // Verificar datos necesarios
    if (
      !business?.name ||
      services.length === 0 ||
      !employee?.first_name ||
      !client?.email
    ) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 404 });
    }

    // Formatear fecha en español
    const appointmentDate = new Date(
      appointment.appointment_date + "T00:00:00",
    );
    const formattedDate = appointmentDate.toLocaleDateString("es-EC", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const capitalizedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    // Preparar datos para el email
    const emailData = {
      to: client.email,
      userName: `${client.first_name} ${client.last_name}`,
      data: {
        businessName: business.name,
        businessAddress: business.address || "",
        services: services, // Array de servicios
        totalPrice: totalPrice,
        totalDuration: totalDuration,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        employeePosition: employee.position || "",
        appointmentDate: capitalizedDate,
        appointmentTime: appointment.start_time.substring(0, 5),
        appointmentEndTime: appointment.end_time.substring(0, 5),
        cancellationReason: cancellationReason || "",
      },
    };

    console.log("📧 Sending cancellation email to CLIENT:", client.email);

    // EMAIL 1: Enviar email al CLIENTE
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-cancellation-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(emailData),
      },
    );

    let clientEmailSuccess = false;
    if (emailResponse.ok) {
      const result = await emailResponse.json();
      console.log("✅ Client cancellation email sent successfully:", result);
      clientEmailSuccess = true;
    } else {
      const errorText = await emailResponse.text();
      console.error("⚠️ Failed to send client email:", errorText);
    }

    // EMAIL 2: Enviar notificación al NEGOCIO
    let businessEmailSuccess = false;

    // Obtener datos del dueño del negocio
    console.log("🔍 Fetching business owner with owner_id:", business.owner_id);
    const { data: businessOwner, error: ownerError } = await supabase
      .from("users")
      .select("email, first_name, last_name")
      .eq("id", business.owner_id)
      .single();

    if (ownerError) {
      console.error("⚠️ Error fetching business owner:", ownerError);
    }

    if (businessOwner) {
      console.log(
        "📧 Sending cancellation notification to BUSINESS:",
        businessOwner.email,
      );

      const businessEmailData = {
        to: businessOwner.email,
        userName: `${businessOwner.first_name} ${businessOwner.last_name}`,
        data: {
          ...emailData.data,
          clientName: `${client.first_name} ${client.last_name}`,
          clientEmail: client.email,
          clientPhone: client.phone || "",
        },
      };

      const businessEmailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-cancellation-business-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify(businessEmailData),
        },
      );

      if (businessEmailResponse.ok) {
        const businessResult = await businessEmailResponse.json();
        console.log(
          "✅ Business notification email sent successfully:",
          businessResult,
        );
        businessEmailSuccess = true;
      } else {
        const errorText = await businessEmailResponse.text();
        console.error("⚠️ Failed to send business email:", errorText);
      }
    } else {
      console.warn(
        "⚠️ Business owner not found, skipping business notification email",
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Notificaciones enviadas",
        details: {
          clientEmail: clientEmailSuccess ? "sent" : "failed",
          businessEmail: businessEmailSuccess ? "sent" : "failed",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("💥 Error in send-cancellation-notification:", error);
    return NextResponse.json(
      {
        error: "Error al enviar la notificación",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
