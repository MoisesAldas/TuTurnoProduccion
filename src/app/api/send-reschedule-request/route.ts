import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { generateAppointmentToken } from "@/lib/tokenUtils";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, closedDate } = await request.json();

    if (!appointmentId || !closedDate) {
      return NextResponse.json(
        { error: "appointmentId and closedDate are required" },
        { status: 400 }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch appointment details
    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        users(email, first_name, last_name),
        business:businesses(name, address),
        appointment_services(service:services(name), price)
      `
      )
      .eq("id", appointmentId)
      .single();

    if (error || !appointment) {
      console.error("Error fetching appointment:", error);
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    // Generate security token
    const token = generateAppointmentToken(appointmentId);

    // Format dates
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr + "T00:00:00");
      return date.toLocaleDateString("es-EC", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    // Prepare email data
    const emailData = {
      to: appointment.users.email,
      userName: `${appointment.users.first_name} ${appointment.users.last_name}`,
      appointmentId,
      token,
      data: {
        businessName: appointment.business.name,
        closedDate: formatDate(closedDate),
        originalDate: formatDate(appointment.appointment_date),
        originalTime: appointment.start_time.substring(0, 5),
        serviceName: appointment.appointment_services[0].service.name,
        servicePrice: appointment.appointment_services[0].price,
      },
    };

    // Send email via Edge Function
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-reschedule-required-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(emailData),
      }
    );

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Error sending email:", errorText);
      throw new Error("Failed to send email");
    }

    const emailResult = await emailResponse.json();
    console.log("✅ Reschedule request email sent:", emailResult);

    return NextResponse.json({
      success: true,
      message: "Reschedule request email sent successfully",
    });
  } catch (error) {
    console.error("Error in send-reschedule-request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
